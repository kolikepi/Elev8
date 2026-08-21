// Phase 3 — Shipment document categories. Operational MVP: a fixed, brand-free set of categories the
// admin can file uploads under. Customer visibility is controlled per-document (isCustomerVisible).
export const DOCUMENT_CATEGORIES = [
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'AWB_LABEL',
  'CUSTOMS_DOCUMENT',
  'POD',
  'OTHER',
] as const

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  COMMERCIAL_INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  AWB_LABEL: 'AWB / Shipping Label',
  CUSTOMS_DOCUMENT: 'Customs Document',
  POD: 'Proof of Delivery',
  OTHER: 'Other',
}

export function documentCategoryLabel(category?: string | null): string {
  const key = String(category ?? '').trim()
  return DOCUMENT_CATEGORY_LABELS[key] ?? (key || 'Other')
}
