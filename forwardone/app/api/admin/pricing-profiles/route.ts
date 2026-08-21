import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'
const num = (value: unknown): number => Math.max(0, Number(value ?? 0) || 0)
async function guard() { const session = await getServerSession(authOptions); if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return null; return session }

export async function GET(request: Request) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const userId = new URL(request?.url ?? '').searchParams?.get?.('userId') ?? ''
    if (userId) { const profile = await prisma.businessPricingProfile.findUnique({ where: { userId } }); return NextResponse.json({ profile: serializeData(profile) }) }
    const users = await prisma.user.findMany({ where: { role: 'BUSINESS_CUSTOMER' }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, createdAt: true, isActive: true, pricingProfile: true, organization: true } })
    return NextResponse.json({ users: serializeData(users) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load pricing profiles.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const userId = String(body?.userId ?? '')
    if (!userId) return NextResponse.json({ error: 'A customer is required.' }, { status: 400 })
    const data = { preferredCarrier: body?.preferredCarrier ? String(body?.preferredCarrier) : null, preferredService: body?.preferredService ? String(body?.preferredService) : null, preferredCurrency: String(body?.preferredCurrency ?? 'EUR'), discountPct: num(body?.discountPct), creditDays: Math.round(num(body?.creditDays)), creditLimit: num(body?.creditLimit), paymentTerms: body?.paymentTerms ? String(body?.paymentTerms) : null, specialNotes: body?.specialNotes ? String(body?.specialNotes) : null }
    const profile = await prisma.businessPricingProfile.upsert({ where: { userId }, update: data, create: { userId, ...data } })
    return NextResponse.json({ profile: serializeData(profile) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to save pricing profile.' }, { status: 500 }) }
}
