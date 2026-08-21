import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'
const num = (value: unknown): number => Math.max(0, Number(value ?? 0) || 0)
const SERVICE = ['EXPRESS_COURIER', 'ECONOMY_COURIER', 'ROAD_FREIGHT']
async function guard() { const session = await getServerSession(authOptions); if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return null; return session }

export async function PATCH(request: Request, context: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const data: Record<string, unknown> = {}
    if (body?.name != null) data.name = String(body?.name)
    if (body?.originCountry != null) data.originCountry = String(body?.originCountry)
    if (body?.destCountry != null) data.destCountry = String(body?.destCountry)
    if (body?.zone !== undefined) data.zone = body?.zone ? String(body?.zone) : null
    if (body?.serviceType != null && SERVICE.includes(String(body?.serviceType))) data.serviceType = String(body?.serviceType)
    if (body?.weightFrom != null) data.weightFrom = num(body?.weightFrom)
    if (body?.weightTo != null) data.weightTo = num(body?.weightTo)
    if (body?.ratePerKg != null) data.ratePerKg = num(body?.ratePerKg)
    if (body?.minCharge != null) data.minCharge = num(body?.minCharge)
    if (body?.currency != null) data.currency = String(body?.currency)
    if (body?.transitDays !== undefined) data.transitDays = body?.transitDays ? String(body?.transitDays) : null
    if (body?.notes !== undefined) data.notes = body?.notes ? String(body?.notes) : null
    if (body?.isActive != null) data.isActive = Boolean(body?.isActive)
    const matrix = await prisma.priceMatrix.update({ where: { id: context?.params?.id ?? '' }, data })
    return NextResponse.json({ matrix: serializeData(matrix) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to update price matrix.' }, { status: 500 }) }
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try { await prisma.priceMatrix.delete({ where: { id: context?.params?.id ?? '' } }); return NextResponse.json({ ok: true }) }
  catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to delete price matrix.' }, { status: 500 }) }
}
