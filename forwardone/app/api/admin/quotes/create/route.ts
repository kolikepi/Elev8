import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, audit } from '@/lib/admin-api'
import { serializeData } from '@/lib/serialize'
import { suggestServices } from '@/lib/service-suggestion'
import { calcShipment, validatePieces, resolveDivisor } from '@/lib/piece-calc'
import { nextQuoteReference } from '@/lib/quote-reference'

export const dynamic = 'force-dynamic'

const DIM_UNITS = ['CM', 'IN', 'M']
const WT_UNITS = ['KG', 'LB']
const SOURCES = ['WHATSAPP', 'EMAIL', 'PHONE', 'ADMIN']

function categoryFor(value: string): 'EXPRESS' | 'ROAD_FREIGHT' | 'AIR_FREIGHT' | 'SEA_FREIGHT' {
  return (['EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT'].includes(value) ? value : 'EXPRESS') as any
}
function serviceTypeFor(category: string): 'EXPRESS_COURIER' | 'ECONOMY_COURIER' | 'ROAD_FREIGHT' {
  if (category === 'ROAD_FREIGHT' || category === 'SEA_FREIGHT') return 'ROAD_FREIGHT'
  return 'EXPRESS_COURIER'
}

// Admin manually creates a Quote Request on behalf of a customer whose shipment details arrived outside the
// portal (WhatsApp / Email / Phone). It reuses the EXACT same Quote model + downstream workflow as a
// portal-created quote — the only differences are: the owner is the selected customer (not the admin),
// and we stamp the request source + internal notes + createdByAdminId. Everything else (multi-offer,
// booking, shipment, invoice) is untouched.
export async function POST(request: Request) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}

    // Resolve the owning customer from the Customer Master. The UI creates a brand-new customer first
    // (POST /api/admin/users) and then passes the returned id here, so there is one customer database.
    const customerId = String(body?.customerId ?? '').trim()
    if (!customerId) return NextResponse.json({ error: 'Please select or create a customer for this request.' }, { status: 400 })
    const customer = await prisma.user.findUnique({ where: { id: customerId }, select: { id: true, role: true, organizationId: true } })
    if (!customer || customer.role === 'ADMINISTRATOR') return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })

    const category = categoryFor(String(body?.serviceCategory ?? 'EXPRESS'))
    const requestSource = SOURCES.includes(String(body?.requestSource ?? '').toUpperCase()) ? String(body?.requestSource).toUpperCase() : 'ADMIN'

    const pieceRows = Array.isArray(body?.pieceRows) ? body?.pieceRows : []
    const [volRules, restrictionRules] = await Promise.all([
      prisma.volumetricRule.findMany({ where: { isActive: true }, orderBy: { priority: 'asc' } }),
      prisma.serviceRestriction.findMany({ where: { isActive: true } }),
    ])
    const divisor = resolveDivisor(volRules as any, { serviceCategory: category, carrier: String(body?.carrierName ?? '') })
    const shipmentCalc = pieceRows.length ? calcShipment(pieceRows, divisor) : null
    const pieces = shipmentCalc ? Math.max(1, shipmentCalc.totals.totalPieces) : Math.max(1, Number(body?.pieces ?? 1))
    const weightKg = shipmentCalc ? shipmentCalc.totals.actualWeight : Number(body?.weightKg ?? 0)

    // Same progressive validation the customer form enforces.
    const missing: string[] = []
    if (weightKg <= 0) missing.push('shipment weight')
    if (!body?.receiver?.name) missing.push('receiver name')
    if (!body?.receiver?.country) missing.push('destination country')
    if (category === 'ROAD_FREIGHT') { if (!body?.sender?.name) missing.push('loading contact name'); if (!body?.sender?.address) missing.push('loading address'); if (!body?.sender?.country) missing.push('loading country'); if (!body?.sender?.city) missing.push('loading city'); if (!body?.receiver?.address) missing.push('delivery address'); if (!body?.receiver?.city) missing.push('delivery city') }
    else { if (!body?.sender?.country) missing.push('origin country') }
    if (missing.length) return NextResponse.json({ error: `Please complete: ${missing.join(', ')}.` }, { status: 400 })

    const suggestions = suggestServices(String(body?.contentsType ?? ''), weightKg, category)
    const year = new Date().getUTCFullYear()
    const data = {
      direction: body?.direction === 'IMPORT' ? 'IMPORT' as const : 'EXPORT' as const,
      serviceCategory: category, serviceType: serviceTypeFor(category), workflowStage: 'QUOTATION' as const,
      carrierName: body?.carrierName ? String(body?.carrierName) : null, serviceName: body?.serviceName ? String(body?.serviceName) : null,
      customerCarrierPreference: (body?.customerCarrierPreference || body?.carrierName || body?.serviceName) ? String(body?.customerCarrierPreference || body?.carrierName || body?.serviceName) : null,
      currency: String(body?.currency ?? 'EUR'),
      contentsType: (['DOCUMENTS', 'PARCEL', 'MULTIPLE_PARCELS', 'BOXES', 'PALLET'].includes(body?.contentsType) ? body?.contentsType : 'PARCEL') as any,
      senderJson: body?.sender ?? {}, receiverJson: body?.receiver ?? {}, pickupDate: body?.pickupDate ? new Date(body?.pickupDate) : null,
      originCountry: body?.sender?.country ? String(body?.sender?.country) : null, originCity: body?.sender?.city ? String(body?.sender?.city) : null, originPostalCode: body?.sender?.postalCode ? String(body?.sender?.postalCode) : null,
      destCountry: body?.receiver?.country ? String(body?.receiver?.country) : null, destCity: body?.receiver?.city ? String(body?.receiver?.city) : null, destPostalCode: body?.receiver?.postalCode ? String(body?.receiver?.postalCode) : null,
      goodsDescription: body?.goodsDescription ? String(body?.goodsDescription) : null, isCommercial: Boolean(body?.isCommercial),
      pieces, weightKg, dimensionsJson: body?.dimensions ?? [], commercialValue: Number(body?.commercialValue ?? 0), incoterms: String(body?.incoterms ?? 'DAP'),
      dangerousGoods: Boolean(body?.dangerousGoods), unNumber: body?.dangerousGoods ? String(body?.unNumber ?? '') : null, dangerousGoodsClass: body?.dangerousGoods ? String(body?.dangerousGoodsClass ?? '') : null,
      specialInstructions: String(body?.specialInstructions ?? ''), suggestedServices: JSON.parse(JSON.stringify(suggestions ?? [])), status: 'PENDING_REVIEW' as const, isDraft: false,
      requestSource, internalRequestNotes: body?.internalNotes ? String(body?.internalNotes) : null, createdByAdminId: session?.user?.id ?? null,
    }

    let quote: any
    for (let attempt = 0; attempt < 6; attempt++) {
      const reference = await nextQuoteReference(year)
      try {
        quote = await prisma.quote.create({ data: { reference, userId: customer.id, organizationId: customer.organizationId ?? null, ...data } })
        break
      } catch (e: any) {
        const target = e?.meta?.target
        const isRefCollision = e?.code === 'P2002' && (Array.isArray(target) ? target.includes('reference') : String(target ?? '').includes('reference'))
        if (isRefCollision && attempt < 5) continue
        throw e
      }
    }

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

    await prisma.notification.create({ data: { userId: customer.id, type: 'QUOTE_CREATED', message: `Quote ${quote?.reference ?? ''} was created by ForwardOne on your behalf and is being prepared.` } })
    await audit('Quote', quote?.id ?? '', 'admin-manual-create', session?.user?.id, { reference: quote?.reference, customerId: customer.id, requestSource })

    return NextResponse.json({ quote: serializeData(quote) }, { status: 201 })
  } catch (error: unknown) { console.error('Admin manual quote create error:', error); return NextResponse.json({ error: 'Unable to create the quote request.' }, { status: 500 }) }
}
