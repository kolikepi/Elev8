import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
async function guard() { const session = await getServerSession(authOptions); if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return null; return session }

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try { await prisma.quotationTemplate.delete({ where: { id: context?.params?.id ?? '' } }); return NextResponse.json({ ok: true }) }
  catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to delete template.' }, { status: 500 }) }
}
