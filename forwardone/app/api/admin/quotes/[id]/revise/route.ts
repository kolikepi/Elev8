import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { emailQuoteReady } from '@/lib/email'
import { buildQuotationData } from '@/lib/quotation-build'
import { pickCurrentVersion, sortVersions, nextVersionNumber } from '@/lib/quotation-versions'

export const dynamic = 'force-dynamic'
const dateOrNull = (v: unknown): Date | null => { if (!v) return null; const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d }

// Sprint 2.2.1 Phase B — Revise Quotation. Creates / edits a NEW draft version of an already-sent quotation
// and, on send, makes it the current customer-facing version (needsReapproval => booking blocked until the
// customer accepts it). The previously accepted version is NEVER overwritten. A revision reason is required.
export async function POST(request: Request, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const action = body?.action === 'send' ? 'send' : 'draft'
    const revisionReason = String(body?.revisionReason ?? '').trim()
    if (!revisionReason) return NextResponse.json({ error: 'A revision reason is required.' }, { status: 400 })
    const quote = await prisma.quote.findUnique({ where: { id: context?.params?.id ?? '' }, include: { user: true, adminQuotations: true } })
    if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    const versions = (quote as any)?.adminQuotations ?? []
    // A revision only makes sense once an initial quotation has actually been sent.
    const hasSent = versions.some((v: any) => ['SENT', 'ACCEPTED', 'REJECTED'].includes(String(v?.status ?? '')))
    if (!hasSent) return NextResponse.json({ error: 'There is no sent quotation to revise yet.', code: 'NOTHING_TO_REVISE' }, { status: 409 })
    // The version this revision supersedes (for the audit diff + customer "what changed").
    const previousHead = pickCurrentVersion(versions)
    // Reuse an in-progress revision draft if one exists, otherwise start a new version number.
    const existingDraft = sortVersions(versions.filter((v: any) => String(v?.status ?? '') === 'DRAFT'))[0] ?? null

    const { data, finalPrice, suggested } = await buildQuotationData(body, quote, session?.user?.id ?? null)
    const validUntil = dateOrNull(body?.validUntil)
    const extra: any = {
      revisionReason,
      validUntil: validUntil ?? previousHead?.validUntil ?? null,
      includedServices: body?.includedServices !== undefined ? String(body?.includedServices ?? '') : (previousHead?.includedServices ?? null),
      excludedServices: body?.excludedServices !== undefined ? String(body?.excludedServices ?? '') : (previousHead?.excludedServices ?? null),
      internalNotes: body?.internalNotes !== undefined ? String(body?.internalNotes ?? '') : (existingDraft?.internalNotes ?? null),
    }

    let version: any
    if (existingDraft) {
      version = await prisma.adminQuotation.update({ where: { id: existingDraft?.id ?? '' }, data: { ...data, ...extra } })
    } else {
      const vn = nextVersionNumber(versions)
      version = await prisma.adminQuotation.create({ data: { quoteId: quote?.id ?? '', versionNumber: vn, isCurrent: false, createdBy: session?.user?.id ?? null, status: 'DRAFT', ...data, ...extra } })
    }

    // Audited price override vs the auto-suggested rate (auto-calc is only a suggestion).
    if (suggested != null && suggested > 0 && Math.abs(suggested - finalPrice) > 0.01) {
      await prisma.pricingOverride.create({ data: { quoteId: quote?.id ?? '', field: 'finalPrice', originalValue: suggested.toFixed(2), newValue: finalPrice.toFixed(2), reason: revisionReason, userId: session?.user?.id ?? null } }).catch((e: unknown) => console.error(e))
    }

    if (action === 'send') {
      const now = new Date()
      // The revised version becomes the single current customer-facing head.
      await prisma.$transaction([
        prisma.adminQuotation.updateMany({ where: { quoteId: quote?.id ?? '', NOT: { id: version?.id ?? '' } }, data: { isCurrent: false } }),
        prisma.adminQuotation.update({ where: { id: version?.id ?? '' }, data: { isCurrent: true, status: 'SENT', approvedBy: session?.user?.id ?? null, approvedAt: now, sentAt: now } }),
        // Booking is blocked until the customer accepts the revised version. The previous accepted version
        // stays ACCEPTED in its own row (booking would reference it only once re-approval clears).
        prisma.quote.update({ where: { id: quote?.id ?? '' }, data: { needsReapproval: true } }),
        // Extra offers are a single replace-all set per quote; keep them attached to the new current head so
        // the customer keeps seeing every alternative offer after a revision (and the accept flow resolves them).
        prisma.quoteOption.updateMany({ where: { quoteId: quote?.id ?? '' }, data: { adminQuotationId: version?.id ?? null } }),
      ])
      // Field-level audit diff (previous head vs revised) — never overwrite historical records.
      const diffFields = ['carrierSelected', 'serviceSelected', 'finalTransitTime', 'carrierCost', 'fuelSurcharge', 'markupPct', 'discountPct', 'vatPct', 'subtotal', 'finalPrice', 'currency', 'validUntil']
      const changed: any[] = []
      for (const f of diffFields) { const prevV = String((previousHead as any)?.[f] ?? ''); const newV = String((version as any)?.[f] ?? ''); if (prevV !== newV) changed.push({ field: f, previous: prevV, new: newV }) }
      await prisma.auditLog.create({ data: { entityType: 'AdminQuotation', entityId: version?.id ?? '', action: 'revision-sent', actorId: session?.user?.id ?? null, detailsJson: { quoteId: quote?.id ?? '', versionNumber: version?.versionNumber, previousVersionNumber: previousHead?.versionNumber ?? null, revisionReason, changed, needsReapprovalTriggered: true } } }).catch((e: unknown) => console.error(e))
      await prisma.notification.create({ data: { userId: quote?.userId ?? '', type: 'QUOTE_REVISED', message: `Updated quotation for ${quote?.reference ?? ''} — action required.` } }).catch((e: unknown) => console.error(e))
      await emailQuoteReady(quote?.user, quote, version).catch((error: unknown) => console.error(error))
    } else {
      await prisma.auditLog.create({ data: { entityType: 'AdminQuotation', entityId: version?.id ?? '', action: 'revision-draft', actorId: session?.user?.id ?? null, detailsJson: { quoteId: quote?.id ?? '', versionNumber: version?.versionNumber, revisionReason, finalPrice, currency: data?.currency } } }).catch((e: unknown) => console.error(e))
    }
    return NextResponse.json({ quotation: serializeData(version) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to revise quotation.' }, { status: 500 }) }
}
