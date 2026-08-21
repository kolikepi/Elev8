import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { classifyBooking } from '@/lib/booking-impact'

export const dynamic = 'force-dynamic'

// Sprint 2.2.1 Phase A — customer submits FINAL BOOKING details after accepting a quotation.
// This endpoint stores booking data SEPARATELY in Quote.bookingJson and NEVER overwrites the original
// quote data (senderJson / receiverJson / weightKg / pieces stay exactly as quoted). It runs the Change
// Impact Engine to decide whether the accepted price still holds. When a change affects pricing or needs a
// commercial/compliance review it flags needsReapproval so the EXISTING admin recalculate + re-approve loop
// runs — no parallel pricing logic is introduced here.

// Only these booking-checklist confirmations can be satisfied by the customer. Documents, customs and DG
// requirements always stay with the administrator.
const CUSTOMER_CHECKLIST = ['senderComplete', 'receiverComplete', 'pickupAddressComplete', 'deliveryAddressComplete', 'contactsComplete', 'packagesConfirmed', 'dataUnchangedConfirmed'] as const

export async function POST(request: Request, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const id = String(context?.params?.id ?? '')
    const quote = await prisma.quote.findUnique({ where: { id }, include: { shipmentPieces: { orderBy: { pieceNumber: 'asc' } }, bookingChecklist: true } })
    if (!quote || quote?.userId !== session?.user?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    if (quote?.status === 'BOOKED') return NextResponse.json({ error: 'This shipment is already booked. Contact support to change details.' }, { status: 409 })
    if (quote?.status !== 'ACCEPTED') return NextResponse.json({ error: 'Booking details can only be completed after a quotation is accepted.' }, { status: 409 })

    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const booking = (body?.booking ?? {}) as any
    const action = body?.action === 'confirm' ? 'confirm' : 'save'

    // Classify the difference between the accepted quote and the submitted booking. Never mutate quote data.
    const { changes, overall } = classifyBooking(quote, booking)
    const needsReview = overall === 'RECALCULATION_REQUIRED' || overall === 'MANUAL_REVIEW_REQUIRED'

    const data: any = {
      bookingJson: JSON.parse(JSON.stringify(booking ?? {})),
      bookingImpact: overall,
      bookingChangesJson: JSON.parse(JSON.stringify(changes ?? [])),
    }
    if (action === 'confirm') {
      data.bookingSubmittedAt = new Date()
      // A price-affecting or compliance-sensitive change re-opens the existing re-approval workflow.
      if (needsReview) data.needsReapproval = true
    }

    const updated = await prisma.quote.update({ where: { id }, data })

    if (action === 'confirm') {
      // No price impact — auto-confirm the checklist items the customer is responsible for so the admin only
      // has to finish documents / customs / DG. A change that needs review leaves the checklist untouched.
      if (!needsReview) {
        const tick: Record<string, boolean> = {}
        for (const f of CUSTOMER_CHECKLIST) tick[f] = true
        await prisma.bookingChecklist.upsert({
          where: { quoteId: id },
          update: { ...tick, customerSubmittedAt: new Date() },
          create: { quoteId: id, ...tick, customerSubmittedAt: new Date() },
        })
      } else {
        await prisma.bookingChecklist.upsert({
          where: { quoteId: id },
          update: { customerSubmittedAt: new Date() },
          create: { quoteId: id, customerSubmittedAt: new Date() },
        })
      }

      // Notify the customer (friendly) and every administrator (operational).
      await prisma.notification.create({ data: { userId: quote?.userId ?? '', type: 'BOOKING_DETAILS_SUBMITTED', message: `Booking details received for ${quote?.reference ?? ''}.` } }).catch((e) => console.error('customer booking notification failed', e))
      try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMINISTRATOR', isActive: true }, select: { id: true } })
        if (admins?.length) await prisma.notification.createMany({ data: admins.map((a) => ({ userId: a?.id ?? '', type: 'BOOKING_SUBMITTED', message: `Booking details submitted for ${quote?.reference ?? ''}${needsReview ? ' — re-approval required.' : ' — ready for booking review.'}` })) })
      } catch (e) { console.error('admin booking notification failed', e) }

      // Single audit entry capturing who / when / every field / previous / new / impact.
      await prisma.auditLog.create({ data: { entityType: 'Quote', entityId: id, action: 'booking:submit', actorId: session?.user?.id ?? null, detailsJson: { overall, needsReapproval: needsReview, changes } } }).catch((e) => console.error('booking audit failed', e))
    } else {
      await prisma.auditLog.create({ data: { entityType: 'Quote', entityId: id, action: 'booking:save-draft', actorId: session?.user?.id ?? null, detailsJson: { overall, changes } } }).catch((e) => console.error('booking audit failed', e))
    }

    return NextResponse.json({ quote: serializeData({ id: updated?.id, status: updated?.status, bookingSubmittedAt: updated?.bookingSubmittedAt, needsReapproval: updated?.needsReapproval }), impact: overall, changes })
  } catch (error: unknown) { console.error('Booking submit error:', error); return NextResponse.json({ error: 'Unable to save booking details.' }, { status: 500 }) }
}
