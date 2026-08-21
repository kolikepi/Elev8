import { NextResponse } from 'next/server'
import { guardAdmin, audit, str, strOrNull, dec, decOrNull, int, enumOr, enumOrNull, CATEGORY, DIRECTION } from '@/lib/admin-api'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

function buildRow(r: any) {
  return {
    direction: enumOrNull(r?.direction, DIRECTION) as any,
    originCountry: strOrNull(r?.originCountry), destCountry: strOrNull(r?.destCountry),
    originZone: strOrNull(r?.originZone), destZone: strOrNull(r?.destZone), zone: strOrNull(r?.zone),
    weightFrom: dec(r?.weightFrom), weightTo: dec(r?.weightTo), exactWeight: decOrNull(r?.exactWeight),
    flatRate: decOrNull(r?.flatRate), ratePerKg: decOrNull(r?.ratePerKg), additionalKgRate: decOrNull(r?.additionalKgRate),
    minCharge: decOrNull(r?.minCharge), maxCharge: decOrNull(r?.maxCharge), currency: str(r?.currency) || 'EUR',
    isActive: r?.isActive !== false,
  }
}

export async function GET() {
  if (!(await guardAdmin())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const versions = await prisma.tariffVersion.findMany({ orderBy: [{ carrier: 'asc' }, { serviceCategory: 'asc' }, { versionNumber: 'desc' }], include: { _count: { select: { rows: true } } } })
    return NextResponse.json({ versions: serializeData(versions) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load tariffs.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const carrier = str(body?.carrier) || 'Carrier'
    const serviceCategory = enumOr(body?.serviceCategory, CATEGORY, 'EXPRESS')
    const direction = enumOrNull(body?.direction, DIRECTION)
    const last = await prisma.tariffVersion.findFirst({ where: { carrier, serviceCategory: serviceCategory as any }, orderBy: { versionNumber: 'desc' } })
    const versionNumber = (last?.versionNumber ?? 0) + 1
    const rows: any[] = Array.isArray(body?.rows) ? body.rows : []
    const version = await prisma.tariffVersion.create({ data: {
      name: str(body?.name) || `${carrier} ${serviceCategory} v${versionNumber}`, carrier, serviceCategory: serviceCategory as any,
      serviceName: strOrNull(body?.serviceName), direction: direction as any, versionNumber, status: 'DRAFT',
      currency: str(body?.currency) || 'EUR', notes: strOrNull(body?.notes), originalFilePath: strOrNull(body?.originalFilePath),
      customerId: strOrNull(body?.customerId), createdBy: session?.user?.id ?? null,
      rows: rows.length ? { create: rows.map(buildRow) } : undefined,
    }, include: { _count: { select: { rows: true } } } })
    // Optionally link an import job
    if (body?.jobId) { try { await prisma.tariffImportJob.update({ where: { id: str(body.jobId) }, data: { status: 'IMPORTED', tariffVersionId: version.id } }) } catch (e) { console.error(e) } }
    await audit('tariff', version.id, 'CREATE', session?.user?.id, { carrier, serviceCategory, versionNumber, rows: rows.length })
    return NextResponse.json({ version: serializeData(version) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to create tariff version.' }, { status: 500 }) }
}
