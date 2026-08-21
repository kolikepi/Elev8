import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin, str, strOrNull, audit } from '@/lib/admin-api'
import { getCompanyProfile, missingCompanyFields } from '@/lib/company-profile'

export const dynamic = 'force-dynamic'

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}
function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// GET — return the merged company profile plus the raw stored row and the list of fields that still
// need to be configured for a fully legal invoice. Admin only.
export async function GET() {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const row = await prisma.companyProfile.findUnique({ where: { id: 'forwardone' } })
    const profile = await getCompanyProfile()
    return NextResponse.json({ profile, row: row ?? null, missing: missingCompanyFields(profile) })
  } catch (error: unknown) {
    console.error('GET company-profile', error)
    return NextResponse.json({ error: 'Unable to load company profile.' }, { status: 500 })
  }
}

// PUT — upsert the singleton company profile row. Admin only. Additive: empty strings are stored as null.
export async function PUT(request: Request) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const data = {
      legalName: strOrNull(body.legalName),
      taxId: strOrNull(body.taxId),
      registeredAddress: strOrNull(body.registeredAddress),
      phone: strOrNull(body.phone),
      email: strOrNull(body.email),
      website: strOrNull(body.website),
      bankName: strOrNull(body.bankName),
      bankAccount: strOrNull(body.bankAccount),
      iban: strOrNull(body.iban),
      swift: strOrNull(body.swift),
      currency: strOrNull(body.currency),
      vatNumber: strOrNull(body.vatNumber),
      vatInfo: strOrNull(body.vatInfo),
      defaultVatPct: numOrNull(body.defaultVatPct),
      paymentTermsDays: intOrNull(body.paymentTermsDays),
      logoUrl: strOrNull(body.logoUrl),
      footerNote: strOrNull(body.footerNote),
    }
    await prisma.companyProfile.upsert({
      where: { id: 'forwardone' },
      create: { id: 'forwardone', ...data },
      update: data,
    })
    await audit('CompanyProfile', 'forwardone', 'UPDATE', session.user.id, { legalName: str(body.legalName) })
    const profile = await getCompanyProfile()
    return NextResponse.json({ ok: true, profile, missing: missingCompanyFields(profile) })
  } catch (error: unknown) {
    console.error('PUT company-profile', error)
    return NextResponse.json({ error: 'Unable to save company profile.' }, { status: 500 })
  }
}
