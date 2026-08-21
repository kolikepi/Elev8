import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit, str, strOrNull, dec, dateOrNull } from '@/lib/admin-api'
import { pickCurrentVersion } from '@/lib/quotation-versions'
import { computeOfferPricing, round2 } from '@/lib/offer-pricing'

export const dynamic = 'force-dynamic'

// Admin-only management of the EXTRA alternative offers (QuoteOption rows) attached to a quote's current
// quotation head. These are additional to the primary offer derived from the AdminQuotation pricing panel.
// Carrier brand, carrier service, carrier cost and computed margin are ADMIN-ONLY and never leave via the
// customer projections. This endpoint stores the full internal record; margin = sellingPrice - carrierCost.

export async function GET(_request: Request, context: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const quoteId = context?.params?.id ?? ''
    const options = await prisma.quoteOption.findMany({ where: { quoteId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
    return NextResponse.json({ options: serializeData(options ?? []) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load offers.' }, { status: 500 }) }
}

// Replace-all: the admin sends the complete ordered list of extra offers. We validate, recompute margins,
// and atomically replace the existing extra options for this quote. Options are attached to the current
// (head) AdminQuotation so they travel with the version the customer is deciding on.
export async function POST(request: Request, context: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const quoteId = context?.params?.id ?? ''
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { adminQuotations: true } })
    if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    const current = pickCurrentVersion((quote as any)?.adminQuotations ?? [])
    const adminQuotationId = current?.id ?? null
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const rawList: any[] = Array.isArray(body?.options) ? body.options : []
    // Preserve isSelected across a replace-all so a customer's earlier choice is not silently cleared.
    const existing = await prisma.quoteOption.findMany({ where: { quoteId } })
    const wasSelected = new Set((existing ?? []).filter((o) => o?.isSelected).map((o) => o?.id))
    // Recompute every offer through the SINGLE shared pricing engine (identical math to the primary
    // AdminQuotation panel). sellingPrice always stores the VAT-inclusive final so the customer projection
    // is unchanged; marginAmount / marginPct and the fee breakdown amounts are derived, never trusted from
    // the client. This keeps additional offers at exact field-parity with the primary offer.
    const rows = rawList.map((o, i) => {
      const p = computeOfferPricing(o)
      return {
        id: strOrNull(o?.id) || undefined,
        quoteId,
        adminQuotationId,
        customerServiceId: strOrNull(o?.customerServiceId),
        serviceName: str(o?.serviceName) || 'Express',
        transitTime: strOrNull(o?.transitTime),
        sellingPrice: round2(p.final),
        currency: str(o?.currency) || current?.currency || 'EUR',
        carrierServiceId: strOrNull(o?.carrierServiceId),
        carrierName: strOrNull(o?.carrierName),
        carrierService: strOrNull(o?.carrierService),
        carrierCost: dec(o?.carrierCost),
        pickupFee: dec(o?.pickupFee),
        deliveryFee: dec(o?.deliveryFee),
        remoteAreaFee: dec(o?.remoteAreaFee),
        insuranceFee: dec(o?.insuranceFee),
        dgFee: dec(o?.dgFee),
        documentationFee: dec(o?.documentationFee),
        customsFee: dec(o?.customsFee),
        otherCharges: dec(o?.otherCharges),
        fuelSurcharge: dec(o?.fuelSurcharge),
        markupPct: dec(o?.markupPct),
        markupAmount: round2(p.markupAmount),
        discountPct: dec(o?.discountPct),
        discountAmount: round2(p.discountAmount),
        vatPct: dec(o?.vatPct),
        vatAmount: round2(p.vatAmount),
        subtotal: round2(p.subtotal),
        marginAmount: round2(p.marginAmount),
        marginPct: round2(p.marginPct),
        validUntil: dateOrNull(o?.validUntil),
        notes: strOrNull(o?.notes),
        sortOrder: i,
        isSelected: o?.id ? wasSelected.has(o.id) : false,
      }
    })
    await prisma.$transaction(async (tx) => {
      await tx.quoteOption.deleteMany({ where: { quoteId } })
      for (const r of rows) {
        const { id, ...data } = r
        await tx.quoteOption.create({ data })
      }
    })
    await audit('Quote', quoteId, 'options-save', session?.user?.id, { count: rows.length })
    const options = await prisma.quoteOption.findMany({ where: { quoteId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
    return NextResponse.json({ options: serializeData(options ?? []) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to save offers.' }, { status: 500 }) }
}
