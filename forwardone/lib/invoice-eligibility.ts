// Invoice timing / eligibility rules (shared by API + UI).
// Direction-aware, additive replacement of the old hard "status === DELIVERED" gate.
//
//  - IMPORT: invoiceable once the shipment has reached Customs (or any later stage).
//  - EXPORT: invoiceable once final weight/dimensions AND final selling price are confirmed.
//
// Admin keeps full manual control — this only decides whether the "Create invoice" action is allowed;
// nothing is auto-invoiced.

export type EligibilityShipment = {
  status?: string | null
  sellingPrice?: unknown
  actualWeightKg?: unknown
  actualChargeableWeightKg?: unknown
  direction?: string | null
}

// Statuses that mean "customs reached or beyond" for an IMPORT shipment.
export const IMPORT_INVOICEABLE_STATUSES = [
  'CUSTOMS_CLEARANCE',
  'CUSTOMS_HOLD',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FINANCIALLY_CLOSED',
] as const

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== ''
}

export type EligibilityResult = { eligible: boolean; reason: string }

export function invoiceEligibility(s: EligibilityShipment): EligibilityResult {
  const status = String(s?.status ?? '').toUpperCase()
  const direction = String(s?.direction ?? '').toUpperCase()

  if (status === 'CANCELLED') {
    return { eligible: false, reason: 'This shipment is cancelled and cannot be invoiced.' }
  }

  const finalPriceConfirmed = hasValue(s?.sellingPrice)
  const finalWeightConfirmed = hasValue(s?.actualWeightKg) || hasValue(s?.actualChargeableWeightKg)

  if (direction === 'IMPORT') {
    if ((IMPORT_INVOICEABLE_STATUSES as readonly string[]).includes(status)) {
      return { eligible: true, reason: '' }
    }
    return {
      eligible: false,
      reason: 'Import shipments can be invoiced once the shipment has reached customs clearance.',
    }
  }

  if (direction === 'EXPORT') {
    if (finalWeightConfirmed && finalPriceConfirmed) {
      return { eligible: true, reason: '' }
    }
    return {
      eligible: false,
      reason:
        'Export shipments can be invoiced once the final weight/dimensions and final selling price are confirmed.',
    }
  }

  // Unknown/absent direction — fall back to a permissive rule that still requires a confirmed price
  // so we never invoice a shipment with no accepted amount.
  if (finalPriceConfirmed) return { eligible: true, reason: '' }
  return { eligible: false, reason: 'A confirmed selling price is required before invoicing.' }
}

export function canInvoiceShipment(s: EligibilityShipment): boolean {
  return invoiceEligibility(s).eligible
}
