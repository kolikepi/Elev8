import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit, str, strOrNull } from '@/lib/admin-api'
import { amendmentModeFor, classifyAmendment } from '@/lib/shipment-lifecycle'

export const dynamic = 'force-dynamic'

// Admin: raise a post-booking amendment.
// Before collection -> BOOKING_AMENDMENT. After collection -> SHIPMENT_AMENDMENT. Delivered -> LOCKED (rejected).
// Direct edits to the shipment record are never performed here; every change is captured as an auditable
// ShipmentAmendment with a classified price impact (reusing the Phase A change-impact philosophy).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    const mode = amendmentModeFor(shipment?.status)
    if (mode.mode === 'LOCKED')
      return NextResponse.json({ error: 'This shipment is delivered and can no longer be amended.' }, { status: 409 })

    // `changes` is a flat map of field -> { from, to }. Only differing fields are classified.
    const rawChanges = (body?.changes ?? {}) as Record<string, { from: unknown; to: unknown }>
    const classification = classifyAmendment(rawChanges)
    if (!classification.changes.length)
      return NextResponse.json({ error: 'No changes were provided to amend.' }, { status: 400 })

    const reason = strOrNull(body?.reason)
    // NO_PRICE_IMPACT amendments are applied immediately; anything with price impact is held for review.
    const status = classification.overall === 'NO_PRICE_IMPACT' ? 'APPLIED' : 'PENDING_REVIEW'

    const amendment = await prisma.shipmentAmendment.create({
      data: {
        shipmentId,
        amendmentType: mode.mode,
        phase: mode.phase,
        impact: classification.overall,
        changesJson: classification.changes as any,
        reason,
        createdBy: session?.user?.id ?? null,
        createdByRole: 'ADMINISTRATOR',
        status,
      },
    })

    // Flag the shipment for action when the amendment needs recalculation or manual review.
    if (classification.overall !== 'NO_PRICE_IMPACT') {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          actionRequired: true,
          actionType: 'AMENDMENT_REVIEW',
          actionMessage: 'An amendment is under commercial review.',
        },
      })
    }

    await audit('Shipment', shipmentId, 'amendment-created', session?.user?.id, {
      amendmentId: amendment?.id,
      amendmentType: mode.mode,
      phase: mode.phase,
      impact: classification.overall,
      fields: classification.changes.map((c) => c.field),
    })

    return NextResponse.json({ amendment: serializeData(amendment), classification: serializeData(classification) }, { status: 201 })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to raise amendment.' }, { status: 500 })
  }
}
