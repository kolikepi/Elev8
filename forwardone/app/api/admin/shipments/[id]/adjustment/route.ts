import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit, str, strOrNull } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

const dec = (v: unknown): number => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0 }

// Admin: create an additional / revised charge (adjustment) on a shipment.
// Adjustments are separate from the accepted quotation — the original quote/price is never overwritten.
// carrierCostAdjustment is internal only; customerSellingAdjustment is what the customer sees.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    const adjustmentType = str(body?.adjustmentType)
    if (!adjustmentType) return NextResponse.json({ error: 'An adjustment type is required.' }, { status: 400 })
    const requiresCustomerApproval = body?.requiresCustomerApproval === true
    const customerSellingAdjustment = dec(body?.customerSellingAdjustment)

    const adjustment = await prisma.shipmentAdjustment.create({
      data: {
        shipmentId,
        adjustmentType,
        description: strOrNull(body?.description),
        customerReason: strOrNull(body?.customerReason),
        carrierCostAdjustment: dec(body?.carrierCostAdjustment),
        customerSellingAdjustment,
        currency: strOrNull(body?.currency) ?? 'EUR',
        status: requiresCustomerApproval ? 'PENDING_APPROVAL' : 'APPLIED',
        requiresCustomerApproval,
        customerApprovalStatus: requiresCustomerApproval ? 'PENDING' : null,
        createdBy: session?.user?.id ?? null,
      },
    })

    if (requiresCustomerApproval) {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { actionRequired: true, actionType: 'CHARGE_APPROVAL', actionMessage: 'An additional charge needs your approval.' },
      })
      await prisma.notification.create({
        data: {
          userId: shipment?.userId ?? '',
          type: 'SHIPMENT_CHARGE',
          message: `An additional charge of ${adjustment?.currency} ${customerSellingAdjustment.toFixed(2)} needs your approval for shipment ${shipment?.trackingNumber ?? ''}.`,
        },
      }).catch((e: unknown) => console.error(e))
    }

    await audit('Shipment', shipmentId, 'adjustment-created', session?.user?.id, {
      adjustmentId: adjustment?.id, adjustmentType, requiresCustomerApproval, customerSellingAdjustment,
    })
    return NextResponse.json({ adjustment: serializeData(adjustment) }, { status: 201 })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to create adjustment.' }, { status: 500 })
  }
}

// Admin: update an adjustment status (e.g. cancel a draft, mark applied).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const adjustmentId = str(body?.adjustmentId)
    const nextStatus = str(body?.status)
    const allowed = ['DRAFT', 'PENDING_APPROVAL', 'APPLIED', 'CANCELLED', 'REJECTED']
    if (!allowed.includes(nextStatus)) return NextResponse.json({ error: 'Invalid adjustment status.' }, { status: 400 })
    const existing = await prisma.shipmentAdjustment.findFirst({ where: { id: adjustmentId, shipmentId } })
    if (!existing) return NextResponse.json({ error: 'Adjustment not found.' }, { status: 404 })
    const adjustment = await prisma.shipmentAdjustment.update({
      where: { id: adjustmentId },
      data: { status: nextStatus, decidedAt: new Date() },
    })
    await audit('Shipment', shipmentId, 'adjustment-updated', session?.user?.id, { adjustmentId, status: nextStatus })
    return NextResponse.json({ adjustment: serializeData(adjustment) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to update adjustment.' }, { status: 500 })
  }
}
