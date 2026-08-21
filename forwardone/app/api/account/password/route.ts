import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const currentPassword = String(body?.currentPassword ?? '')
    const newPassword = String(body?.newPassword ?? '')
    if (newPassword.length < 8) return NextResponse.json({ error: 'The new password must be at least 8 characters.' }, { status: 400 })
    if (newPassword === currentPassword) return NextResponse.json({ error: 'The new password must be different from the current one.' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { id: session?.user?.id ?? '' }, select: { passwordHash: true } })
    const valid = await bcrypt.compare(currentPassword, user?.passwordHash ?? '')
    if (!valid) return NextResponse.json({ error: 'The current password is incorrect.' }, { status: 400 })
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: session?.user?.id ?? '' }, data: { passwordHash } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to update your password. Please try again.' }, { status: 500 }) }
}
