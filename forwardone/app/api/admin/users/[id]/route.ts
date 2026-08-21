import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

async function guard() { const session = await getServerSession(authOptions); if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return null; return session }
const strOrNull = (v: unknown): string | null => { const s = String(v ?? '').trim(); return s ? s : null }
const n = (v: unknown): number => Number(v ?? 0) || 0

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const id = params?.id ?? ''
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        billingLegalName: true, billingTradingName: true, billingTaxId: true, billingAddress: true,
        billingCountry: true, billingCity: true, billingZip: true, billingPhone: true,
        contactPerson: true, phone: true,
        organization: { select: { id: true, name: true, type: true } },
        pricingProfile: true,
        addresses: { orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }] },
      },
    })
    if (!user || user.role === 'ADMINISTRATOR') return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })

    const [quotes, shipments, invoices] = await Promise.all([
      prisma.quote.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, reference: true, status: true, direction: true, serviceType: true, originCountry: true, destCountry: true, createdAt: true } }),
      prisma.shipment.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, reference: true, trackingNumber: true, status: true, customerServiceName: true, origin: true, destination: true, sellingPrice: true, sellingCurrency: true, estimatedDelivery: true, createdAt: true } }),
      prisma.invoice.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, reference: true, status: true, total: true, currency: true, serviceName: true, createdAt: true, finalizedAt: true } }),
    ])

    const finalized = invoices.filter((i) => i.status === 'FINALIZED')
    const metrics = {
      totalQuotes: quotes.length,
      quotesAccepted: quotes.filter((q) => q.status === 'ACCEPTED' || q.status === 'BOOKED').length,
      quotesRejected: quotes.filter((q) => q.status === 'REJECTED' || q.status === 'CANCELLED').length,
      quotesPending: quotes.filter((q) => q.status === 'PENDING_REVIEW' || q.status === 'QUOTED').length,
      totalShipments: shipments.length,
      shipmentsDelivered: shipments.filter((s) => s.status === 'DELIVERED' || s.status === 'FINANCIALLY_CLOSED').length,
      totalInvoices: invoices.length,
      finalizedInvoices: finalized.length,
      revenue: finalized.reduce((sum, i) => sum + n(i.total), 0),
      revenueCurrency: finalized[0]?.currency ?? 'EUR',
    }

    return NextResponse.json({ customer: serializeData({ ...user, quotes, shipments, invoices, metrics }) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load the customer profile.' }, { status: 500 }) }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const id = params?.id ?? ''
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!existing || existing.role === 'ADMINISTRATOR') return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    const body = await request?.json?.().catch?.(() => ({})) ?? {}

    const data: Record<string, unknown> = {}
    if (body?.name !== undefined) { const nm = String(body?.name ?? '').trim(); if (!nm) return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 }); data.name = nm }
    if (body?.email !== undefined) {
      const em = String(body?.email ?? '').trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
      const clash = await prisma.user.findFirst({ where: { email: em, NOT: { id } }, select: { id: true } })
      if (clash) return NextResponse.json({ error: 'Another customer already uses this email.' }, { status: 409 })
      data.email = em
    }
    if (body?.role !== undefined && (body?.role === 'CUSTOMER' || body?.role === 'BUSINESS_CUSTOMER')) data.role = body.role
    if (body?.isActive !== undefined) data.isActive = !!body.isActive
    for (const f of ['billingLegalName', 'billingTradingName', 'billingTaxId', 'billingAddress', 'billingCountry', 'billingCity', 'billingZip', 'billingPhone', 'contactPerson', 'phone'] as const) {
      if (body?.[f] !== undefined) data[f] = strOrNull(body?.[f])
    }

    const user = await prisma.user.update({ where: { id }, data })
    return NextResponse.json({ id: user.id })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to update the customer.' }, { status: 500 }) }
}
