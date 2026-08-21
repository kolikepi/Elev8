import { NextResponse } from 'next/server'
import { guardAdmin, audit, str, int, enumOr } from '@/lib/admin-api'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'
const STATUS = ['UPLOADED', 'PARSED', 'MAPPED', 'VALIDATED', 'IMPORTED', 'FAILED']

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await guardAdmin())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const job = await prisma.tariffImportJob.findUnique({ where: { id: params?.id ?? '' }, include: { errors: { orderBy: { rowNumber: 'asc' }, take: 200 } } })
    if (!job) return NextResponse.json({ error: 'Import job not found.' }, { status: 404 })
    return NextResponse.json({ job: serializeData(job) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load import job.' }, { status: 500 }) }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  const id = params?.id ?? ''
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const data: any = {}
    if (body?.status !== undefined) data.status = enumOr(body?.status, STATUS, 'UPLOADED')
    if (body?.sheetName !== undefined) data.sheetName = str(body?.sheetName)
    if (body?.mapping !== undefined) data.mappingJson = body?.mapping
    if (body?.preview !== undefined) data.previewJson = body?.preview
    if (body?.rowsAccepted !== undefined) data.rowsAccepted = int(body?.rowsAccepted)
    if (body?.rowsRejected !== undefined) data.rowsRejected = int(body?.rowsRejected)
    if (body?.rowsReview !== undefined) data.rowsReview = int(body?.rowsReview)
    const job = await prisma.tariffImportJob.update({ where: { id }, data })
    // Persist rejected rows as errors when provided
    if (Array.isArray(body?.errors)) {
      await prisma.tariffImportError.deleteMany({ where: { jobId: id } })
      if (body.errors.length) await prisma.tariffImportError.createMany({ data: body.errors.slice(0, 500).map((e: any, i: number) => ({ jobId: id, rowNumber: int(e?.rowNumber ?? i + 1), severity: str(e?.severity) || 'ERROR', reason: str(e?.reason) || 'Invalid row', rawJson: e?.raw ?? undefined })) })
    }
    await audit('tariff-import', id, 'UPDATE', session?.user?.id, { status: data.status })
    return NextResponse.json({ job: serializeData(job) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to update import job.' }, { status: 500 }) }
}
