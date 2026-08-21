import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'
const num = (value: unknown): number => Math.max(0, Number(value ?? 0) || 0)
const SERVICE = ['EXPRESS_COURIER', 'ECONOMY_COURIER', 'ROAD_FREIGHT']
async function guard() { const session = await getServerSession(authOptions); if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return null; return session }

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try { const templates = await prisma.quotationTemplate.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }); return NextResponse.json({ templates: serializeData(templates) }) }
  catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load templates.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const serviceType = SERVICE.includes(String(body?.serviceType)) ? String(body?.serviceType) : 'EXPRESS_COURIER'
    const template = await prisma.quotationTemplate.create({ data: { name: String(body?.name ?? 'Untitled template'), carrier: String(body?.carrier ?? 'Road Freight'), serviceType: serviceType as any, fuelSurcharge: num(body?.fuelSurcharge), documentationFee: num(body?.documentationFee), markupPct: num(body?.markupPct), vatPct: num(body?.vatPct), notes: body?.notes ? String(body?.notes) : null, isActive: body?.isActive !== false } })
    return NextResponse.json({ template: serializeData(template) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to create template.' }, { status: 500 }) }
}
