import { NextResponse } from 'next/server'
import { guardAdmin, audit, str, strOrNull, enumOrNull, CATEGORY } from '@/lib/admin-api'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await guardAdmin())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const jobs = await prisma.tariffImportJob.findMany({ orderBy: { createdAt: 'desc' }, take: 40, include: { _count: { select: { errors: true } } } })
    return NextResponse.json({ jobs: serializeData(jobs) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load import jobs.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const fileName = str(body?.fileName) || 'tariff.xlsx'
    const job = await prisma.tariffImportJob.create({ data: {
      fileName, cloudStoragePath: str(body?.cloudStoragePath) || `local/tariff-import/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}`,
      carrier: strOrNull(body?.carrier), serviceCategory: enumOrNull(body?.serviceCategory, CATEGORY) as any,
      status: 'UPLOADED', sheetsJson: body?.sheets ?? undefined, createdBy: session?.user?.id ?? null,
    } })
    await audit('tariff-import', job.id, 'CREATE', session?.user?.id, { fileName })
    return NextResponse.json({ job: serializeData(job) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to create import job.' }, { status: 500 }) }
}
