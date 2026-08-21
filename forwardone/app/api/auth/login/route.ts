import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const email = String(body?.email ?? '').trim().toLowerCase()
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null
    const valid = user?.isActive ? await bcrypt.compare(String(body?.password ?? ''), user?.passwordHash ?? '') : false
    if (!valid) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    return NextResponse.json({ ok: true, role: user?.role ?? 'CUSTOMER' })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to validate credentials.' }, { status: 500 }) }
}
