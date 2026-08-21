// Sprint 2.2.1 Phase A — Change Impact Engine.
// Compares the ACCEPTED QUOTE data (sender/receiver/pieces/commodity captured at quotation time) against the
// FINAL BOOKING data the customer submits after acceptance, and classifies every change so the platform can
// decide whether the accepted price still holds, needs a fresh calculation, or needs a human commercial review.
//
// This module NEVER computes a price. It only classifies impact. The existing pricing / recommendation /
// volumetric / tariff / surcharge engines remain the single source of truth for numbers — when a change is
// RECALCULATION_REQUIRED or MANUAL_REVIEW_REQUIRED we simply flag the quote (needsReapproval) so the existing
// admin recalculate + re-approve loop runs. No parallel calculation is introduced here.

export type ImpactLevel = 'NO_PRICE_IMPACT' | 'RECALCULATION_REQUIRED' | 'MANUAL_REVIEW_REQUIRED'

export type BookingChange = {
  field: string
  label: string
  quoted: string
  booked: string
  impact: ImpactLevel
}

export type BookingClassification = {
  changes: BookingChange[]
  overall: ImpactLevel
}

const SEVERITY: Record<ImpactLevel, number> = { NO_PRICE_IMPACT: 0, RECALCULATION_REQUIRED: 1, MANUAL_REVIEW_REQUIRED: 2 }
const WEIGHT_TOLERANCE = 0.01
const VALUE_TOLERANCE = 0.01

const txt = (v: unknown): string => String(v ?? '').trim()
const norm = (v: unknown): string => txt(v).toLowerCase().replace(/\s+/g, ' ')
const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const boolOf = (v: unknown): boolean => v === true || v === 'true' || v === 1 || v === '1'
const yn = (v: boolean): string => (v ? 'Yes' : 'No')

function pieceSignature(pieces: any[]): string {
  return (Array.isArray(pieces) ? pieces : [])
    .map((p: any) => `${norm(p?.packageType ?? 'BOX')}:${num(p?.quantity ?? 1)}:${num(p?.length)}x${num(p?.width)}x${num(p?.height)}:${num(p?.weight)}`)
    .sort()
    .join('|')
}

function totalWeightOf(pieces: any[], fallback: number): number {
  if (!Array.isArray(pieces) || pieces.length === 0) return num(fallback)
  return pieces.reduce((sum: number, p: any) => sum + num(p?.weight) * Math.max(1, num(p?.quantity ?? 1)), 0)
}

function totalPiecesOf(pieces: any[], fallback: number): number {
  if (!Array.isArray(pieces) || pieces.length === 0) return num(fallback)
  return pieces.reduce((sum: number, p: any) => sum + Math.max(1, num(p?.quantity ?? 1)), 0)
}

// Classify the difference between the accepted quote and the submitted booking.
// `quote` is the Prisma Quote (plus optional shipmentPieces). `booking` is the customer-submitted booking payload.
export function classifyBooking(quote: any, booking: any): BookingClassification {
  const changes: BookingChange[] = []
  const add = (field: string, label: string, quoted: unknown, booked: unknown, impact: ImpactLevel) =>
    changes.push({ field, label, quoted: txt(quoted) || '—', booked: txt(booked) || '—', impact })

  const qSender = (quote?.senderJson ?? {}) as any
  const qReceiver = (quote?.receiverJson ?? {}) as any
  const bSender = (booking?.sender ?? {}) as any
  const bReceiver = (booking?.receiver ?? {}) as any

  // --- Route fields: country / city / postal code affect zone + tariff => RECALCULATION_REQUIRED ---
  const routeParties: [string, string, any, any][] = [
    ['origin', 'Pickup', qSender, bSender],
    ['dest', 'Delivery', qReceiver, bReceiver],
  ]
  for (const [key, label, q, b] of routeParties) {
    if (b?.country !== undefined && norm(q?.country) !== norm(b?.country)) add(`${key}.country`, `${label} country`, q?.country, b?.country, 'RECALCULATION_REQUIRED')
    if (b?.city !== undefined && norm(q?.city) !== norm(b?.city)) add(`${key}.city`, `${label} city`, q?.city, b?.city, 'RECALCULATION_REQUIRED')
    if (b?.postalCode !== undefined && norm(q?.postalCode) !== norm(b?.postalCode)) add(`${key}.postalCode`, `${label} postal code`, q?.postalCode, b?.postalCode, 'RECALCULATION_REQUIRED')
    // Contact / address-line details do not change the price.
    if (b?.name !== undefined && norm(q?.name) !== norm(b?.name)) add(`${key}.name`, `${label} contact name`, q?.name, b?.name, 'NO_PRICE_IMPACT')
    if (b?.company !== undefined && norm(q?.company) !== norm(b?.company)) add(`${key}.company`, `${label} company`, q?.company, b?.company, 'NO_PRICE_IMPACT')
    if (b?.address !== undefined && norm(q?.address) !== norm(b?.address)) add(`${key}.address`, `${label} address`, q?.address, b?.address, 'NO_PRICE_IMPACT')
    if (b?.phone !== undefined && norm(q?.phone) !== norm(b?.phone)) add(`${key}.phone`, `${label} phone`, q?.phone, b?.phone, 'NO_PRICE_IMPACT')
    if (b?.email !== undefined && norm(q?.email) !== norm(b?.email)) add(`${key}.email`, `${label} email`, q?.email, b?.email, 'NO_PRICE_IMPACT')
  }

  // --- Packages & weights: any change to weight / piece count / dimensions / type => RECALCULATION_REQUIRED ---
  if (Array.isArray(booking?.pieces) && booking?.pieces?.length) {
    const quotedPieces = Array.isArray(quote?.shipmentPieces) && quote?.shipmentPieces?.length
      ? quote?.shipmentPieces?.map((p: any) => ({ packageType: p?.packageType, quantity: p?.quantity, length: p?.length, width: p?.width, height: p?.height, weight: p?.weight }))
      : []
    const qWeight = totalWeightOf(quotedPieces, num(quote?.weightKg))
    const bWeight = totalWeightOf(booking?.pieces, num(quote?.weightKg))
    const qCount = totalPiecesOf(quotedPieces, num(quote?.pieces))
    const bCount = totalPiecesOf(booking?.pieces, num(quote?.pieces))
    if (Math.abs(qWeight - bWeight) > WEIGHT_TOLERANCE) add('totalWeight', 'Total weight (kg)', qWeight.toFixed(2), bWeight.toFixed(2), 'RECALCULATION_REQUIRED')
    if (qCount !== bCount) add('totalPieces', 'Total pieces', qCount, bCount, 'RECALCULATION_REQUIRED')
    if (quotedPieces.length && pieceSignature(quotedPieces) !== pieceSignature(booking?.pieces)) add('pieces', 'Package types / dimensions', 'Confirmed at quotation', 'Adjusted at booking', 'RECALCULATION_REQUIRED')
  } else if (booking?.totalWeightKg !== undefined && Math.abs(num(quote?.weightKg) - num(booking?.totalWeightKg)) > WEIGHT_TOLERANCE) {
    add('totalWeight', 'Total weight (kg)', num(quote?.weightKg).toFixed(2), num(booking?.totalWeightKg).toFixed(2), 'RECALCULATION_REQUIRED')
  }

  // --- Commodity / contents: content type affects service & pricing => RECALCULATION; commercial + customs => MANUAL ---
  if (booking?.contentsType !== undefined && norm(quote?.contentsType) !== norm(booking?.contentsType)) add('contentsType', 'Contents type', quote?.contentsType, booking?.contentsType, 'RECALCULATION_REQUIRED')
  if (booking?.isCommercial !== undefined && boolOf(quote?.isCommercial) !== boolOf(booking?.isCommercial)) add('isCommercial', 'Commercial vs personal', boolOf(quote?.isCommercial) ? 'Commercial' : 'Personal', boolOf(booking?.isCommercial) ? 'Commercial' : 'Personal', 'MANUAL_REVIEW_REQUIRED')
  if (booking?.incoterms !== undefined && norm(quote?.incoterms) !== norm(booking?.incoterms)) add('incoterms', 'Incoterms', quote?.incoterms, booking?.incoterms, 'MANUAL_REVIEW_REQUIRED')
  if (booking?.goodsDescription !== undefined && norm(quote?.goodsDescription) !== norm(booking?.goodsDescription)) add('goodsDescription', 'Goods description', quote?.goodsDescription, booking?.goodsDescription, 'NO_PRICE_IMPACT')
  if (booking?.commercialValue !== undefined && Math.abs(num(quote?.commercialValue) - num(booking?.commercialValue)) > VALUE_TOLERANCE) add('commercialValue', 'Declared value', num(quote?.commercialValue).toFixed(2), num(booking?.commercialValue).toFixed(2), 'NO_PRICE_IMPACT')

  // --- Dangerous goods: any DG change is safety/compliance critical => MANUAL_REVIEW_REQUIRED ---
  if (booking?.dangerousGoods !== undefined && boolOf(quote?.dangerousGoods) !== boolOf(booking?.dangerousGoods)) add('dangerousGoods', 'Dangerous goods', yn(boolOf(quote?.dangerousGoods)), yn(boolOf(booking?.dangerousGoods)), 'MANUAL_REVIEW_REQUIRED')
  if (booking?.unNumber !== undefined && norm(quote?.unNumber) !== norm(booking?.unNumber)) add('unNumber', 'UN number', quote?.unNumber, booking?.unNumber, 'MANUAL_REVIEW_REQUIRED')
  if (booking?.dangerousGoodsClass !== undefined && norm(quote?.dangerousGoodsClass) !== norm(booking?.dangerousGoodsClass)) add('dangerousGoodsClass', 'DG class', quote?.dangerousGoodsClass, booking?.dangerousGoodsClass, 'MANUAL_REVIEW_REQUIRED')

  const overall = changes.reduce<ImpactLevel>((max, c) => (SEVERITY[c.impact] > SEVERITY[max] ? c.impact : max), 'NO_PRICE_IMPACT')
  return { changes, overall }
}

// Friendly, customer-facing wording. Internal codes (RECALCULATION_REQUIRED etc.) are NEVER shown to customers.
export function customerImpactMessage(overall: ImpactLevel, submitted: boolean): string {
  if (!submitted) return 'Add the final pickup, delivery and package details to complete your booking.'
  if (overall === 'NO_PRICE_IMPACT') return 'Booking details received. We are preparing your shipment for booking.'
  return 'Booking details received. Our team is reviewing your updated shipment details and will confirm shortly.'
}
