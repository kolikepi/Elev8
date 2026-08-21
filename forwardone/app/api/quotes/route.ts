import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { suggestServices } from '@/lib/service-suggestion'
import { serializeData } from '@/lib/serialize'
import { emailQuoteReceived } from '@/lib/email'
import { calcShipment, validatePieces, resolveDivisor } from '@/lib/piece-calc'
import { customerServiceLabel } from '@/lib/customer-service-label'
import { pickCurrentVersion, sortVersions, customerSafeHistory, customerSafeVersion, buildCustomerOffers } from '@/lib/quotation-versions'

const DIM_UNITS = ['CM', 'IN', 'M']
const WT_UNITS = ['KG', 'LB']

export const dynamic = 'force-dynamic'
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const isAdmin = session?.user?.role === 'ADMINISTRATOR'
    const quotes = await prisma.quote.findMany({ where: { isDraft: false, ...(isAdmin ? {} : { userId: session?.user?.id ?? '' }) }, include: { user: { select: { name: true, email: true, role: true } }, adminQuotations: true, quoteOptions: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] }, shipment: true, files: true, ...(isAdmin ? { shipmentPieces: { orderBy: { pieceNumber: 'asc' as const } }, validationWarnings: true, overrides: { orderBy: { createdAt: 'desc' as const } }, calculation: { include: { lines: { orderBy: { sortOrder: 'asc' as const } } } }, bookingChecklist: true } : {}) }, orderBy: { createdAt: 'desc' } })
    // Resolve each quote's version chain to the customer-facing current head. Admins keep the full chain
    // (real carrier + costs); customers only ever see the brand-free, cost-free current version + history.
    const safeQuotes = (quotes ?? []).map((q: any) => {
      const versions = q?.adminQuotations ?? []
      const current = pickCurrentVersion(versions)
      if (isAdmin) {
        return { ...q, adminQuotation: current, quotationVersions: sortVersions(versions) }
      }
      const safeCurrent = current ? { ...customerSafeVersion(current), carrierSelected: null, serviceSelected: customerServiceLabel(current?.carrierSelected, current?.serviceSelected) } : null
      const currentExtras = (q?.quoteOptions ?? []).filter((o: any) => o?.adminQuotationId === (current?.id ?? null))
      const { adminQuotations, quoteOptions, ...rest } = q
      return {
        ...rest,
        adminQuotation: safeCurrent,
        offers: buildCustomerOffers(current, currentExtras),
        quotationHistory: customerSafeHistory(versions),
        shipment: q?.shipment ? { ...q.shipment, carrier: customerServiceLabel(q?.shipment?.carrier) } : q?.shipment,
      }
    })
    return NextResponse.json({ quotes: serializeData(safeQuotes) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load quotes.' }, { status: 500 }) }
}

function categoryFor(value: string): 'EXPRESS' | 'ROAD_FREIGHT' | 'AIR_FREIGHT' | 'SEA_FREIGHT' {
  return (['EXPRESS','ROAD_FREIGHT','AIR_FREIGHT','SEA_FREIGHT'].includes(value) ? value : 'EXPRESS') as any
}
function serviceTypeFor(category: string): 'EXPRESS_COURIER' | 'ECONOMY_COURIER' | 'ROAD_FREIGHT' {
  if (category === 'ROAD_FREIGHT' || category === 'SEA_FREIGHT') return 'ROAD_FREIGHT'
  return 'EXPRESS_COURIER'
}

// Generate the next quote reference (FWD-YYYY-NNNNN). The persistent counter can fall behind the actual
// references already in the table (seed data, imports, restores), which would produce a duplicate and fail
// the unique constraint. So we first sync the counter forward past the highest existing reference for the
// year, then atomically increment it.
async function nextReference(year: number): Promise<string> {
  const latest = await prisma.quote.findFirst({ where: { reference: { startsWith: `FWD-${year}-` } }, orderBy: { reference: 'desc' }, select: { reference: true } })
  const maxExisting = latest?.reference ? (parseInt(latest.reference.split('-').pop() || '0', 10) || 0) : 0
  const counter = await prisma.referenceCounter.upsert({ where: { year }, update: { value: { increment: 1 } }, create: { year, value: 1 } })
  let value = counter?.value ?? 1
  if (value <= maxExisting) { value = maxExisting + 1; await prisma.referenceCounter.update({ where: { year }, data: { value } }) }
  return `FWD-${year}-${String(value).padStart(5, '0')}`
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const category = categoryFor(String(body?.serviceCategory ?? body?.serviceType ?? 'EXPRESS'))
    // Idempotency guard: a client generates one submissionToken per Review screen. If the same token is
    // replayed (double-click, refresh, network retry, slow response) return the already-created quote
    // instead of creating a duplicate. A partial unique index enforces this at the DB level too.
    const submissionToken = String(body?.submissionToken ?? '')
    if (submissionToken) {
      const existing = await prisma.quote.findFirst({ where: { submissionToken, userId: session?.user?.id ?? '', isDraft: false }, include: { files: true } })
      if (existing) return NextResponse.json({ quote: serializeData(existing), suggestions: [], idempotent: true }, { status: 200 })
    }
    const pieceRows = Array.isArray(body?.pieceRows) ? body?.pieceRows : []
    // Load the admin-configured volumetric + restriction rules so pricing and validation are never hardcoded.
    const [volRules, restrictionRules] = await Promise.all([
      prisma.volumetricRule.findMany({ where: { isActive: true }, orderBy: { priority: 'asc' } }),
      prisma.serviceRestriction.findMany({ where: { isActive: true } }),
    ])
    const divisor = resolveDivisor(volRules as any, { serviceCategory: category, carrier: String(body?.carrierName ?? '') })
    const shipmentCalc = pieceRows.length ? calcShipment(pieceRows, divisor) : null
    const pieces = shipmentCalc ? Math.max(1, shipmentCalc.totals.totalPieces) : Math.max(1, Number(body?.pieces ?? 1))
    const weightKg = shipmentCalc ? shipmentCalc.totals.actualWeight : Number(body?.weightKg ?? 0)
    // Progressive Stage 1 (Quotation) validation — Express needs only origin country + receiver + destination;
    // Road Freight needs full loading & delivery addresses.
    const missing: string[] = []
    if (weightKg <= 0) missing.push('shipment weight')
    if (!body?.receiver?.name) missing.push('receiver name')
    if (!body?.receiver?.country) missing.push('destination country')
    if (category === 'ROAD_FREIGHT') { if (!body?.sender?.name) missing.push('loading contact name'); if (!body?.sender?.address) missing.push('loading address'); if (!body?.sender?.country) missing.push('loading country'); if (!body?.sender?.city) missing.push('loading city'); if (!body?.receiver?.address) missing.push('delivery address'); if (!body?.receiver?.city) missing.push('delivery city') }
    else { if (!body?.sender?.country) missing.push('origin country') }
    if (missing.length) return NextResponse.json({ error: `Please complete: ${missing.join(', ')}.` }, { status: 400 })
    const year = new Date().getUTCFullYear()
    const user = await prisma.user.findUnique({ where: { id: session?.user?.id ?? '' }, select: { organizationId: true } })
    const suggestions = suggestServices(String(body?.contentsType ?? ''), weightKg, category)
    const data = {
      direction: body?.direction === 'IMPORT' ? 'IMPORT' as const : 'EXPORT' as const,
      serviceCategory: category, serviceType: serviceTypeFor(category), workflowStage: 'QUOTATION' as const,
      carrierName: body?.carrierName ? String(body?.carrierName) : null, serviceName: body?.serviceName ? String(body?.serviceName) : null, customerCarrierPreference: (body?.customerCarrierPreference || body?.carrierName || body?.serviceName) ? String(body?.customerCarrierPreference || body?.carrierName || body?.serviceName) : null, currency: String(body?.currency ?? 'EUR'),
      submissionToken: body?.submissionToken ? String(body?.submissionToken) : null,
      contentsType: (['DOCUMENTS','PARCEL','MULTIPLE_PARCELS','BOXES','PALLET'].includes(body?.contentsType) ? body?.contentsType : 'PARCEL') as any,
      senderJson: body?.sender ?? {}, receiverJson: body?.receiver ?? {}, pickupDate: body?.pickupDate ? new Date(body?.pickupDate) : null,
      originCountry: body?.sender?.country ? String(body?.sender?.country) : null, originCity: body?.sender?.city ? String(body?.sender?.city) : null, originPostalCode: body?.sender?.postalCode ? String(body?.sender?.postalCode) : null,
      destCountry: body?.receiver?.country ? String(body?.receiver?.country) : null, destCity: body?.receiver?.city ? String(body?.receiver?.city) : null, destPostalCode: body?.receiver?.postalCode ? String(body?.receiver?.postalCode) : null,
      goodsDescription: body?.goodsDescription ? String(body?.goodsDescription) : null, isCommercial: Boolean(body?.isCommercial),
      pieces, weightKg, dimensionsJson: body?.dimensions ?? [], commercialValue: Number(body?.commercialValue ?? 0), incoterms: String(body?.incoterms ?? 'DAP'),
      dangerousGoods: Boolean(body?.dangerousGoods), unNumber: body?.dangerousGoods ? String(body?.unNumber ?? '') : null, dangerousGoodsClass: body?.dangerousGoods ? String(body?.dangerousGoodsClass ?? '') : null,
      specialInstructions: String(body?.specialInstructions ?? ''), suggestedServices: JSON.parse(JSON.stringify(suggestions ?? [])), status: 'PENDING_REVIEW' as const, isDraft: false, draftJson: (body ?? {}) as any,
    }
    const draftId = String(body?.draftId ?? '')
    const filesCreate = { create: (Array.isArray(body?.files) ? body?.files : []).map((file: any) => ({ fileType: String(file?.fileType ?? 'OTHER'), fileName: String(file?.fileName ?? 'Document'), cloudStoragePath: String(file?.cloud_storage_path ?? ''), contentType: String(file?.contentType ?? 'application/octet-stream'), isPublic: false })).filter((file: any) => Boolean(file?.cloudStoragePath)) }
    if (draftId) {
      const owned = await prisma.quote.findFirst({ where: { id: draftId, userId: session?.user?.id ?? '', isDraft: true }, select: { id: true } })
      if (!owned) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 })
    }
    let quote: any
    // Retry on the rare reference collision (counter drift or concurrent submits): regenerate a fresh reference each attempt.
    for (let attempt = 0; attempt < 6; attempt++) {
      const reference = await nextReference(year)
      try {
        if (draftId) {
          quote = await prisma.quote.update({ where: { id: draftId }, data: { reference, ...data, files: filesCreate }, include: { files: true } })
        } else {
          quote = await prisma.quote.create({ data: { reference, userId: session?.user?.id ?? '', organizationId: user?.organizationId ?? null, ...data, files: filesCreate }, include: { files: true } })
        }
        break
      } catch (e: any) {
        const target = e?.meta?.target
        const isRefCollision = e?.code === 'P2002' && (Array.isArray(target) ? target.includes('reference') : String(target ?? '').includes('reference'))
        if (isRefCollision && attempt < 5) continue
        throw e
      }
    }
    // Persist unlimited multi-piece rows + package validation warnings (Phase C).
    if (pieceRows.length) {
      await prisma.shipmentPiece.deleteMany({ where: { quoteId: quote?.id ?? '' } })
      await prisma.packageValidationWarning.deleteMany({ where: { quoteId: quote?.id ?? '' } })
      await prisma.shipmentPiece.createMany({ data: pieceRows.map((piece: any, index: number) => ({
        quoteId: quote?.id ?? '', pieceNumber: index + 1,
        packageType: String(piece?.packageType ?? 'BOX'), quantity: Math.max(1, Math.floor(Number(piece?.quantity ?? 1)) || 1), identical: true,
        length: Number(piece?.length ?? 0) || 0, width: Number(piece?.width ?? 0) || 0, height: Number(piece?.height ?? 0) || 0,
        dimensionUnit: (DIM_UNITS.includes(String(piece?.dimensionUnit ?? 'CM').toUpperCase()) ? String(piece?.dimensionUnit).toUpperCase() : 'CM') as any,
        weight: Number(piece?.weight ?? 0) || 0, weightUnit: (WT_UNITS.includes(String(piece?.weightUnit ?? 'KG').toUpperCase()) ? String(piece?.weightUnit).toUpperCase() : 'KG') as any,
        stackable: piece?.stackable !== false, description: piece?.description ? String(piece?.description) : null,
        reference: piece?.reference ? String(piece?.reference) : null, customerRef: piece?.customerRef ? String(piece?.customerRef) : null,
      })) })
      const warnings = validatePieces(pieceRows, restrictionRules as any, { serviceCategory: category, carrier: String(body?.carrierName ?? ''), destCountry: String(body?.receiver?.country ?? '') })
      if (warnings.length) await prisma.packageValidationWarning.createMany({ data: warnings.map((warning) => ({ quoteId: quote?.id ?? '', pieceNumber: warning.pieceNumber, code: warning.code, message: warning.message, limitType: warning.limitType })) })
    }
    await prisma.notification.create({ data: { userId: session?.user?.id ?? '', type: 'QUOTE_CREATED', message: `Quote ${quote?.reference ?? ''} is awaiting manual review.` } })
    try { const u = await prisma.user.findUnique({ where: { id: session?.user?.id ?? '' }, select: { name: true, email: true } }); await emailQuoteReceived(u, quote) } catch (e) { console.error('emailQuoteReceived failed', e) }
    return NextResponse.json({ quote: serializeData(quote), suggestions }, { status: 201 })
  } catch (error: unknown) { console.error('Quote create error:', error); const msg = error instanceof Error ? error?.message ?? '' : ''; return NextResponse.json({ error: msg?.includes?.('unique constraint') ? 'Duplicate reference — please try again.' : 'Unable to create quote. Please try again.' }, { status: 500 }) }
}
