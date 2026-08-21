import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

// Shared, carrier-agnostic country master used by every address / quote / booking form.
// Active-only. Returns names + ISO / calling / currency codes only (no sensitive data).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const where: any = { isActive: true }
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { iso2: { contains: q, mode: 'insensitive' } }, { iso3: { contains: q, mode: 'insensitive' } }]
    const countries = await prisma.country.findMany({ where, orderBy: { name: 'asc' }, select: { id: true, name: true, iso2: true, iso3: true, callingCode: true, currency: true } })
    return NextResponse.json({ countries: serializeData(countries ?? []) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load countries.' }, { status: 500 }) }
}
