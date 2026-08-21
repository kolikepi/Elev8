import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { suggestServices } from '@/lib/service-suggestion'
import { emailQuoteReceived } from '@/lib/email'
import { calcShipment, validatePieces, resolveDivisor } from '@/lib/piece-calc'
import { getGuestPoolUserId } from '@/lib/guest-user'
import { rateLimit, sweepRateLimit } from '@/lib/rate-limit'

const DIM_UNITS = ['CM', 'IN', 'M']
const WT_UNITS = ['KG', 'LB']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const dynamic = 'force-dynamic'

function categoryFor(value: string): 'EXPRESS' | 'ROAD_FREIGHT' | 'AIR_FREIGHT' | 'SEA_FREIGHT' {
  return (['EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT'].includes(value) ? value : 'EXPRESS') as any
}
function serviceTypeFor(category: string): 'EXPRESS_COURIER' | 'ECONOMY_COURIER' | 'ROAD_FREIGHT' {
  if (category === 'ROAD_FREIGHT' || category === 'SEA_FREIGHT') return 'ROAD_FREIGHT'
  return 'EXPRESS_COURIER'
}

// Mirrors the authenticated /api/quotes counter-synced reference generator (FWD-YYYY-NNNNN).
async function nextReference(year: number): Promise<string> {
  const latest = await prisma.quote.findFirst({ where: { reference: { startsWith: `FWD-${year}-` } }, orderBy: { reference: 'desc' }, select: { reference: true } })
  const maxExisting = latest?.reference ? (parseInt(latest.reference.split('-').pop() || '0', 10) || 0) : 0
  const counter = await prisma.referenceCounter.upsert({ where: { year }, update: { value: { increment: 1 } }, create: { year, value: 1 } })
  let value = counter?.value ?? 1
  if (value <= maxExisting) { value = maxExisting + 1; await prisma.referenceCounter.update({ where: { year }, data: { value } }) }
  return `FWD-${year}-${String(value).padStart(5, '0')}`
}

function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for') ?? ''
  return (xff.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim()
}

// Public, UNAUTHENTICATED endpoint. Anyone can submit a quote request as a guest. It reuses the exact same
// quote-creation logic as the customer flow (same pricing engine, same PENDING_REVIEW workflow) — it does
// NOT create a separate guest quotation database or pricing path. Every guest quote is attached to the
// single guest-pool user, flagged isGuest + requestSource=PUBLIC_WEBSITE, with the guest's real contact
// details stored on the row. The response exposes ONLY the reference — no id, no internal data — to prevent
// enumeration/leaks.
export async function POST(request: Request) {
  try {
    sweepRateLimit()
    const ip = clientIp(request)
    const rl = rateLimit(`public-quote:${ip}`, { limit: 8, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Please try again in a few minutes.' }, { status: 429 })

    const body = await request?.json?.().catch?.(() => ({})) ?? {}

    // --- Guest contact validation (Full Name and/or Company required; Phone + Email mandatory) ---
    const guestName = String(body?.contact?.fullName ?? body?.guestName ?? '').trim()
    const guestCompany = String(body?.contact?.companyName ?? body?.guestCompany ?? '').trim()
    const guestPhone = String(body?.contact?.phone ?? body?.guestPhone ?? '').trim()
    const guestEmail = String(body?.contact?.email ?? body?.guestEmail ?? '').trim().toLowerCase()
    const contactMissing: string[] = []
    if (!guestName && !guestCompany) contactMissing.push('full name or company name')
    if (!guestPhone) contactMissing.push('phone number')
    if (!guestEmail) contactMissing.push('email')
    if (contactMissing.length) return NextResponse.json({ error: `Please provide: ${contactMissing.join(', ')}.` }, { status: 400 })
    if (!EMAIL_RE.test(guestEmail)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    if (guestName.length > 160 || guestCompany.length > 160 || guestPhone.length > 40 || guestEmail.length > 160) return NextResponse.json({ error: 'One of the contact fields is too long.' }, { status: 400 })

    const category = categoryFor(String(body?.serviceCategory ?? body?.serviceType ?? 'EXPRESS'))
    const pieceRows = Array.isArray(body?.pieceRows) ? body?.pieceRows : []
    const [volRules, restrictionRules] = await Promise.all([
      prisma.volumetricRule.findMany({ where: { isActive: true }, orderBy: { priority: 'asc' } }),
      prisma.serviceRestriction.findMany({ where: { isActive: true } }),
    ])
    const divisor = resolveDivisor(volRules as any, { serviceCategory: category, carrier: '' })
    const shipmentCalc = pieceRows.length ? calcShipment(pieceRows, divisor) : null
    const pieces = shipmentCalc ? Math.max(1, shipmentCalc.totals.totalPieces) : Math.max(1, Number(body?.pieces ?? 1))
    const weightKg = shipmentCalc ? shipmentCalc.totals.actualWeight : Number(body?.weightKg ?? 0)

    const missing: string[] = []
    if (weightKg <= 0) missing.push('shipment weight')
    if (!body?.receiver?.name) missing.push('receiver name')
    if (!body?.receiver?.country) missing.push('destination country')
    if (category === 'ROAD_FREIGHT') { if (!body?.sender?.name) missing.push('loading contact name'); if (!body?.sender?.address) missing.push('loading address'); if (!body?.sender?.country) missing.push('loading country'); if (!body?.sender?.city) missing.push('loading city'); if (!body?.receiver?.address) missing.push('delivery address'); if (!body?.receiver?.city) missing.push('delivery city') }
    else { if (!body?.sender?.country) missing.push('origin country') }
    if (missing.length) return NextResponse.json({ error: `Please complete: ${missing.join(', ')}.` }, { status: 400 })

    const year = new Date().getUTCFullYear()
    const guestUserId = await getGuestPoolUserId()
    const suggestions = suggestServices(String(body?.contentsType ?? ''), weightKg, category)
    const data = {
      direction: body?.direction === 'IMPORT' ? 'IMPORT' as const : 'EXPORT' as const,
      serviceCategory: category, serviceType: serviceTypeFor(category), workflowStage: 'QUOTATION' as const,
      customerCarrierPreference: body?.customerCarrierPreference ? String(body?.customerCarrierPreference) : null, currency: String(body?.currency ?? 'EUR'),
      contentsType: (['DOCUMENTS', 'PARCEL', 'MULTIPLE_PARCELS', 'BOXES', 'PALLET'].includes(body?.contentsType) ? body?.contentsType : 'PARCEL') as any,
      senderJson: body?.sender ?? {}, receiverJson: body?.receiver ?? {}, pickupDate: body?.pickupDate ? new Date(body?.pickupDate) : null,
      originCountry: body?.sender?.country ? String(body?.sender?.country) : null, originCity: body?.sender?.city ? String(body?.sender?.city) : null, originPostalCode: body?.sender?.postalCode ? String(body?.sender?.postalCode) : null,
      destCountry: body?.receiver?.country ? String(body?.receiver?.country) : null, destCity: body?.receiver?.city ? String(body?.receiver?.city) : null, destPostalCode: body?.receiver?.postalCode ? String(body?.receiver?.postalCode) : null,
      goodsDescription: body?.goodsDescription ? String(body?.goodsDescription) : null, isCommercial: Boolean(body?.isCommercial),
      pieces, weightKg, dimensionsJson: body?.dimensions ?? [], commercialValue: Number(body?.commercialValue ?? 0), incoterms: String(body?.incoterms ?? 'DAP'),
      dangerousGoods: Boolean(body?.dangerousGoods), unNumber: body?.dangerousGoods ? String(body?.unNumber ?? '') : null, dangerousGoodsClass: body?.dangerousGoods ? String(body?.dangerousGoodsClass ?? '') : null,
      specialInstructions: String(body?.specialInstructions ?? ''), suggestedServices: JSON.parse(JSON.stringify(suggestions ?? [])), status: 'PENDING_REVIEW' as const, isDraft: false,
      isGuest: true, requestSource: 'PUBLIC_WEBSITE', guestName: guestName || null, guestCompany: guestCompany || null, guestPhone, guestEmail,
    }

    let quote: any
    for (let attempt = 0; attempt < 6; attempt++) {
      const reference = await nextReference(year)
      try {
        quote = await prisma.quote.create({ data: { reference, userId: guestUserId, ...data } })
        break
      } catch (e: any) {
        const target = e?.meta?.target
        const isRefCollision = e?.code === 'P2002' && (Array.isArray(target) ? target.includes('reference') : String(target ?? '').includes('reference'))
        if (isRefCollision && attempt < 5) continue
        throw e
      }
    }

    if (pieceRows.length) {
      await prisma.shipmentPiece.createMany({ data: pieceRows.map((piece: any, index: number) => ({
        quoteId: quote?.id ?? '', pieceNumber: index + 1,
        packageType: String(piece?.packageType ?? 'BOX'), quantity: Math.max(1, Math.floor(Number(piece?.quantity ?? 1)) || 1), identical: true,
        length: Number(piece?.length ?? 0) || 0, width: Number(piece?.width ?? 0) || 0, height: Number(piece?.height ?? 0) || 0,
        dimensionUnit: (DIM_UNITS.includes(String(piece?.dimensionUnit ?? 'CM').toUpperCase()) ? String(piece?.dimensionUnit).toUpperCase() : 'CM') as any,
        weight: Number(piece?.weight ?? 0) || 0, weightUnit: (WT_UNITS.includes(String(piece?.weightUnit ?? 'KG').toUpperCase()) ? String(piece?.weightUnit).toUpperCase() : 'KG') as any,
        stackable: piece?.stackable !== false, description: piece?.description ? String(piece?.description) : null,
        reference: piece?.reference ? String(piece?.reference) : null, customerRef: piece?.customerRef ? String(piece?.customerRef) : null,
      })) })
      const warnings = validatePieces(pieceRows, restrictionRules as any, { serviceCategory: category, carrier: '', destCountry: String(body?.receiver?.country ?? '') })
      if (warnings.length) await prisma.packageValidationWarning.createMany({ data: warnings.map((warning) => ({ quoteId: quote?.id ?? '', pieceNumber: warning.pieceNumber, code: warning.code, message: warning.message, limitType: warning.limitType })) })
    }

    // Notify operators via the guest-pool user's notification stream (admin dashboard reads all).
    try { await prisma.notification.create({ data: { userId: guestUserId, type: 'QUOTE_CREATED', message: `Guest quote ${quote?.reference ?? ''} (${guestName || guestCompany}) is awaiting manual review.` } }) } catch (e) { console.error('notification failed', e) }
    // Confirmation email to the guest.
    try { await emailQuoteReceived({ name: guestName || guestCompany, email: guestEmail }, quote) } catch (e) { console.error('emailQuoteReceived failed', e) }

    return NextResponse.json({ reference: quote?.reference ?? '', email: guestEmail }, { status: 201 })
  } catch (error: unknown) {
    console.error('Public quote create error:', error)
    return NextResponse.json({ error: 'Unable to submit your request. Please try again.' }, { status: 500 })
  }
}
