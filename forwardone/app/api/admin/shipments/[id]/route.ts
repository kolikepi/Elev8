import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit, str, strOrNull, decOrNull } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

// Admin: manage the operational fields of a shipment/job that are NOT part of the auto-inherited quote
// snapshot — the internal carrier, the AWB / tracking number, and free-text operational notes. Carrier
// service and carrier cost live on the dedicated /actual route. Nothing here is exposed to customers
// except awbNumber (AWB/tracking is customer-facing per the operations spec). We never touch the quoted /
// booked / accepted-price snapshots, so the QUOTED vs BOOKED vs ACTUAL history stays intact.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    const data: any = {}
    if (body?.awbNumber !== undefined) data.awbNumber = strOrNull(body?.awbNumber)
    if (body?.operationalNotes !== undefined) data.operationalNotes = strOrNull(body?.operationalNotes)
    if (body?.carrier !== undefined) { const c = str(body?.carrier); if (c) data.carrier = c }
    if (body?.sellingPrice !== undefined) data.sellingPrice = decOrNull(body?.sellingPrice)
    if (body?.sellingCurrency !== undefined) data.sellingCurrency = strOrNull(body?.sellingCurrency)

    if (!Object.keys(data).length) return NextResponse.json({ error: 'No fields provided.' }, { status: 400 })

    const updated = await prisma.shipment.update({ where: { id: shipmentId }, data })
    await audit('Shipment', shipmentId, 'operational-fields-updated', session?.user?.id, { fields: Object.keys(data) })
    return NextResponse.json({ shipment: serializeData(updated) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to update shipment.' }, { status: 500 })
  }
}
