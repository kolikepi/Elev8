import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

async function guard() { const session = await getServerSession(authOptions); if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return null; return session }
const str = (v: unknown): string => String(v ?? '').trim()
const strOrNull = (v: unknown): string | null => { const s = str(v); return s ? s : null }
const KINDS = ['SENDER', 'RECEIVER', 'BILLING']
const kindOrNull = (v: unknown): string | null => { const s = str(v).toUpperCase(); return KINDS.includes(s) ? s : null }

export async function PATCH(request: Request, { params }: { params: { id: string; addressId: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const { id: userId, addressId } = params ?? {}
    const current = await prisma.address.findUnique({ where: { id: addressId ?? '' }, select: { id: true, userId: true } })
    if (!current || current.userId !== userId) return NextResponse.json({ error: 'Address not found.' }, { status: 404 })
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const data: Record<string, unknown> = {}
    for (const f of ['label', 'name', 'addressLine1', 'country', 'city'] as const) { if (body?.[f] !== undefined) { const v = str(body?.[f]); if (!v) return NextResponse.json({ error: `${f} cannot be empty.` }, { status: 400 }); data[f] = v } }
    for (const f of ['company', 'addressLine2', 'state', 'zip'] as const) { if (body?.[f] !== undefined) data[f] = strOrNull(body?.[f]) }
    if (body?.phone !== undefined) data.phone = str(body?.phone)
    if (body?.email !== undefined) data.email = str(body?.email)
    if (body?.kind !== undefined) data.kind = kindOrNull(body?.kind)
    if (body?.isFavorite !== undefined) data.isFavorite = !!body?.isFavorite
    const address = await prisma.address.update({ where: { id: addressId }, data })
    return NextResponse.json({ address: serializeData(address) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to update the address.' }, { status: 500 }) }
}

export async function DELETE(_request: Request, { params }: { params: { id: string; addressId: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const { id: userId, addressId } = params ?? {}
    const current = await prisma.address.findUnique({ where: { id: addressId ?? '' }, select: { id: true, userId: true } })
    if (!current || current.userId !== userId) return NextResponse.json({ error: 'Address not found.' }, { status: 404 })
    await prisma.address.delete({ where: { id: addressId } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to delete the address.' }, { status: 500 }) }
}
