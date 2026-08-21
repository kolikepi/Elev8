import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Sprint 2.2.1 Phase B — customer asks for a refreshed quotation (typically because the current version has
// expired). This never changes pricing; it only notifies administrators so they can issue a revision. The
// customer only ever sees a friendly confirmation.
export async function POST(_request: Request, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const quote = await prisma.quote.findUnique({ where: { id: context?.params?.id ?? '' }, select: { id: true, reference: true, userId: true } })
    if (!quote || quote?.userId !== session?.user?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    try {
      const admins = await prisma.user.findMany({ where: { role: 'ADMINISTRATOR', isActive: true }, select: { id: true } })
      if (admins?.length) await prisma.notification.createMany({ data: admins.map((a) => ({ userId: a?.id ?? '', type: 'QUOTE_UPDATE_REQUESTED', message: `Customer requested an updated quotation for ${quote?.reference ?? ''}.` })) })
    } catch (e) { console.error('request-update admin notification failed', e) }
    await prisma.auditLog.create({ data: { entityType: 'Quote', entityId: quote?.id ?? '', action: 'customer-request-update', actorId: session?.user?.id ?? null, detailsJson: { reference: quote?.reference ?? '' } } }).catch((e: unknown) => console.error(e))
    return NextResponse.json({ ok: true })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to submit request.' }, { status: 500 }) }
}
