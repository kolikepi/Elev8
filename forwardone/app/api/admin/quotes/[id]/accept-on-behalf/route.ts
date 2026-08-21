import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, audit } from '@/lib/admin-api'
import { serializeData } from '@/lib/serialize'
import { emailQuoteAccepted } from '@/lib/email'
import { pickCurrentVersion, isExpired } from '@/lib/quotation-versions'

export const dynamic = 'force-dynamic'

const SOURCES = ['WHATSAPP', 'EMAIL', 'PHONE']

// Admin accepts a quotation ON BEHALF OF the customer when the customer confirmed an offer externally
// (WhatsApp / email / phone). This reuses the EXACT same acceptance mutations as the customer decision
// (PATCH /api/quotes/[id]) so booking → shipment → invoice downstream is byte-for-byte identical. The only
// additions are the audit-trail fields recorded on the Quote (who confirmed, when, source, note/reference).
export async function POST(request: Request, context: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const quote = await prisma.quote.findUnique({ where: { id: context?.params?.id ?? '' }, include: { adminQuotations: true, quoteOptions: true, user: { select: { name: true, email: true } } } })
    if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    const body = await request?.json?.().catch?.(() => ({})) ?? {}

    const source = SOURCES.includes(String(body?.source ?? '').toUpperCase()) ? String(body?.source).toUpperCase() : null
    if (!source) return NextResponse.json({ error: 'A confirmation source (WhatsApp, Email or Phone) is required.' }, { status: 400 })

    const versions = (quote as any)?.adminQuotations ?? []
    const current = pickCurrentVersion(versions)
    // The decision applies to the CURRENT head version, and only while it is SENT/APPROVED — exactly the
    // same rule the customer decision enforces.
    if (!current || !['SENT', 'APPROVED'].includes(String(current?.status ?? ''))) return NextResponse.json({ error: 'This quotation is not ready to be accepted. Send or approve the quotation first.' }, { status: 409 })

    const optionId = String(body?.optionId ?? '').trim() || null
    const allOptions = (quote as any)?.quoteOptions ?? []
    const chosenOption = optionId ? allOptions.find((o: any) => o?.id === optionId) : null
    if (optionId && !chosenOption) return NextResponse.json({ error: 'The selected offer is no longer available. Please refresh and try again.' }, { status: 409 })

    const now = new Date()
    const expired = isExpired(current)

    // If an extra offer was chosen, resolve it into the AdminQuotation head and flag it as selected —
    // identical to the customer accept path.
    if (chosenOption) {
      await prisma.adminQuotation.update({ where: { id: current?.id ?? '' }, data: { finalPrice: chosenOption?.sellingPrice ?? current?.finalPrice, carrierSelected: chosenOption?.carrierName ?? current?.carrierSelected, serviceSelected: chosenOption?.carrierService ?? chosenOption?.serviceName ?? current?.serviceSelected, finalTransitTime: chosenOption?.transitTime ?? current?.finalTransitTime, currency: chosenOption?.currency ?? current?.currency } })
      await prisma.quoteOption.updateMany({ where: { quoteId: quote?.id ?? '' }, data: { isSelected: false } })
      await prisma.quoteOption.update({ where: { id: chosenOption?.id ?? '' }, data: { isSelected: true } })
    } else {
      await prisma.quoteOption.updateMany({ where: { quoteId: quote?.id ?? '' }, data: { isSelected: false } })
    }

    const acceptedQuotation = await prisma.adminQuotation.update({ where: { id: current?.id ?? '' }, data: { status: 'ACCEPTED', acceptedAt: now } })
    await prisma.quote.update({ where: { id: quote?.id ?? '' }, data: {
      status: 'ACCEPTED', needsReapproval: false,
      acceptedOnBehalf: true, acceptedByAdminId: session?.user?.id ?? null, acceptedOnBehalfAt: now,
      acceptanceSource: source, acceptanceReference: body?.reference ? String(body?.reference) : null, acceptanceNote: body?.note ? String(body?.note) : null,
    } })
    await audit('AdminQuotation', current?.id ?? '', 'admin-accept-on-behalf', session?.user?.id, { quoteId: quote?.id ?? '', versionNumber: current?.versionNumber, finalPrice: String(acceptedQuotation?.finalPrice ?? ''), currency: acceptedQuotation?.currency ?? 'EUR', selectedOptionId: chosenOption?.id ?? null, source, reference: body?.reference ? String(body?.reference) : null, acceptedWhileExpired: expired })
    try { await emailQuoteAccepted((quote as any)?.user, quote, acceptedQuotation) } catch (e) { console.error('emailQuoteAccepted failed', e) }

    const updated = await prisma.quote.findUnique({ where: { id: quote?.id ?? '' } })
    return NextResponse.json({ quote: serializeData(updated) })
  } catch (error: unknown) { console.error('accept-on-behalf error:', error); return NextResponse.json({ error: 'Unable to accept the quotation.' }, { status: 500 }) }
}
