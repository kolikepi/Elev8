import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit, str, strOrNull, intOrNull } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

const decOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Admin: record the ACTUAL carrier data (weight, pieces, dimensions, cost, references, timestamps).
// This NEVER overwrites the quoted or booked snapshots — it is stored in dedicated actual* fields so the
// full QUOTED vs BOOKED vs ACTUAL history stays auditable. Actual carrier cost/reference are internal only.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    const data: any = {}
    if (body?.actualPieceCount !== undefined) data.actualPieceCount = intOrNull(body?.actualPieceCount)
    if (body?.actualWeightKg !== undefined) data.actualWeightKg = decOrNull(body?.actualWeightKg)
    if (body?.actualChargeableWeightKg !== undefined) data.actualChargeableWeightKg = decOrNull(body?.actualChargeableWeightKg)
    if (body?.actualDimensions !== undefined) data.actualDimensions = strOrNull(body?.actualDimensions)
    if (body?.actualCarrierService !== undefined) data.actualCarrierService = strOrNull(body?.actualCarrierService)
    if (body?.actualCarrierReference !== undefined) data.actualCarrierReference = strOrNull(body?.actualCarrierReference)
    if (body?.actualCarrierCost !== undefined) data.actualCarrierCost = decOrNull(body?.actualCarrierCost)
    if (body?.actualCurrency !== undefined) data.actualCurrency = strOrNull(body?.actualCurrency)
    if (body?.actualCustomsOutcome !== undefined) data.actualCustomsOutcome = strOrNull(body?.actualCustomsOutcome)
    if (body?.actualPickupAt) data.actualPickupAt = new Date(String(body?.actualPickupAt))
    if (body?.actualDeliveryAt) data.actualDeliveryAt = new Date(String(body?.actualDeliveryAt))

    if (!Object.keys(data).length) return NextResponse.json({ error: 'No actual data provided.' }, { status: 400 })

    const updated = await prisma.shipment.update({ where: { id: shipmentId }, data })
    await audit('Shipment', shipmentId, 'actual-data-recorded', session?.user?.id, { fields: Object.keys(data) })
    return NextResponse.json({ shipment: serializeData(updated) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to record actual data.' }, { status: 500 })
  }
}
