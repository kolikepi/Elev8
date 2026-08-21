// Sprint 2.2.1 Phase B — shared quotation pricing + decision builder.
//
// This is the SINGLE place that turns the admin pricing-editor payload into an AdminQuotation data object.
// Both the initial quotation editor (/api/admin/quotes/[id]/quotation) and the revision endpoint
// (/api/admin/quotes/[id]/revise) call it, so there is never any parallel pricing logic. It does NOT run
// the tariff/volumetric engine — that stays in /calculate; here we only fold the administrator's final
// commercial inputs into the stored pricing fields and capture the decision/override trail.

import { prisma } from '@/lib/prisma'

export const amount = (value: unknown): number => Math.max(0, Number(value ?? 0) || 0)

export type BuiltQuotation = { data: any; finalPrice: number; subtotal: number; suggested: number | null }

export async function buildQuotationData(body: any, quote: any, actorId?: string | null): Promise<BuiltQuotation> {
  const calcForDecision = await prisma.quoteCalculation.findUnique({ where: { quoteId: quote?.id ?? '' } }).catch(() => null)
  const carrierCost = amount(body?.carrierCost), pickupFee = amount(body?.pickupFee), deliveryFee = amount(body?.deliveryFee), insuranceFee = amount(body?.insuranceFee), dgFee = amount(body?.dgFee), documentationFee = amount(body?.documentationFee), customsFee = amount(body?.customsFee), remoteAreaFee = amount(body?.remoteAreaFee), otherCharges = amount(body?.otherCharges)
  const fuelSurcharge = amount(body?.fuelSurcharge), markupPct = amount(body?.markupPct), vatPct = amount(body?.vatPct), discountPct = amount(body?.discountPct)
  const currency = String(body?.currency ?? 'EUR')
  const base = carrierCost + pickupFee + deliveryFee + insuranceFee + dgFee + documentationFee + customsFee + remoteAreaFee + otherCharges
  const fuelAmount = base * fuelSurcharge / 100
  const beforeMarkup = base + fuelAmount
  const markupAmount = beforeMarkup * markupPct / 100
  const afterMarkup = beforeMarkup + markupAmount
  const discountAmount = afterMarkup * discountPct / 100
  const subtotal = afterMarkup - discountAmount
  const vatAmount = subtotal * vatPct / 100
  const finalPrice = subtotal + vatAmount
  const overrideReason = String(body?.overrideReason ?? '').trim()
  const carrierSelected = String(body?.carrierSelected ?? 'Road Freight')
  const serviceSelected = body?.serviceSelected ? String(body?.serviceSelected) : null
  // Capture the full decision trail: what the customer preferred, what the AI and the system engine
  // recommended, and the administrator's final carrier/service. When the final choice differs from any of
  // those, an override reason is expected (never silently drop the deviation).
  const bd = (calcForDecision?.breakdownJson ?? {}) as any
  const systemRec = bd?.recommendation?.systemRecommendation ?? null
  const aiRecommendation = Array.isArray(quote?.suggestedServices) ? (quote?.suggestedServices as any[]) : []
  const originalCustomerPreference = quote?.customerCarrierPreference ? String(quote?.customerCarrierPreference) : null
  const low = (v: unknown) => String(v ?? '').trim().toLowerCase()
  const finalLabel = low(`${carrierSelected} ${serviceSelected ?? ''}`)
  const matchesPreference = originalCustomerPreference ? finalLabel.includes(low(originalCustomerPreference)) || low(originalCustomerPreference).includes(low(carrierSelected)) : true
  const matchesSystem = systemRec ? (low(carrierSelected).includes(low(systemRec?.carrier)) || low(systemRec?.carrier).includes(low(carrierSelected))) && (!serviceSelected || low(serviceSelected).includes(low(systemRec?.service)) || low(systemRec?.service).includes(low(serviceSelected))) : true
  const matchesAi = aiRecommendation.length ? aiRecommendation.some((a: any) => finalLabel.includes(low(a?.name)) || finalLabel.includes(low(a?.carrier))) : true
  const isOverride = !(matchesPreference && matchesSystem && matchesAi)
  const decisionJson: any = { originalCustomerPreference, originalAiRecommendation: aiRecommendation, originalSystemRecommendation: systemRec, finalCarrier: carrierSelected, finalService: serviceSelected, isOverride, overrideReason: overrideReason || null, decidedBy: actorId ?? null, decidedAt: new Date().toISOString(), transitTime: body?.transitTime ? String(body?.transitTime) : null }
  const data: any = { carrierSelected, serviceSelected, overrideReason: overrideReason || null, decisionJson, decidedBy: actorId ?? null, decidedAt: new Date(), finalTransitTime: body?.transitTime ? String(body?.transitTime) : null, finalTariffVersionId: calcForDecision?.tariffVersionId ?? null, carrierCost, pickupFee, deliveryFee, fuelSurcharge, insuranceFee, dgFee, documentationFee, customsFee, remoteAreaFee, otherCharges, markupPct, markupAmount, discountPct, discountAmount, vatPct, vatAmount, subtotal, finalPrice, currency, notes: String(body?.notes ?? '') }
  const suggested = calcForDecision ? Number(calcForDecision?.suggestedPrice ?? 0) : null
  return { data, finalPrice, subtotal, suggested }
}
