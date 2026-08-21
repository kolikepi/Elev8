// Unified Multi Quote — the SINGLE client-safe pricing engine shared by every offer card.
//
// This mirrors, field-for-field, the commercial pricing math in lib/quotation-build.ts (the server-side
// AdminQuotation builder). It is intentionally pure and dependency-free so it can run in the browser for a
// live preview inside an offer card AND on the server when persisting an extra QuoteOption — guaranteeing
// there is never a second/parallel pricing formula. Do NOT introduce a different calculation anywhere.
//
// Margin convention (applied consistently everywhere): margin is measured ex-VAT against the subtotal.
//   marginAmount = subtotal - carrierCost
//   marginPct    = subtotal > 0 ? marginAmount / subtotal * 100 : 0

export const amount = (value: unknown): number => Math.max(0, Number(value ?? 0) || 0)

export type OfferPricingInputs = {
  carrierCost?: unknown
  pickupFee?: unknown
  deliveryFee?: unknown
  remoteAreaFee?: unknown
  insuranceFee?: unknown
  dgFee?: unknown
  documentationFee?: unknown
  customsFee?: unknown
  otherCharges?: unknown
  fuelSurcharge?: unknown
  markupPct?: unknown
  discountPct?: unknown
  vatPct?: unknown
}

export type OfferPricing = {
  carrierCost: number
  base: number
  fuelAmount: number
  markupAmount: number
  discountAmount: number
  subtotal: number
  vatAmount: number
  final: number
  marginAmount: number
  marginPct: number
}

// The one and only offer pricing calculation. Same order of operations as buildQuotationData():
//   base -> fuel -> markup -> discount -> subtotal -> VAT -> final (VAT-inclusive selling price).
export function computeOfferPricing(input: OfferPricingInputs): OfferPricing {
  const carrierCost = amount(input?.carrierCost)
  const pickupFee = amount(input?.pickupFee)
  const deliveryFee = amount(input?.deliveryFee)
  const remoteAreaFee = amount(input?.remoteAreaFee)
  const insuranceFee = amount(input?.insuranceFee)
  const dgFee = amount(input?.dgFee)
  const documentationFee = amount(input?.documentationFee)
  const customsFee = amount(input?.customsFee)
  const otherCharges = amount(input?.otherCharges)
  const fuelSurcharge = amount(input?.fuelSurcharge)
  const markupPct = amount(input?.markupPct)
  const discountPct = amount(input?.discountPct)
  const vatPct = amount(input?.vatPct)

  const base = carrierCost + pickupFee + deliveryFee + remoteAreaFee + insuranceFee + dgFee + documentationFee + customsFee + otherCharges
  const fuelAmount = base * fuelSurcharge / 100
  const beforeMarkup = base + fuelAmount
  const markupAmount = beforeMarkup * markupPct / 100
  const afterMarkup = beforeMarkup + markupAmount
  const discountAmount = afterMarkup * discountPct / 100
  const subtotal = afterMarkup - discountAmount
  const vatAmount = subtotal * vatPct / 100
  const final = subtotal + vatAmount
  const marginAmount = subtotal - carrierCost
  const marginPct = subtotal > 0 ? (marginAmount / subtotal) * 100 : 0

  return { carrierCost, base, fuelAmount, markupAmount, discountAmount, subtotal, vatAmount, final, marginAmount, marginPct }
}

export const round2 = (v: number): number => Math.round((Number(v) || 0) * 100) / 100
