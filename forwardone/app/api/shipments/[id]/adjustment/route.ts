import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { audit, str } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

// Customer: approve or reject an additional charge (adjustment) that requires their approval.
// Ownership is enforced — a customer can only act on their own shipment's adjustments.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const adjustmentId = str(body?.adjustmentId)
    const decision = str(body?.decision).toUpperCase() // APPROVE | REJECT
    if (!['APPROVE', 'REJECT'].includes(decision)) return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 })

    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId }, select: { id: true, userId: true, trackingNumber: true } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })
    if (shipment?.userId !== session?.user?.id && session?.user?.role !== 'ADMINISTRATOR')
      return NextResponse.json({ error: 'You do not have access to this shipment.' }, { status: 403 })

    const existing = await prisma.shipmentAdjustment.findFirst({ where: { id: adjustmentId, shipmentId } })
    if (!existing) return NextResponse.json({ error: 'Charge not found.' }, { status: 404 })
    if (!existing?.requiresCustomerApproval || existing?.customerApprovalStatus !== 'PENDING')
      return NextResponse.json({ error: 'This charge is no longer awaiting your approval.' }, { status: 409 })

    const approved = decision === 'APPROVE'
    const adjustment = await prisma.shipmentAdjustment.update({
      where: { id: adjustmentId },
      data: {
        customerApprovalStatus: approved ? 'APPROVED' : 'REJECTED',
        status: approved ? 'APPLIED' : 'REJECTED',
        decidedAt: new Date(),
      },
    })

    // Clear the action flag if no other charge is still awaiting approval.
    const stillPending = await prisma.shipmentAdjustment.count({ where: { shipmentId, requiresCustomerApproval: true, customerApprovalStatus: 'PENDING' } })
    if (stillPending === 0) {
      await prisma.shipment.update({ where: { id: shipmentId }, data: { actionRequired: false, actionType: null, actionMessage: null } }).catch((e: unknown) => console.error(e))
    }

    await audit('Shipment', shipmentId, 'adjustment-customer-decision', session?.user?.id, { adjustmentId, decision })
    return NextResponse.json({ adjustment: serializeData(adjustment) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to record your decision.' }, { status: 500 })
  }
}
