import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { emailQuoteReady } from '@/lib/email'
import { buildQuotationData } from '@/lib/quotation-build'
import { pickCurrentVersion } from '@/lib/quotation-versions'

export const dynamic = 'force-dynamic'
const dateOrNull = (v: unknown): Date | null => { if (!v) return null; const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d }

// Initial quotation editor. Prepares and sends the FIRST customer-facing version (V1) of a quote. Once a
// version has been SENT / ACCEPTED / REJECTED it can no longer be silently overwritten here — the admin must
// use "Revise Quotation" (/revise) which always creates a NEW version. This preserves the accepted history.
export async function POST(request: Request, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const quote = await prisma.quote.findUnique({ where: { id: context?.params?.id ?? '' }, include: { user: true, adminQuotations: true } })
    if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    const versions = (quote as any)?.adminQuotations ?? []
    const current = pickCurrentVersion(versions)
    // Never let this endpoint edit a version that has already gone out to the customer.
    if (current && ['SENT', 'ACCEPTED', 'REJECTED'].includes(String(current?.status ?? ''))) {
      return NextResponse.json({ error: 'This quotation has already been sent. Use Revise Quotation to create a new version.', code: 'USE_REVISE' }, { status: 409 })
    }
    const approve = body?.action === 'approve'
    const overrideReason = String(body?.overrideReason ?? '').trim()
    const { data, finalPrice, suggested } = await buildQuotationData(body, quote, session?.user?.id ?? null)
    const validUntil = dateOrNull(body?.validUntil)
    const extra: any = {
      validUntil: validUntil ?? current?.validUntil ?? null,
      includedServices: body?.includedServices !== undefined ? String(body?.includedServices ?? '') : (current?.includedServices ?? null),
      excludedServices: body?.excludedServices !== undefined ? String(body?.excludedServices ?? '') : (current?.excludedServices ?? null),
      internalNotes: body?.internalNotes !== undefined ? String(body?.internalNotes ?? '') : (current?.internalNotes ?? null),
    }
    const statusFields: any = { approvedBy: approve ? session?.user?.id ?? null : null, approvedAt: approve ? new Date() : null, sentAt: approve ? new Date() : null, status: approve ? 'SENT' : 'DRAFT' }
    let quotation: any
    if (current) {
      quotation = await prisma.adminQuotation.update({ where: { id: current?.id ?? '' }, data: { ...data, ...extra, ...statusFields } })
    } else {
      quotation = await prisma.adminQuotation.create({ data: { quoteId: quote?.id ?? '', versionNumber: 1, isCurrent: true, createdBy: session?.user?.id ?? null, ...data, ...extra, ...statusFields } })
    }
    // Record any deviation from the auto-suggested price as an audited override (auto-calc is a suggestion only).
    if (suggested != null && suggested > 0 && Math.abs(suggested - finalPrice) > 0.01) {
      await prisma.pricingOverride.create({ data: { quoteId: quote?.id ?? '', field: 'finalPrice', originalValue: suggested.toFixed(2), newValue: finalPrice.toFixed(2), reason: overrideReason || 'Manual adjustment to suggested price.', userId: session?.user?.id ?? null } }).catch((e: unknown) => console.error(e))
      await prisma.auditLog.create({ data: { entityType: 'Quote', entityId: quote?.id ?? '', action: 'price-override', actorId: session?.user?.id ?? null, detailsJson: { suggested, finalPrice, currency: data?.currency, reason: overrideReason } } }).catch((e: unknown) => console.error(e))
    }
    await prisma.auditLog.create({ data: { entityType: 'AdminQuotation', entityId: quotation?.id ?? '', action: approve ? 'approve-send' : 'save-draft', actorId: session?.user?.id ?? null, detailsJson: { quoteId: quote?.id ?? '', versionNumber: quotation?.versionNumber, finalPrice, currency: data?.currency } } }).catch((e: unknown) => console.error(e))
    if (approve) { await prisma.quote.update({ where: { id: quote?.id ?? '' }, data: { status: 'QUOTED', needsReapproval: false } }); await prisma.notification.create({ data: { userId: quote?.userId ?? '', type: 'QUOTE_READY', message: `Your quotation ${quote?.reference ?? ''} is ready for review.` } }); await emailQuoteReady(quote?.user, quote, quotation).catch((error: unknown) => console.error(error)) }
    return NextResponse.json({ quotation: serializeData(quotation) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to save quotation.' }, { status: 500 }) }
}
