import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

// Country-filtered city autocomplete backed by the shared city master.
// Free-typed values remain valid on the forms; this only assists selection.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const countryId = (searchParams.get('countryId') ?? '').trim()
    const regionId = (searchParams.get('regionId') ?? '').trim()
    const where: any = { isActive: true }
    if (countryId) where.countryId = countryId
    if (regionId) where.regionId = regionId
    if (q) where.name = { contains: q, mode: 'insensitive' }
    const cities = await prisma.city.findMany({ where, orderBy: { name: 'asc' }, take: 50, select: { id: true, name: true, countryId: true, regionId: true, region: { select: { id: true, name: true } } } })
    return NextResponse.json({ cities: serializeData(cities ?? []) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load cities.' }, { status: 500 }) }
}
