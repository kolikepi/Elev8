import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

async function guard() { const session = await getServerSession(authOptions); if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return null; return session }
const strOrNull = (v: unknown): string | null => { const s = String(v ?? '').trim(); return s ? s : null }

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['CUSTOMER', 'BUSINESS_CUSTOMER'] } },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        billingLegalName: true, billingTradingName: true, billingTaxId: true, billingCountry: true,
        contactPerson: true, phone: true,
        organization: { select: { name: true } },
        quotes: { select: { id: true, reference: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users: serializeData(users) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load customers.' }, { status: 500 }) }
}

// Admin manually creates a customer in the unified Customer Master. Self-registered and admin-created
// customers live in the same User table (one customer database, no duplicates).
export async function POST(request: Request) {
  const session = await guard()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const role = body?.role === 'BUSINESS_CUSTOMER' ? 'BUSINESS_CUSTOMER' : 'CUSTOMER'
    if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'A name and a valid email are required.' }, { status: 400 })
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: 'A customer with this email already exists.' }, { status: 409 })

    // Admin does not set a password; assign a strong random one. The customer can use “forgot password”
    // to set their own later. Password is required on the model, so we always generate a hash.
    const provided = String(body?.password ?? '')
    const rawPassword = provided.length >= 8 ? provided : randomBytes(24).toString('base64url')
    const passwordHash = await bcrypt.hash(rawPassword, 12)

    let organizationId: string | null = null
    const companyName = String(body?.companyName ?? '').trim() || String(body?.billingTradingName ?? '').trim() || String(body?.billingLegalName ?? '').trim()
    if (role === 'BUSINESS_CUSTOMER' && companyName) {
      const organization = await prisma.organization.create({ data: { name: companyName, type: 'BUSINESS' } })
      organizationId = organization?.id ?? null
    }

    const user = await prisma.user.create({
      data: {
        name, email, passwordHash, role, organizationId,
        isActive: body?.isActive === false ? false : true,
        billingLegalName: strOrNull(body?.billingLegalName),
        billingTradingName: strOrNull(body?.billingTradingName),
        billingTaxId: strOrNull(body?.billingTaxId),
        billingAddress: strOrNull(body?.billingAddress),
        billingCountry: strOrNull(body?.billingCountry),
        billingCity: strOrNull(body?.billingCity),
        billingZip: strOrNull(body?.billingZip),
        billingPhone: strOrNull(body?.billingPhone),
        contactPerson: strOrNull(body?.contactPerson),
        phone: strOrNull(body?.phone),
      },
    })
    return NextResponse.json({ id: user?.id ?? '', role: user?.role ?? role }, { status: 201 })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to create the customer.' }, { status: 500 }) }
}
