import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit } from '@/lib/admin-api'
import { calcShipment, resolveVolumetricRule, compareServices } from '@/lib/piece-calc'
import { buildRateResult, round2 } from '@/lib/rate-engine'
import { recommendServices } from '@/lib/service-recommendation'

export const dynamic = 'force-dynamic'

const str = (v: unknown): string => (v == null ? '' : String(v))
const pos = (v: unknown): number => { const p = Number(v); return Number.isFinite(p) && p > 0 ? p : 0 }

// POST /api/admin/quotes/[id]/calculate
// Runs the carrier tariff + surcharge engine and persists a SUGGESTED QuoteCalculation. Never auto-sends;
// the administrator still reviews, may override, and must approve before anything reaches the customer.
export async function POST(request: Request, context: { params: { id: string } }) {
  const admin = await guardAdmin()
  if (!admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const id = context?.params?.id ?? ''
    const quote = await prisma.quote.findUnique({ where: { id }, include: { shipmentPieces: { orderBy: { pieceNumber: 'asc' } } } })
    if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    // Read the existing calculation BEFORE we overwrite it so we can show the admin a previous-vs-new
    // comparison after any carrier/service change (never silently discard the prior figures).
    const prevCalc = await prisma.quoteCalculation.findUnique({ where: { quoteId: id } })

    const serviceCategory = str(quote?.serviceCategory) || 'EXPRESS'
    const direction = str(quote?.direction) || 'EXPORT'
    const carrier = str(body?.carrier ?? quote?.carrierName) || ''
    const service = str(body?.service ?? quote?.serviceName) || ''
    const sender = (quote?.senderJson ?? {}) as any
    const receiver = (quote?.receiverJson ?? {}) as any
    const originCountry = str(quote?.originCountry) || str(sender?.country)
    const destCountry = str(quote?.destCountry) || str(receiver?.country)
    const quoteDate = quote?.createdAt ?? new Date()

    // Volumetric divisor from admin rules → chargeable weight from persisted pieces (fallback to header weight).
    const [volRules, restrictions, surcharges, zoneMaps, carrierServices] = await Promise.all([
      prisma.volumetricRule.findMany({ where: { isActive: true } }),
      prisma.serviceRestriction.findMany({ where: { isActive: true } }),
      prisma.surchargeRule.findMany({ where: { isActive: true } }),
      prisma.countryZoneMapping.findMany({ where: { isActive: true } }),
      prisma.carrierService.findMany({ where: { isActive: true } }),
    ])
    // Five-level carrier/service rule resolution. Never invents a divisor: if nothing matches the
    // resolver returns MANUAL_REQUIRED (divisor 0) and the calculation is flagged for manual review.
    const resolution = resolveVolumetricRule(volRules as any, { serviceCategory, carrier, service, originCountry, destCountry, direction, date: quoteDate })
    const divisor = resolution.divisor
    const pieceInputs = (quote?.shipmentPieces ?? []).map((p: any) => ({ packageType: p?.packageType, quantity: p?.quantity, length: p?.length, width: p?.width, height: p?.height, dimensionUnit: p?.dimensionUnit, weight: p?.weight, weightUnit: p?.weightUnit }))
    const { rows: pieceRows, totals } = calcShipment(pieceInputs as any, divisor)
    // Admin-only side-by-side comparison of every eligible configured service (never shown to customers).
    const comparison = compareServices(carrierServices as any, volRules as any, pieceInputs as any, { serviceCategory, originCountry, destCountry, direction, date: quoteDate })
    // Multi-factor service recommendation (never weight-only). Evaluates every configured service against
    // the customer category/preference, lane + zone availability, per-service divisor, restrictions, DG
    // status, remote-area and tariff availability. Suggestion only — the admin keeps the final decision.
    const allActiveVersions = await prisma.tariffVersion.findMany({ where: { status: 'ACTIVE' }, include: { rows: true } })
    const aiRec = Array.isArray(quote?.suggestedServices) ? (quote?.suggestedServices as any[]) : []
    const recommendation = recommendServices({
      serviceCategory, customerCarrierPreference: str(quote?.customerCarrierPreference) || null, aiRecommendation: aiRec,
      direction, originCountry, originCity: str(quote?.originCity), originPostalCode: str(quote?.originPostalCode),
      destCountry, destCity: str(quote?.destCity), destPostalCode: str(quote?.destPostalCode),
      pieces: pieceInputs as any, headerWeightKg: pos(quote?.weightKg), headerPieces: pos(quote?.pieces),
      dangerousGoods: quote?.dangerousGoods === true, unNumber: str(quote?.unNumber) || null, dangerousGoodsClass: str(quote?.dangerousGoodsClass) || null,
      currency: str(quote?.currency) || 'EUR', date: quoteDate,
    }, { carrierServices: carrierServices as any, volumetricRules: volRules as any, restrictions: restrictions as any, zoneMaps: zoneMaps as any, tariffVersions: allActiveVersions as any, surcharges: surcharges as any })
    const perPiece = pieceRows.map((r: any, i: number) => ({ pieceNumber: i + 1, quantity: r?.quantity, lengthCm: r?.lengthCm, widthCm: r?.widthCm, heightCm: r?.heightCm, actualWeight: r?.actualWeight, volumetricWeight: r?.volumetricWeight, chargeableWeight: r?.chargeableWeight, volumeM3: r?.volumeM3 }))
    const headerWeight = pos(quote?.weightKg)
    const chargeableWeight = totals.chargeableWeight > 0 ? totals.chargeableWeight : headerWeight
    const actualWeight = totals.actualWeight > 0 ? totals.actualWeight : headerWeight
    const totalPieces = totals.totalPieces > 0 ? totals.totalPieces : pos(quote?.pieces)
    const palletCount = (quote?.shipmentPieces ?? []).filter((p: any) => str(p?.packageType).toUpperCase() === 'PALLET').reduce((s: number, p: any) => s + (Number(p?.quantity) || 0), 0)

    // Derive carrier zone from country mapping (import zone for inbound, export zone for outbound).
    const dc = destCountry.toUpperCase()
    const zoneRow = (zoneMaps as any[]).find((z) => {
      if (z?.serviceCategory && str(z.serviceCategory) !== serviceCategory) return false
      const names = [z?.countryName, z?.isoAlpha2, z?.isoAlpha3, z?.carrierCountryName].map((x) => str(x).toUpperCase()).filter(Boolean)
      return names.includes(dc)
    })
    const zone = zoneRow ? str(direction === 'IMPORT' ? zoneRow?.importZone : zoneRow?.exportZone) : ''

    // Gather rows from ACTIVE tariff versions matching the category (and carrier when known).
    const versions = await prisma.tariffVersion.findMany({ where: { status: 'ACTIVE', serviceCategory: serviceCategory as any, ...(carrier ? { carrier } : {}) }, include: { rows: true } })
    const rows = versions.flatMap((v: any) => (v?.rows ?? []).map((r: any) => ({ ...r, currency: r?.currency ?? v?.currency })))

    const rate = buildRateResult({ rows, surcharges: surcharges as any, ctx: { direction, zone, originCountry, destCountry, chargeableWeight, totalPieces, palletCount }, carrier, serviceCategory, currency: str(quote?.currency) || 'EUR' })

    // Commercial policy defaults (suggested only — admin can override in the manual panel before approval).
    const markupPct = pos(body?.markupPct) || 15
    const vatPct = body?.vatPct != null ? Number(body?.vatPct) || 0 : 20
    const discountPct = pos(body?.discountPct) || 0
    const carrierCostSubtotal = rate.carrierCostSubtotal
    const markupAmount = round2(carrierCostSubtotal * markupPct / 100)
    const afterMarkup = carrierCostSubtotal + markupAmount
    const discountAmount = round2(afterMarkup * discountPct / 100)
    const subtotal = round2(afterMarkup - discountAmount)
    const vatAmount = round2(subtotal * vatPct / 100)
    const suggestedPrice = rate.status === 'CALCULATED' ? round2(subtotal + vatAmount) : 0

    const versionId = versions.find((v: any) => (v?.rows ?? []).some((r: any) => r?.id === rate.matchedRowId))?.id ?? null
    // If no valid volumetric rule resolved, the whole calculation must go to manual review regardless of
    // the tariff outcome — we never invent a divisor to force a price.
    const finalStatus = resolution.status === 'MANUAL_REQUIRED' ? 'MANUAL_REQUIRED' : rate.status
    const finalManualReason = resolution.status === 'MANUAL_REQUIRED'
      ? (resolution.warnings[0] ?? 'No valid volumetric rule for this carrier/service and lane — manual review required.')
      : rate.manualReason
    // Previous-vs-new comparison: after a carrier/service change the divisor, chargeable weight, carrier
    // cost and suggested price can all move. We surface the delta to the admin and never silently keep the
    // old figures. Populated only when a prior calculation exists and something material changed.
    const prevServiceName = str(prevCalc?.serviceName)
    const prevChargeable = Number(prevCalc?.totalChargeableWeight ?? 0)
    const prevDivisor = Number(prevCalc?.volumetricDivisor ?? 0)
    const prevCarrierCost = Number(prevCalc?.carrierCostSubtotal ?? 0)
    const prevSuggested = Number(prevCalc?.suggestedPrice ?? 0)
    const serviceChanged = prevCalc ? (str(prevCalc?.carrier) !== carrier || prevServiceName !== service) : false
    const recalcComparison = prevCalc ? {
      changed: serviceChanged || prevDivisor !== (divisor || 0) || Math.abs(prevChargeable - chargeableWeight) > 0.001,
      serviceChanged,
      previous: { carrier: str(prevCalc?.carrier) || null, service: prevServiceName || null, divisor: prevDivisor || null, chargeableWeight: prevChargeable, carrierCost: prevCarrierCost, suggestedPrice: prevSuggested, status: str(prevCalc?.status) },
      next: { carrier: carrier || null, service: service || null, divisor: divisor || null, chargeableWeight, carrierCost: rate.carrierCostSubtotal, suggestedPrice: rate.status === 'CALCULATED' ? suggestedPrice : 0, status: finalStatus },
      chargeableWeightDelta: round2(chargeableWeight - prevChargeable),
      carrierCostDelta: round2(rate.carrierCostSubtotal - prevCarrierCost),
      suggestedPriceDelta: round2((rate.status === 'CALCULATED' ? suggestedPrice : 0) - prevSuggested),
    } : null
    const data: any = {
      tariffVersionId: versionId, carrier: carrier || null, serviceName: service || str(quote?.serviceName) || null, direction: direction as any, zone: zone || null,
      totalPieces, totalActualWeight: actualWeight, totalVolumetricWeight: totals.volumetricWeight, totalChargeableWeight: chargeableWeight, totalVolume: totals.volumeM3, volumetricDivisor: divisor || null,
      baseRate: rate.baseRate, additionalKgCharge: rate.additionalKgCharge, minChargeAdjustment: rate.minChargeAdjustment, surchargeTotal: rate.surchargeTotal, carrierCostSubtotal,
      discountAmount, markupAmount, vatAmount, suggestedPrice: finalStatus === 'CALCULATED' ? suggestedPrice : 0, currency: rate.currency, status: finalStatus, manualReason: finalManualReason,
      breakdownJson: {
        markupPct, discountPct, vatPct, subtotal, matchedRowId: rate.matchedRowId, divisor, chargeableWeight, actualWeight, volumetricWeight: totals.volumetricWeight,
        // Sprint 2.2 Phase B — volumetric rule transparency (admin-only fields).
        volumetric: {
          carrier: carrier || null, service: service || null, ruleUsed: resolution.ruleName, ruleId: resolution.ruleId,
          priorityLevel: resolution.priorityLevel, priorityLabel: resolution.priorityLabel, formula: resolution.formula,
          fallbackUsed: resolution.fallbackUsed, conflict: resolution.conflict, conflictingRules: resolution.conflictingRules,
          status: resolution.status, warnings: resolution.warnings,
        },
        perPiece,
        comparison,
        // Sprint 2.2 Phase C — multi-factor recommendation + previous-vs-new recalculation comparison.
        recommendation,
        recalcComparison,
      },
    }
    const calc = await prisma.quoteCalculation.upsert({ where: { quoteId: id }, update: data, create: { quoteId: id, ...data } })
    await prisma.quoteCalculationLine.deleteMany({ where: { calculationId: calc.id } })
    if (rate.lines.length) await prisma.quoteCalculationLine.createMany({ data: rate.lines.map((l) => ({ calculationId: calc.id, code: l.code, label: l.label, basis: l.basis ?? null, quantity: l.quantity ?? null, rate: l.rate ?? null, amount: l.amount, taxable: l.taxable, customerVisible: l.customerVisible, sortOrder: l.sortOrder })) })
    // Post-acceptance recompute → the commercial basis changed, so the quotation must be re-approved before booking.
    if (['ACCEPTED', 'BOOKED'].includes(str(quote?.status).toUpperCase())) {
      await prisma.quote.update({ where: { id }, data: { needsReapproval: true } })
      // Preserve the previously approved calculation snapshot in the audit history before it is superseded.
      await audit('Quote', id, 'reapproval-required', admin?.user?.id, { reason: 'recalculated after acceptance', previousCalculation: prevCalc ? { carrier: str(prevCalc?.carrier), service: prevServiceName, divisor: prevDivisor, chargeableWeight: prevChargeable, carrierCost: prevCarrierCost, suggestedPrice: prevSuggested, status: str(prevCalc?.status) } : null, newSuggestedPrice: suggestedPrice, recalcComparison })
    }
    await audit('QuoteCalculation', calc.id, `calculate:${finalStatus}`, admin?.user?.id, { quoteId: id, carrier, service, serviceCategory, zone, chargeableWeight, divisor, ruleUsed: resolution.ruleName, conflict: resolution.conflict, suggestedPrice: data.suggestedPrice })
    const full = await prisma.quoteCalculation.findUnique({ where: { id: calc.id }, include: { lines: { orderBy: { sortOrder: 'asc' } } } })
    return NextResponse.json({ calculation: serializeData(full) })
  } catch (error: unknown) { console.error('Calculate error:', error); return NextResponse.json({ error: 'Unable to calculate suggested rate.' }, { status: 500 }) }
}
