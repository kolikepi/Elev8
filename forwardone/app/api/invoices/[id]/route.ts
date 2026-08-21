import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { audit, str, strOrNull } from '@/lib/admin-api'
import { normalizeCharges, computeTotals } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

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

// GET — admin: full invoice. Customer: only their own FINALIZED invoice, customer-safe.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: str(params?.id) }, include: { shipment: { select: { reference: true, userId: true } } } })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    const isAdmin = session?.user?.role === 'ADMINISTRATOR'
    if (isAdmin) return NextResponse.json({ invoice: serializeData(invoice) })
    if (invoice.userId !== session?.user?.id || invoice.status !== 'FINALIZED') return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    return NextResponse.json({ invoice: serializeData(customerSafeInvoice(invoice)) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to load invoice.' }, { status: 500 })
  }
}

// PATCH — admin only. Edit additional charges / notes (DRAFT only) or finalize the invoice.
//   body.action === 'finalize' → DRAFT -> FINALIZED (+ finalizedAt). A finalized invoice is immutable.
//   otherwise → update chargesJson (recomputing subtotal/total) and/or notes while still a DRAFT.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: str(params?.id) } })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}

    if (str(body?.action) === 'finalize') {
      if (invoice.status === 'FINALIZED') return NextResponse.json({ invoice: serializeData(invoice) })
      const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'FINALIZED', finalizedAt: new Date() } })
      await audit('Invoice', invoice.id, 'invoice-finalized', session?.user?.id, { reference: invoice.reference })
      return NextResponse.json({ invoice: serializeData(updated) })
    }

    if (invoice.status === 'FINALIZED') return NextResponse.json({ error: 'A finalized invoice can no longer be edited.' }, { status: 409 })

    const data: any = {}
    // Recompute totals whenever charges OR the VAT rate change (VAT applies to net subtotal).
    const chargesChanged = body?.charges !== undefined
    const vatChanged = body?.vatPct !== undefined
    if (chargesChanged || vatChanged) {
      const charges = chargesChanged
        ? normalizeCharges(body?.charges)
        : normalizeCharges(invoice.chargesJson)
      const vatPctRaw = vatChanged ? Number(body?.vatPct) : Number(invoice.vatPct ?? 0)
      const vatPct = Number.isFinite(vatPctRaw) && vatPctRaw > 0 ? Math.round(vatPctRaw * 100) / 100 : 0
      const { subtotal, vatAmount, total } = computeTotals(Number(invoice.sellingPrice ?? 0) || 0, charges, vatPct)
      if (chargesChanged) data.chargesJson = charges
      data.subtotal = subtotal
      data.vatPct = vatPct > 0 ? vatPct : null
      data.vatAmount = vatPct > 0 ? vatAmount : null
      data.total = total
    }
    if (body?.paymentTerms !== undefined) data.paymentTerms = strOrNull(body?.paymentTerms)
    if (body?.dueDate !== undefined) {
      const raw = str(body?.dueDate)
      if (!raw) {
        data.dueDate = null
      } else {
        const d = new Date(raw)
        data.dueDate = isNaN(d.getTime()) ? null : d
      }
    }
    if (body?.notes !== undefined) data.notes = strOrNull(body?.notes)
    if (!Object.keys(data).length) return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })
    const updated = await prisma.invoice.update({ where: { id: invoice.id }, data })
    await audit('Invoice', invoice.id, 'invoice-updated', session?.user?.id, { fields: Object.keys(data) })
    return NextResponse.json({ invoice: serializeData(updated) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to update invoice.' }, { status: 500 })
  }
}
