import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const role = body?.role === 'BUSINESS_CUSTOMER' ? 'BUSINESS_CUSTOMER' : 'CUSTOMER'
    if (!name || !email || password?.length < 8) return NextResponse.json({ error: 'Name, valid email and an 8-character password are required.' }, { status: 400 })
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    const passwordHash = await bcrypt.hash(password, 12)
    let organizationId: string | null = null
    if (role === 'BUSINESS_CUSTOMER') {
      const companyName = String(body?.companyName ?? '').trim()
      if (!companyName) return NextResponse.json({ error: 'Company name is required for a business account.' }, { status: 400 })
      const organization = await prisma.organization.create({ data: { name: companyName, type: 'BUSINESS' } })
      organizationId = organization?.id ?? null
    }
    const user = await prisma.user.create({ data: { name, email, passwordHash, role, organizationId } })
    // Safely adopt any prior guest quotes submitted with this same email so the customer sees
    // their history immediately. Guest contact fields are preserved for audit; only ownership moves.
    try {
      await prisma.quote.updateMany({
        where: { isGuest: true, guestEmail: email, linkedToCustomerAt: null },
        data: { userId: user?.id ?? '', linkedToCustomerAt: new Date() },
      })
    } catch (linkError: unknown) { console.error('guest auto-link failed', linkError) }
    return NextResponse.json({ id: user?.id ?? '', role: user?.role ?? role }, { status: 201 })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to create your account.' }, { status: 500 }) }
}
