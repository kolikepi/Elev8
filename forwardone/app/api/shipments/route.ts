import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { emailShipmentDelivered } from '@/lib/email'
import { customerServiceLabel } from '@/lib/customer-service-label'
import { audit, str, strOrNull } from '@/lib/admin-api'
import { canTransition, isValidStatus, isDeliveredLocked, type ShipmentStatus } from '@/lib/shipment-lifecycle'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const isAdmin = session?.user?.role === 'ADMINISTRATOR'
    const shipments = await prisma.shipment.findMany({
      where: isAdmin ? {} : { userId: session?.user?.id ?? '' },
      include: {
        quote: { select: { reference: true, direction: true, weightKg: true, pieces: true, contentsType: true, serviceType: true, senderJson: true, receiverJson: true } },
        user: { select: { name: true, email: true } },
        trackingEvents: { orderBy: { timestamp: 'desc' } },
        amendments: { orderBy: { createdAt: 'desc' } },
        adjustments: { orderBy: { createdAt: 'desc' } },
        invoices: { select: { id: true, reference: true, status: true, total: true, currency: true }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    const safeShipments = isAdmin
      ? shipments
      : shipments.map((s: any) => ({
          ...s,
          carrier: customerServiceLabel(s?.carrier),
          // Never leak internal carrier cost / actual carrier reference to customers.
          actualCarrierCost: undefined,
          actualCarrierReference: undefined,
          actualCarrierService: undefined,
          bookedService: undefined,
          operationalNotes: undefined,
          // Customers never see internal invoice drafts; expose only finalized invoice status/total.
          invoices: (s?.invoices ?? []).filter((inv: any) => inv?.status === 'FINALIZED').map((inv: any) => ({ id: inv?.id, reference: inv?.reference, status: inv?.status, total: inv?.total, currency: inv?.currency })),
          // Sanitize the event feed: hide internal notes and prefer the customer-facing description.
          trackingEvents: (s?.trackingEvents ?? []).map((e: any) => ({
            id: e?.id,
            status: e?.status,
            location: e?.location,
            country: e?.country,
            description: e?.customerDescription || e?.description || '',
            timestamp: e?.timestamp,
            actionRequired: e?.actionRequired ?? false,
          })),
          adjustments: (s?.adjustments ?? []).filter((a: any) => a?.requiresCustomerApproval || a?.customerApprovalStatus).map((a: any) => ({
            id: a?.id,
            adjustmentType: a?.adjustmentType,
            description: a?.description,
            customerReason: a?.customerReason,
            customerSellingAdjustment: a?.customerSellingAdjustment,
            currency: a?.currency,
            status: a?.status,
            requiresCustomerApproval: a?.requiresCustomerApproval,
            customerApprovalStatus: a?.customerApprovalStatus,
            createdAt: a?.createdAt,
          })),
        }))
    return NextResponse.json({ shipments: serializeData(safeShipments) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to load shipments.' }, { status: 500 })
  }
}

// Admin: advance the shipment lifecycle and/or append a tracking event.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR')
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const shipmentId = str(body?.shipmentId)
    const nextStatus = str(body?.status)
    if (!isValidStatus(nextStatus)) return NextResponse.json({ error: 'Invalid shipment status.' }, { status: 400 })

    const current = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!current) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    const from = current?.status as ShipmentStatus
    // Delivered / financially closed / returned records are locked — no further lifecycle changes.
    if (isDeliveredLocked(from) && from !== nextStatus)
      return NextResponse.json({ error: 'This shipment is delivered and can no longer be modified.' }, { status: 409 })
    if (!canTransition(from, nextStatus as ShipmentStatus))
      return NextResponse.json({ error: `Cannot move a shipment from ${from} to ${nextStatus}.` }, { status: 409 })

    const customsSubStatus = strOrNull(body?.customsSubStatus)
    const actionRequired = body?.actionRequired === true
    const eventSource = str(body?.source) || 'MANUAL'

    const data: any = { status: nextStatus }
    if (body?.customsSubStatus !== undefined) data.customsSubStatus = customsSubStatus
    if (body?.actionRequired !== undefined) data.actionRequired = actionRequired
    if (body?.actionType !== undefined) data.actionType = strOrNull(body?.actionType)
    if (body?.actionMessage !== undefined) data.actionMessage = strOrNull(body?.actionMessage)
    if (nextStatus === 'DELIVERED') data.actualDeliveryAt = new Date()

    const shipment = await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        ...data,
        trackingEvents: {
          create: {
            status: nextStatus,
            location: str(body?.location),
            country: strOrNull(body?.country),
            description: str(body?.description),
            customerDescription: strOrNull(body?.customerDescription),
            internalDescription: strOrNull(body?.internalDescription),
            carrierStatusCode: strOrNull(body?.carrierStatusCode),
            source: eventSource,
            actionRequired,
          },
        },
      },
      include: { trackingEvents: { orderBy: { timestamp: 'desc' } }, user: { select: { name: true, email: true } } },
    })

    await audit('Shipment', shipmentId, 'status-change', session?.user?.id, { from, to: nextStatus, customsSubStatus, actionRequired, source: eventSource })

    if (nextStatus === 'DELIVERED') {
      try { await emailShipmentDelivered((shipment as any)?.user, shipment, (shipment as any)?.trackingEvents?.[0]) }
      catch (e) { console.error('emailShipmentDelivered failed', e) }
    }
    return NextResponse.json({ shipment: serializeData(shipment) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to update shipment.' }, { status: 500 })
  }
}
