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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const addresses = await prisma.address.findMany({ where: { userId: params?.id ?? '' }, orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }] })
    return NextResponse.json({ addresses: serializeData(addresses) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load addresses.' }, { status: 500 }) }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const userId = params?.id ?? ''
    const owner = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
    if (!owner || owner.role === 'ADMINISTRATOR') return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const label = str(body?.label); const name = str(body?.name); const addressLine1 = str(body?.addressLine1)
    const country = str(body?.country); const city = str(body?.city)
    if (!label || !name || !addressLine1 || !country || !city) return NextResponse.json({ error: 'Label, name, address, city and country are required.' }, { status: 400 })
    const address = await prisma.address.create({
      data: {
        userId, label, name, addressLine1, country, city,
        company: strOrNull(body?.company), addressLine2: strOrNull(body?.addressLine2),
        state: strOrNull(body?.state), zip: strOrNull(body?.zip),
        phone: str(body?.phone), email: str(body?.email),
        kind: kindOrNull(body?.kind), isFavorite: !!body?.isFavorite,
      },
    })
    return NextResponse.json({ address: serializeData(address) }, { status: 201 })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to save the address.' }, { status: 500 }) }
}
