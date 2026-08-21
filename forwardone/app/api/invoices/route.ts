import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

// Customer-safe projection of an invoice. Never leaks internal carrier cost / margin — an invoice only
// carries selling-side figures, but we still whitelist fields explicitly.
function customerSafeInvoice(inv: any) {
  return {
    id: inv?.id ?? null,
    reference: inv?.reference ?? null,
    shipmentReference: inv?.shipment?.reference ?? null,
    serviceName: inv?.serviceName ?? null,
    sellingPrice: inv?.sellingPrice ?? null,
    currency: inv?.currency ?? 'EUR',
    charges: Array.isArray(inv?.chargesJson) ? inv?.chargesJson : [],
    subtotal: inv?.subtotal ?? null,
    vatPct: inv?.vatPct ?? null,
    vatAmount: inv?.vatAmount ?? null,
    total: inv?.total ?? null,
    paymentTerms: inv?.paymentTerms ?? null,
    dueDate: inv?.dueDate ?? null,
    status: inv?.status ?? 'DRAFT',
    createdAt: inv?.createdAt ?? null,
    finalizedAt: inv?.finalizedAt ?? null,
  }
}

// GET — admin: all invoices. Customer: only their own, and only once FINALIZED (a draft is internal work
// in progress and must not be shown to the customer), projected through the customer-safe whitelist.
export async function GET(_request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const isAdmin = session?.user?.role === 'ADMINISTRATOR'
    if (isAdmin) {
      const invoices = await prisma.invoice.findMany({ include: { shipment: { select: { reference: true } } }, orderBy: { createdAt: 'desc' } })
      return NextResponse.json({ invoices: serializeData(invoices) })
    }
    const invoices = await prisma.invoice.findMany({ where: { userId: session?.user?.id, status: 'FINALIZED' }, include: { shipment: { select: { reference: true } } }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ invoices: serializeData(invoices.map(customerSafeInvoice)) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to load invoices.' }, { status: 500 })
  }
}
