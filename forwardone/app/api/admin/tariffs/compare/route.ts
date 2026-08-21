import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/admin-api'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!(await guardAdmin())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const url = new URL(request.url)
    const a = url.searchParams.get('a') ?? ''
    const b = url.searchParams.get('b') ?? ''
    const [va, vb] = await Promise.all([
      prisma.tariffVersion.findUnique({ where: { id: a }, include: { rows: { orderBy: [{ zone: 'asc' }, { weightTo: 'asc' }] } } }),
      prisma.tariffVersion.findUnique({ where: { id: b }, include: { rows: { orderBy: [{ zone: 'asc' }, { weightTo: 'asc' }] } } }),
    ])
    return NextResponse.json({ a: serializeData(va), b: serializeData(vb) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to compare tariffs.' }, { status: 500 }) }
}
