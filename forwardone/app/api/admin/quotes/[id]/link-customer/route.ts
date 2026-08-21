import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { guardAdmin, audit, strOrNull } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

// Admin links a guest quote to the unified Customer Master. Two modes:
//  - mode 'existing': attach the guest quote to an existing CUSTOMER / BUSINESS_CUSTOMER.
//  - mode 'create'  : create a new customer from the preserved guest contact details, then attach.
// The original guest contact fields (guestName/guestCompany/guestPhone/guestEmail) are NEVER erased
// so the audit history of who originally requested the quote is preserved.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  const quoteId = String(params?.id ?? '')
  try {
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const mode = body?.mode === 'create' ? 'create' : 'existing'

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
    if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    if (!quote?.isGuest) return NextResponse.json({ error: 'This quote is not a guest request.' }, { status: 400 })

    let targetUserId = ''

    if (mode === 'existing') {
      const userId = String(body?.userId ?? '')
      if (!userId) return NextResponse.json({ error: 'Select a customer to link.' }, { status: 400 })
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
      if (!user || !['CUSTOMER', 'BUSINESS_CUSTOMER'].includes(String(user?.role ?? ''))) {
        return NextResponse.json({ error: 'Selected customer is not valid.' }, { status: 400 })
      }
      targetUserId = user.id
    } else {
      const email = String(quote?.guestEmail ?? body?.email ?? '').trim().toLowerCase()
      const name = String(body?.name ?? quote?.guestName ?? quote?.guestCompany ?? '').trim()
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'A valid email is required to create a customer.' }, { status: 400 })
      if (!name) return NextResponse.json({ error: 'A name is required to create a customer.' }, { status: 400 })
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } })
      if (existing) {
        // A real account already exists with this email — link to it instead of creating a duplicate.
        if (!['CUSTOMER', 'BUSINESS_CUSTOMER'].includes(String(existing?.role ?? ''))) {
          return NextResponse.json({ error: 'An account with this email already exists but is not a customer.' }, { status: 409 })
        }
        targetUserId = existing.id
      } else {
        const company = String(quote?.guestCompany ?? '').trim()
        const role = company ? 'BUSINESS_CUSTOMER' : 'CUSTOMER'
        const passwordHash = await bcrypt.hash(randomBytes(24).toString('base64url'), 12)
        let organizationId: string | null = null
        if (role === 'BUSINESS_CUSTOMER' && company) {
          const organization = await prisma.organization.create({ data: { name: company, type: 'BUSINESS' } })
          organizationId = organization?.id ?? null
        }
        const created = await prisma.user.create({
          data: {
            name, email, passwordHash, role, organizationId, isActive: true,
            phone: strOrNull(quote?.guestPhone),
            billingLegalName: company ? company : null,
          },
          select: { id: true },
        })
        targetUserId = created.id
      }
    }

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        userId: targetUserId,
        linkedToCustomerAt: new Date(),
        linkedByAdminId: session?.user?.id ?? null,
        // guest fields intentionally preserved for audit history
      },
      select: { id: true, reference: true, userId: true },
    })

    await audit('Quote', quoteId, mode === 'create' ? 'guest-link-create-customer' : 'guest-link-existing-customer', session?.user?.id, { targetUserId, reference: updated?.reference })

    return NextResponse.json({ ok: true, userId: targetUserId })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to link the customer.' }, { status: 500 })
  }
}
