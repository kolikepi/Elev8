import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

function serviceTypeFor(category: string): 'EXPRESS_COURIER' | 'ECONOMY_COURIER' | 'ROAD_FREIGHT' {
  if (category === 'ROAD_FREIGHT' || category === 'SEA_FREIGHT') return 'ROAD_FREIGHT'
  return 'EXPRESS_COURIER'
}
function categoryFor(value: string): 'EXPRESS' | 'ROAD_FREIGHT' | 'AIR_FREIGHT' | 'SEA_FREIGHT' {
  return (['EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT'].includes(value) ? value : 'EXPRESS') as any
}

// GET: list the current user's saved drafts (resume-later).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const drafts = await prisma.quote.findMany({ where: { userId: session?.user?.id ?? '', isDraft: true }, orderBy: { updatedAt: 'desc' }, select: { id: true, reference: true, serviceCategory: true, draftJson: true, aiConversationJson: true, updatedAt: true } })
    return NextResponse.json({ drafts: serializeData(drafts ?? []) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load drafts.' }, { status: 500 }) }
}

// POST: create or update a draft. Drafts never consume the FWD reference counter and
// are excluded from customer/admin quote lists until submitted for review.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const form = body?.form ?? {}
    const category = categoryFor(String(form?.serviceCategory ?? 'EXPRESS'))
    const common = {
      serviceCategory: category, serviceType: serviceTypeFor(category), workflowStage: 'QUOTATION' as const,
      direction: form?.direction === 'IMPORT' ? 'IMPORT' as const : 'EXPORT' as const,
      contentsType: (['DOCUMENTS', 'PARCEL', 'MULTIPLE_PARCELS', 'BOXES', 'PALLET'].includes(form?.contentsType) ? form?.contentsType : 'PARCEL') as any,
      carrierName: form?.carrierName ? String(form?.carrierName) : null, serviceName: form?.serviceName ? String(form?.serviceName) : null,
      senderJson: form?.sender ?? {}, receiverJson: form?.receiver ?? {},
      originCountry: form?.sender?.country ? String(form?.sender?.country) : null, originCity: form?.sender?.city ? String(form?.sender?.city) : null, originPostalCode: form?.sender?.postalCode ? String(form?.sender?.postalCode) : null,
      destCountry: form?.receiver?.country ? String(form?.receiver?.country) : null, destCity: form?.receiver?.city ? String(form?.receiver?.city) : null, destPostalCode: form?.receiver?.postalCode ? String(form?.receiver?.postalCode) : null,
      pieces: Math.max(1, Number(form?.pieces ?? 1)), weightKg: Number(form?.weightKg ?? 0), dimensionsJson: form?.dimensions ?? [],
      goodsDescription: form?.goodsDescription ? String(form?.goodsDescription) : null, isCommercial: Boolean(form?.isCommercial),
      specialInstructions: String(form?.specialInstructions ?? ''), draftJson: form ?? {}, isDraft: true,
      ...(body?.aiConversation !== undefined ? { aiConversationJson: body?.aiConversation ?? {} } : {}),
    }
    const existingId = String(body?.id ?? '')
    if (existingId) {
      const owned = await prisma.quote.findFirst({ where: { id: existingId, userId: session?.user?.id ?? '', isDraft: true }, select: { id: true } })
      if (!owned) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 })
      const draft = await prisma.quote.update({ where: { id: existingId }, data: common, select: { id: true, reference: true, updatedAt: true } })
      return NextResponse.json({ draft: serializeData(draft) })
    }
    const user = await prisma.user.findUnique({ where: { id: session?.user?.id ?? '' }, select: { organizationId: true } })
    const reference = `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    const draft = await prisma.quote.create({ data: { reference, userId: session?.user?.id ?? '', organizationId: user?.organizationId ?? null, status: 'PENDING_REVIEW', ...common }, select: { id: true, reference: true, updatedAt: true } })
    return NextResponse.json({ draft: serializeData(draft) }, { status: 201 })
  } catch (error: unknown) { console.error('Draft save error:', error); return NextResponse.json({ error: 'Unable to save draft.' }, { status: 500 }) }
}

// DELETE ?id=  discard a draft.
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const id = new URL(request?.url ?? '', 'http://localhost').searchParams.get('id') ?? ''
    if (!id) return NextResponse.json({ error: 'Draft id required.' }, { status: 400 })
    const owned = await prisma.quote.findFirst({ where: { id, userId: session?.user?.id ?? '', isDraft: true }, select: { id: true } })
    if (!owned) return NextResponse.json({ error: 'Draft not found.' }, { status: 404 })
    await prisma.quote.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to delete draft.' }, { status: 500 }) }
}
