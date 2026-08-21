// Assembles everything the printable invoice template needs, with permission enforcement in one place.
// Reused by the document endpoint (browser preview / print / PDF). NEVER exposes internal carrier, carrier
// cost, ForwardOne margin, operational notes or internal invoice notes — only customer-facing selling data.

import { prisma } from '@/lib/prisma'
import { getCompanyProfile, type CompanyProfile } from '@/lib/company-profile'

export type InvoiceLine = { description: string; qty: number; unitPrice: number; amount: number }

export type InvoiceViewData = {
  company: CompanyProfile
  billTo: {
    legalName: string
    tradingName: string
    taxId: string
    address: string
    city: string
    zip: string
    country: string
    phone: string
    email: string
  }
  invoice: {
    reference: string
    invoiceDate: string
    status: string
    shipmentReference: string
    tracking: string
    awb: string
    route: string
    serviceName: string
    currency: string
    lines: InvoiceLine[]
    subtotal: number
    vatPct: number
    vatAmount: number
    total: number
    paymentTerms: string
    dueDate: string
  }
  fileName: string
}

type Session = { user?: { id?: string; role?: string } } | null

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

// Loads an invoice and builds the view model, enforcing access rules:
//   admin      → any invoice (DRAFT or FINALIZED)
//   customer   → only their own invoice AND only once FINALIZED
// Returns null for not-found / forbidden (caller maps to 404) so we never reveal invoice existence.
export async function buildInvoiceViewData(invoiceId: string, session: Session): Promise<InvoiceViewData | null> {
  const userId = session?.user?.id
  if (!userId) return null
  const isAdmin = session?.user?.role === 'ADMINISTRATOR'

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      shipment: { select: { reference: true, trackingNumber: true, awbNumber: true, origin: true, destination: true, customerServiceName: true } },
      user: {
        select: {
          name: true,
          email: true,
          billingLegalName: true,
          billingTradingName: true,
          billingTaxId: true,
          billingAddress: true,
          billingCity: true,
          billingZip: true,
          billingCountry: true,
          billingPhone: true,
        },
      },
    },
  })
  if (!invoice) return null
  if (!isAdmin && (invoice.userId !== userId || invoice.status !== 'FINALIZED')) return null

  const company = await getCompanyProfile()
  const currency = invoice.currency || 'EUR'
  const u = invoice.user

  // Charges are stored as { description, amount }. Each additional charge is a qty-1 line. The freight is
  // the accepted selling price, presented as the first line (Transport / Freight).
  const rawCharges = Array.isArray(invoice.chargesJson) ? (invoice.chargesJson as any[]) : []
  const sellingPrice = num(invoice.sellingPrice)
  const lines: InvoiceLine[] = [
    { description: invoice.serviceName || 'Transport / Freight', qty: 1, unitPrice: sellingPrice, amount: sellingPrice },
    ...rawCharges
      .map((c: any) => {
        const amount = num(c?.amount)
        return { description: String(c?.description ?? c?.label ?? 'Charge').trim() || 'Charge', qty: 1, unitPrice: amount, amount }
      }),
  ]

  const invoiceDate = invoice.finalizedAt ?? invoice.createdAt
  const route =
    invoice.shipment?.origin && invoice.shipment?.destination
      ? `${invoice.shipment.origin} → ${invoice.shipment.destination}`
      : ''

  return {
    company,
    billTo: {
      legalName: (u?.billingLegalName || invoice.customerName || u?.name || '').trim(),
      tradingName: (u?.billingTradingName || '').trim(),
      taxId: (u?.billingTaxId || '').trim(),
      address: (u?.billingAddress || '').trim(),
      city: (u?.billingCity || '').trim(),
      zip: (u?.billingZip || '').trim(),
      country: (u?.billingCountry || '').trim(),
      phone: (u?.billingPhone || '').trim(),
      email: (invoice.customerEmail || u?.email || '').trim(),
    },
    invoice: {
      reference: invoice.reference,
      invoiceDate: new Date(invoiceDate).toISOString().slice(0, 10),
      status: invoice.status || 'DRAFT',
      shipmentReference: invoice.shipment?.reference || '',
      tracking: invoice.shipment?.trackingNumber || '',
      awb: invoice.shipment?.awbNumber || '',
      route,
      serviceName: invoice.serviceName || invoice.shipment?.customerServiceName || '',
      currency,
      lines,
      subtotal: num(invoice.subtotal),
      vatPct: num(invoice.vatPct),
      vatAmount: num(invoice.vatAmount),
      total: num(invoice.total),
      paymentTerms: (invoice.paymentTerms || '').trim(),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : '',
    },
    fileName: `${invoice.reference || 'invoice'}.pdf`,
  }
}
