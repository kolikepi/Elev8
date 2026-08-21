import { NextResponse } from 'next/server'
import { guardAdmin, audit, str, strOrNull, dec, decOrNull, enumOrNull, DIRECTION } from '@/lib/admin-api'
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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await guardAdmin())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const version = await prisma.tariffVersion.findUnique({ where: { id: params?.id ?? '' }, include: { rows: { orderBy: [{ zone: 'asc' }, { destCountry: 'asc' }, { weightTo: 'asc' }] } } })
    if (!version) return NextResponse.json({ error: 'Tariff not found.' }, { status: 404 })
    return NextResponse.json({ version: serializeData(version) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load tariff.' }, { status: 500 }) }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  const id = params?.id ?? ''
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const action = str(body?.action)
    const current = await prisma.tariffVersion.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Tariff not found.' }, { status: 404 })

    if (action === 'validate') {
      const v = await prisma.tariffVersion.update({ where: { id }, data: { status: 'VALIDATED' } })
      await audit('tariff', id, 'VALIDATE', session?.user?.id, {}); return NextResponse.json({ version: serializeData(v) })
    }
    if (action === 'activate' || action === 'rollback') {
      await prisma.tariffVersion.updateMany({ where: { carrier: current.carrier, serviceCategory: current.serviceCategory, status: 'ACTIVE', id: { not: id } }, data: { status: 'INACTIVE' } })
      const v = await prisma.tariffVersion.update({ where: { id }, data: { status: 'ACTIVE', effectiveFrom: current.effectiveFrom ?? new Date() } })
      await audit('tariff', id, action.toUpperCase(), session?.user?.id, { carrier: current.carrier, serviceCategory: current.serviceCategory })
      return NextResponse.json({ version: serializeData(v) })
    }
    if (action === 'deactivate') {
      const v = await prisma.tariffVersion.update({ where: { id }, data: { status: 'INACTIVE' } })
      await audit('tariff', id, 'DEACTIVATE', session?.user?.id, {}); return NextResponse.json({ version: serializeData(v) })
    }
    if (action === 'archive') {
      const v = await prisma.tariffVersion.update({ where: { id }, data: { status: 'ARCHIVED' } })
      await audit('tariff', id, 'ARCHIVE', session?.user?.id, {}); return NextResponse.json({ version: serializeData(v) })
    }
    if (action === 'duplicate') {
      const rows = await prisma.tariffRow.findMany({ where: { tariffVersionId: id } })
      const last = await prisma.tariffVersion.findFirst({ where: { carrier: current.carrier, serviceCategory: current.serviceCategory }, orderBy: { versionNumber: 'desc' } })
      const versionNumber = (last?.versionNumber ?? 0) + 1
      const copy = await prisma.tariffVersion.create({ data: {
        name: `${current.name} (copy)`, carrier: current.carrier, serviceCategory: current.serviceCategory, serviceName: current.serviceName,
        direction: current.direction, versionNumber, status: 'DRAFT', currency: current.currency, notes: current.notes, createdBy: session?.user?.id ?? null,
        rows: { create: rows.map((r: any) => ({ direction: r.direction, originCountry: r.originCountry, destCountry: r.destCountry, originZone: r.originZone, destZone: r.destZone, zone: r.zone, weightFrom: r.weightFrom, weightTo: r.weightTo, exactWeight: r.exactWeight, flatRate: r.flatRate, ratePerKg: r.ratePerKg, additionalKgRate: r.additionalKgRate, minCharge: r.minCharge, maxCharge: r.maxCharge, currency: r.currency, isActive: r.isActive })) },
      }, include: { _count: { select: { rows: true } } } })
      await audit('tariff', copy.id, 'DUPLICATE', session?.user?.id, { from: id }); return NextResponse.json({ version: serializeData(copy) })
    }
    if (action === 'add-row') {
      const row = await prisma.tariffRow.create({ data: { tariffVersionId: id, ...buildRow(body?.row) } })
      await audit('tariff', id, 'ADD_ROW', session?.user?.id, {}); return NextResponse.json({ row: serializeData(row) })
    }
    if (action === 'update-row') {
      const row = await prisma.tariffRow.update({ where: { id: str(body?.rowId) }, data: buildRow(body?.row) })
      await audit('tariff', id, 'UPDATE_ROW', session?.user?.id, { rowId: body?.rowId }); return NextResponse.json({ row: serializeData(row) })
    }
    if (action === 'delete-row') {
      await prisma.tariffRow.delete({ where: { id: str(body?.rowId) } })
      await audit('tariff', id, 'DELETE_ROW', session?.user?.id, { rowId: body?.rowId }); return NextResponse.json({ ok: true })
    }
    // Default: update metadata
    const v = await prisma.tariffVersion.update({ where: { id }, data: {
      name: str(body?.name) || current.name, notes: strOrNull(body?.notes), currency: str(body?.currency) || current.currency,
      serviceName: strOrNull(body?.serviceName), effectiveFrom: body?.effectiveFrom ? new Date(body.effectiveFrom) : current.effectiveFrom,
      effectiveTo: body?.effectiveTo ? new Date(body.effectiveTo) : current.effectiveTo,
    } })
    await audit('tariff', id, 'UPDATE_META', session?.user?.id, {})
    return NextResponse.json({ version: serializeData(v) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to update tariff.' }, { status: 500 }) }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const v = await prisma.tariffVersion.findUnique({ where: { id: params?.id ?? '' } })
    if (v?.status === 'ACTIVE') return NextResponse.json({ error: 'Deactivate the tariff before deleting.' }, { status: 400 })
    await prisma.tariffVersion.delete({ where: { id: params?.id ?? '' } })
    await audit('tariff', params?.id ?? '', 'DELETE', session?.user?.id, {})
    return NextResponse.json({ ok: true })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to delete tariff.' }, { status: 500 }) }
}
