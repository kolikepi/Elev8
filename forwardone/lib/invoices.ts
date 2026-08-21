// Phase 3 — Invoice helpers. An invoice is a document derived from a completed shipment (auto-inheriting
// the accepted selling price) plus any additional operational charges the admin adds.
// net (subtotal) = selling price + sum(charges); VAT is optional (vatPct, default 0 → backward compatible);
// total = net + vatAmount. No fiscalization / accounting integration.

export type InvoiceCharge = { description: string; amount: number }

export function normalizeCharges(raw: unknown): InvoiceCharge[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c: any) => ({ description: String(c?.description ?? '').trim(), amount: Number(c?.amount ?? 0) || 0 }))
    .filter((c) => c.description.length > 0)
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

export function computeTotals(
  sellingPrice: number,
  charges: InvoiceCharge[],
  vatPct?: number | null,
): { subtotal: number; vatPct: number; vatAmount: number; total: number } {
  const chargesSum = (charges ?? []).reduce((s, c) => s + (Number(c?.amount) || 0), 0)
  const subtotal = round2((Number(sellingPrice) || 0) + chargesSum)
  const pct = Math.max(0, Number(vatPct) || 0)
  const vatAmount = round2(subtotal * (pct / 100))
  const total = round2(subtotal + vatAmount)
  return { subtotal, vatPct: pct, vatAmount, total }
}
