import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { audit, str, strOrNull } from '@/lib/admin-api'
import { isDeliveredLocked, isAfterCollection } from '@/lib/shipment-lifecycle'

export const dynamic = 'force-dynamic'

// Customer: request cancellation of a shipment. This does NOT cancel it directly — it raises a request
// that the ForwardOne team reviews (cancellation may not be possible once collected / in customs).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const reason = strOrNull(body?.reason)
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })
    if (shipment?.userId !== session?.user?.id) return NextResponse.json({ error: 'You do not have access to this shipment.' }, { status: 403 })
    if (isDeliveredLocked(shipment?.status)) return NextResponse.json({ error: 'This shipment has been delivered and can no longer be cancelled.' }, { status: 409 })

    const note = isAfterCollection(shipment?.status)
      ? 'Cancellation requested by customer after collection — review required (may not be possible).'
      : 'Cancellation requested by customer before collection.'

    // Record as an amendment (auditable) and notify the team. Admin decides the outcome.
    const amendment = await prisma.shipmentAmendment.create({
      data: {
        shipmentId,
        amendmentType: 'CANCELLATION_REQUEST',
        phase: isAfterCollection(shipment?.status) ? 'AFTER_COLLECTION' : 'BEFORE_COLLECTION',
        impact: 'MANUAL_REVIEW_REQUIRED',
        changesJson: [{ field: 'cancellation', label: 'Cancellation request', from: shipment?.status ?? '', to: 'CANCELLATION_REQUESTED', impact: 'MANUAL_REVIEW_REQUIRED' }] as any,
        reason: reason ?? note,
        createdBy: session?.user?.id ?? null,
        createdByRole: 'CUSTOMER',
        status: 'PENDING_REVIEW',
      },
    })

    await prisma.notification.create({
      data: { userId: shipment?.userId ?? '', type: 'SHIPMENT_UPDATE', message: `We have received your cancellation request for ${shipment?.trackingNumber ?? ''} and will be in touch shortly.` },
    }).catch((e: unknown) => console.error(e))

    await audit('Shipment', shipmentId, 'cancellation-requested', session?.user?.id, { amendmentId: amendment?.id, reason })
    return NextResponse.json({ amendment: serializeData(amendment), message: 'Your cancellation request has been received.' }, { status: 201 })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to submit cancellation request.' }, { status: 500 })
  }
}
