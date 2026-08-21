import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

// Postal / ZIP autocomplete + soft validation backed by the shared postal master.
// Free-typed codes remain valid; `matched` tells the form whether the code exists in the master.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const code = (searchParams.get('code') ?? '').trim()
    const countryId = (searchParams.get('countryId') ?? '').trim()
    const cityId = (searchParams.get('cityId') ?? '').trim()
    const where: any = { isActive: true }
    if (countryId) where.countryId = countryId
    if (cityId) where.cityId = cityId
    if (code) where.code = { contains: code, mode: 'insensitive' }
    const postalCodes = await prisma.postalCode.findMany({ where, orderBy: { code: 'asc' }, take: 50, select: { id: true, code: true, placeName: true, countryId: true, cityId: true, city: { select: { id: true, name: true } } } })
    const matched = code ? (postalCodes ?? []).some((p: any) => String(p?.code ?? '').toLowerCase() === code.toLowerCase()) : false
    return NextResponse.json({ postalCodes: serializeData(postalCodes ?? []), matched })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load postal codes.' }, { status: 500 }) }
}
