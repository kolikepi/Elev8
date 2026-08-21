import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

// Country-filtered region / state autocomplete backed by the shared region master.
// Shared location source reusable by Quote / Sender / Receiver / Booking / Address Book / Shipment.
// Free-typed values remain valid on the forms; this only assists selection.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const countryId = (searchParams.get('countryId') ?? '').trim()
    const where: any = { isActive: true }
    if (countryId) where.countryId = countryId
    if (q) where.name = { contains: q, mode: 'insensitive' }
    const regions = await prisma.region.findMany({ where, orderBy: { name: 'asc' }, take: 100, select: { id: true, name: true, code: true, countryId: true } })
    return NextResponse.json({ regions: serializeData(regions ?? []) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load regions.' }, { status: 500 }) }
}
