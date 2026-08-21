import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { guardAdmin, audit } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

// The core booking-stage confirmations an administrator must always complete before a shipment/AWB can be raised.
const FIELDS = ['senderComplete', 'receiverComplete', 'pickupAddressComplete', 'deliveryAddressComplete', 'contactsComplete', 'documentsComplete', 'packagesConfirmed', 'dataUnchangedConfirmed'] as const
// Extra confirmations that only apply to certain quotes (commercial customs / dangerous-goods handling).
const EXTRA_FIELDS = ['customsInfoComplete', 'dgRequirementsComplete'] as const
const ALL_FIELDS = [...FIELDS, ...EXTRA_FIELDS] as const
const bool = (v: unknown): boolean => v === true || v === 'true' || v === 1 || v === '1'

// Which fields are required for this specific quote — core always, plus conditional customs/DG confirmations.
function requiredFields(quote: { isCommercial?: boolean | null; dangerousGoods?: boolean | null } | null): string[] {
  const req: string[] = [...FIELDS]
  if (quote?.isCommercial) req.push('customsInfoComplete')
  if (quote?.dangerousGoods) req.push('dgRequirementsComplete')
  return req
}

function isComplete(row: Record<string, unknown>, required: string[]): boolean { return required.every((f) => row?.[f] === true) }

// GET — load (or lazily create) the booking checklist for a quote.
export async function GET(_request: Request, context: { params: { id: string } }) {
  const admin = await guardAdmin()
  if (!admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const id = String(context?.params?.id ?? '')
    let checklist = await prisma.bookingChecklist.findUnique({ where: { quoteId: id } })
    if (!checklist) checklist = await prisma.bookingChecklist.create({ data: { quoteId: id } })
    return NextResponse.json({ checklist: serializeData(checklist) })
  } catch (error: unknown) { console.error('Booking checklist load error:', error); return NextResponse.json({ error: 'Unable to load booking checklist.' }, { status: 500 }) }
}

// POST — update checklist confirmations. Fully additive: only supplied booleans change.
export async function POST(request: Request, context: { params: { id: string } }) {
  const admin = await guardAdmin()
  if (!admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const id = String(context?.params?.id ?? '')
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const data: Record<string, boolean> = {}
    for (const f of ALL_FIELDS) { if (f in (body ?? {})) data[f] = bool((body as Record<string, unknown>)?.[f]) }
    const quote = await prisma.quote.findUnique({ where: { id }, select: { isCommercial: true, dangerousGoods: true } })
    const existing = await prisma.bookingChecklist.findUnique({ where: { quoteId: id } })
    const merged = { ...(existing ?? {}), ...data } as Record<string, unknown>
    const complete = isComplete(merged, requiredFields(quote))
    const checklist = await prisma.bookingChecklist.upsert({
      where: { quoteId: id },
      update: { ...data, completedAt: complete ? new Date() : null },
      create: { quoteId: id, ...data, completedAt: complete ? new Date() : null },
    })
    await audit('BookingChecklist', checklist.id, complete ? 'checklist:complete' : 'checklist:update', admin?.user?.id, { quoteId: id, complete })
    return NextResponse.json({ checklist: serializeData(checklist), complete })
  } catch (error: unknown) { console.error('Booking checklist save error:', error); return NextResponse.json({ error: 'Unable to save booking checklist.' }, { status: 500 }) }
}
