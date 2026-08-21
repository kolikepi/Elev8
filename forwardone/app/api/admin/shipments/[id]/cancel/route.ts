import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit, str, strOrNull } from '@/lib/admin-api'
import { isDeliveredLocked } from '@/lib/shipment-lifecycle'
import type { ShipmentStatus as PrismaShipmentStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Admin: cancel a shipment or start a return.
// action = 'CANCEL' -> CANCELLED ; action = 'RETURN' -> RETURN_IN_PROGRESS ; action = 'RETURNED' -> RETURNED.
// Delivered shipments cannot be cancelled (a return must be used instead).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const action = str(body?.action) || 'CANCEL'
    const reason = strOrNull(body?.reason)
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    let nextStatus = 'CANCELLED'
    let eventDesc = 'Shipment cancelled.'
    if (action === 'RETURN') { nextStatus = 'RETURN_IN_PROGRESS'; eventDesc = 'Return to sender started.' }
    else if (action === 'RETURNED') { nextStatus = 'RETURNED'; eventDesc = 'Shipment returned to sender.' }
    else if (action === 'CANCEL') {
      if (isDeliveredLocked(shipment?.status))
        return NextResponse.json({ error: 'A delivered shipment cannot be cancelled. Start a return instead.' }, { status: 409 })
    }

    const updated = await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: nextStatus as PrismaShipmentStatus,
        actionRequired: false,
        actionType: null,
        actionMessage: null,
        trackingEvents: { create: { status: nextStatus as PrismaShipmentStatus, location: shipment?.destination ?? '', description: eventDesc, customerDescription: eventDesc, source: 'MANUAL' } },
      },
      include: { trackingEvents: { orderBy: { timestamp: 'desc' } } },
    })

    await prisma.notification.create({
      data: { userId: shipment?.userId ?? '', type: 'SHIPMENT_UPDATE', message: `${eventDesc} (${shipment?.trackingNumber ?? ''})` },
    }).catch((e: unknown) => console.error(e))

    await audit('Shipment', shipmentId, 'cancellation', session?.user?.id, { action, nextStatus, reason })
    return NextResponse.json({ shipment: serializeData(updated) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to process cancellation.' }, { status: 500 })
  }
}
