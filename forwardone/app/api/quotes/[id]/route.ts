import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { emailQuoteAccepted } from '@/lib/email'
import { customerServiceLabel } from '@/lib/customer-service-label'
import { pickCurrentVersion, sortVersions, latestAcceptedVersion, customerSafeVersion, customerSafeHistory, previousVisibleVersion, customerWhatChanged, isExpired, buildCustomerOffers } from '@/lib/quotation-versions'
import { audit } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'
export async function GET(_request: Request, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const isAdminView = session?.user?.role === 'ADMINISTRATOR'
    const quote = await prisma.quote.findUnique({ where: { id: context?.params?.id ?? '' }, include: { user: { select: { name: true, email: true, role: true } }, files: true, adminQuotations: true, quoteOptions: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }, shipment: { include: { trackingEvents: { orderBy: { timestamp: 'desc' } } } } } })
    if (!quote || (!isAdminView && quote?.userId !== session?.user?.id)) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    // Sprint 2.2 Phase B — expose ONLY customer-safe weight fields from the calculation (never divisor, priority, costs, margin, comparison or breakdown).
    const calcSafe = await prisma.quoteCalculation.findUnique({ where: { quoteId: quote?.id ?? '' }, select: isAdminView ? undefined : { status: true, totalActualWeight: true, totalVolumetricWeight: true, totalChargeableWeight: true } })
    // Sprint 2.2.1 Phase B — resolve the quotation version chain. The current head drives the price/service
    // shown; booking always references the latest ACCEPTED version. Admins get the full chain (real carrier +
    // costs + revision reasons); customers only ever get the brand-free, cost-free current version + history.
    const versions = (quote as any)?.adminQuotations ?? []
    const current = pickCurrentVersion(versions)
    const latestAccepted = latestAcceptedVersion(versions)
    const shipmentOut = (!isAdminView && (quote as any)?.shipment) ? { ...(quote as any).shipment, carrier: customerServiceLabel((quote as any)?.shipment?.carrier) } : (quote as any)?.shipment
    const allOptions = (quote as any)?.quoteOptions ?? []
    // Extra offers that belong to the current head version (they travel with the version the customer decides on).
    const currentExtras = allOptions // single replace-all set per quote; always travels with the current head
    if (isAdminView) {
      const { adminQuotations, quoteOptions, ...rest } = quote as any
      return NextResponse.json({ quote: serializeData({ ...rest, shipment: shipmentOut, calculation: calcSafe, adminQuotation: current, latestAcceptedVersion: latestAccepted, quotationVersions: sortVersions(versions), quoteOptions: allOptions }) })
    }
    // Customer projection.
    const prev = previousVisibleVersion(versions, current)
    const whatChanged = customerWhatChanged(current, prev)
    const quotationOut = current ? { ...customerSafeVersion(current), quoteId: quote?.id ?? null, carrierSelected: null, expired: isExpired(current) } : null
    // Combined customer-facing offer list = primary (from head) + carrier-stripped extras. Single offer when no extras.
    const offers = buildCustomerOffers(current, currentExtras)
    const { adminQuotations, quoteOptions, ...restC } = quote as any
    return NextResponse.json({ quote: serializeData({ ...restC, shipment: shipmentOut, calculation: calcSafe, adminQuotation: quotationOut, offers, quotationHistory: customerSafeHistory(versions), whatChanged }) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load quote.' }, { status: 500 }) }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const quote = await prisma.quote.findUnique({ where: { id: context?.params?.id ?? '' }, include: { adminQuotations: true, quoteOptions: true, user: { select: { name: true, email: true } } } })
    if (!quote || quote?.userId !== session?.user?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const nextStatus = body?.status === 'ACCEPTED' ? 'ACCEPTED' : body?.status === 'REJECTED' ? 'REJECTED' : null
    const versions = (quote as any)?.adminQuotations ?? []
    const current = pickCurrentVersion(versions)
    // The customer decides on the CURRENT head version (initial quotation OR the latest revision awaiting
    // review). Decision is only possible while that head is SENT/APPROVED — accepted/rejected/draft heads
    // are not decidable. Version status drives this, not the coarse Quote.status.
    if (!nextStatus || !current || !['SENT','APPROVED'].includes(String(current?.status ?? ''))) return NextResponse.json({ error: 'This quotation is not ready for a decision.' }, { status: 409 })
    // Expired active quotations cannot be accepted normally — the customer must request an updated quote.
    if (nextStatus === 'ACCEPTED' && isExpired(current)) return NextResponse.json({ error: 'This quotation has expired. Please request an updated quotation.', code: 'EXPIRED' }, { status: 409 })
    const now = new Date()
    const hadPriorAccepted = versions.some((v: any) => v?.id !== current?.id && String(v?.status ?? '') === 'ACCEPTED')
    // Multiple offers: the customer may pick an EXTRA QuoteOption instead of the primary offer. When they do,
    // we copy that option's selling values into the accepted AdminQuotation so ALL downstream logic (booking,
    // revise, reapproval) keeps reading the same fields exactly as before. optionId null/omitted => primary.
    const optionId = String(body?.optionId ?? '').trim() || null
    const allOptions = (quote as any)?.quoteOptions ?? []
    const chosenOption = optionId ? allOptions.find((o: any) => o?.id === optionId) : null
    if (nextStatus === 'ACCEPTED' && optionId && !chosenOption) return NextResponse.json({ error: 'The selected offer is no longer available. Please refresh and try again.' }, { status: 409 })
    if (nextStatus === 'ACCEPTED') {
      // If an extra offer was chosen, resolve it into the AdminQuotation head and flag it as selected.
      if (chosenOption) {
        await prisma.adminQuotation.update({ where: { id: current?.id ?? '' }, data: { finalPrice: chosenOption?.sellingPrice ?? current?.finalPrice, carrierSelected: chosenOption?.carrierName ?? current?.carrierSelected, serviceSelected: chosenOption?.carrierService ?? chosenOption?.serviceName ?? current?.serviceSelected, finalTransitTime: chosenOption?.transitTime ?? current?.finalTransitTime, currency: chosenOption?.currency ?? current?.currency } })
        await prisma.quoteOption.updateMany({ where: { quoteId: quote?.id ?? '' }, data: { isSelected: false } })
        await prisma.quoteOption.update({ where: { id: chosenOption?.id ?? '' }, data: { isSelected: true } })
      } else {
        // Primary offer chosen: clear any prior extra selection on this head.
        await prisma.quoteOption.updateMany({ where: { quoteId: quote?.id ?? '' }, data: { isSelected: false } })
      }
      // Accepting the current head: mark it ACCEPTED, clear re-approval, allow booking to proceed on this version.
      const acceptedQuotation = await prisma.adminQuotation.update({ where: { id: current?.id ?? '' }, data: { status: 'ACCEPTED', acceptedAt: now } })
      await prisma.quote.update({ where: { id: quote?.id ?? '' }, data: { status: 'ACCEPTED', needsReapproval: false } })
      await audit('AdminQuotation', current?.id ?? '', 'customer-accept', session?.user?.id, { quoteId: quote?.id ?? '', versionNumber: current?.versionNumber, finalPrice: String(acceptedQuotation?.finalPrice ?? ''), currency: acceptedQuotation?.currency ?? 'EUR', selectedOptionId: chosenOption?.id ?? null })
      try { await emailQuoteAccepted((quote as any)?.user, quote, acceptedQuotation) } catch (e) { console.error('emailQuoteAccepted failed', e) }
    } else {
      // Rejecting the current head: mark it REJECTED, preserve every earlier version untouched.
      await prisma.adminQuotation.update({ where: { id: current?.id ?? '' }, data: { status: 'REJECTED', rejectedAt: now } })
      // If an earlier version was already accepted, keep the quote in ACCEPTED lineage but block booking via
      // needsReapproval (the customer rejected the revised price). Otherwise the whole quote is rejected.
      if (hadPriorAccepted) await prisma.quote.update({ where: { id: quote?.id ?? '' }, data: { needsReapproval: true } })
      else await prisma.quote.update({ where: { id: quote?.id ?? '' }, data: { status: 'REJECTED' } })
      await audit('AdminQuotation', current?.id ?? '', 'customer-reject', session?.user?.id, { quoteId: quote?.id ?? '', versionNumber: current?.versionNumber, hadPriorAccepted })
      // Notify administrators a revised quotation was declined so they can revise / cancel / discuss.
      try { const admins = await prisma.user.findMany({ where: { role: 'ADMINISTRATOR', isActive: true }, select: { id: true } }); if (admins?.length) await prisma.notification.createMany({ data: admins.map((a) => ({ userId: a?.id ?? '', type: 'QUOTE_REJECTED', message: `Quotation ${quote?.reference ?? ''} (V${current?.versionNumber ?? 1}) was declined by the customer.` })) }) } catch (e) { console.error('admin reject notification failed', e) }
    }
    const updated = await prisma.quote.findUnique({ where: { id: quote?.id ?? '' } })
    return NextResponse.json({ quote: serializeData(updated) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to update quote.' }, { status: 500 }) }
}
