import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit, str } from '@/lib/admin-api'
import { nextInvoiceReference } from '@/lib/references'
import { computeTotals } from '@/lib/invoices'
import { invoiceEligibility } from '@/lib/invoice-eligibility'
import { getCompanyProfile } from '@/lib/company-profile'

export const dynamic = 'force-dynamic'

// GET — admin: the invoice(s) attached to a shipment (there is normally at most one, most recent first).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const invoices = await prisma.invoice.findMany({ where: { shipmentId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ invoices: serializeData(invoices) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to load invoices.' }, { status: 500 })
  }
}

// POST — admin: create a DRAFT invoice from a completed shipment, auto-inheriting customer, shipment
// reference, service label and the accepted selling price / currency. No re-entry of existing data.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        user: { select: { name: true, email: true } },
        quote: { select: { direction: true } },
      },
    })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    // Direction-aware invoice timing: IMPORT once customs reached; EXPORT once final weight + price confirmed.
    const eligibility = invoiceEligibility({
      status: shipment.status,
      sellingPrice: shipment.sellingPrice,
      actualWeightKg: shipment.actualWeightKg,
      actualChargeableWeightKg: shipment.actualChargeableWeightKg,
      direction: shipment.quote?.direction ?? null,
    })
    if (!eligibility.eligible) return NextResponse.json({ error: eligibility.reason }, { status: 409 })

    // Duplicate prevention: at most one invoice per shipment.
    const existing = await prisma.invoice.findFirst({ where: { shipmentId } })
    if (existing) return NextResponse.json({ invoice: serializeData(existing) })

    const company = await getCompanyProfile()
    const sellingPrice = Number(shipment.sellingPrice ?? 0) || 0
    const vatPct = company.defaultVatPct || 0
    const { subtotal, vatAmount, total } = computeTotals(sellingPrice, [], vatPct)
    const termsDays = company.paymentTermsDays || 0
    const paymentTerms = termsDays > 0 ? `Net ${termsDays}` : null
    const dueDate = termsDays > 0 ? new Date(Date.now() + termsDays * 24 * 60 * 60 * 1000) : null
    const reference = await nextInvoiceReference()
    const invoice = await prisma.invoice.create({
      data: {
        reference,
        shipmentId,
        userId: shipment.userId,
        customerName: shipment.user?.name ?? null,
        customerEmail: shipment.user?.email ?? null,
        serviceName: shipment.customerServiceName ?? null,
        sellingPrice,
        currency: shipment.sellingCurrency ?? 'EUR',
        chargesJson: [],
        subtotal,
        vatPct: vatPct > 0 ? vatPct : null,
        vatAmount: vatPct > 0 ? vatAmount : null,
        total,
        paymentTerms,
        dueDate,
        status: 'DRAFT',
        createdById: session?.user?.id ?? null,
      },
    })
    await audit('Invoice', invoice.id, 'invoice-created', session?.user?.id, { shipmentId, reference })
    return NextResponse.json({ invoice: serializeData(invoice) }, { status: 201 })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to create invoice.' }, { status: 500 })
  }
}
