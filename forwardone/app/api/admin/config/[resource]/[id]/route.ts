import { NextResponse } from 'next/server'
import { guardAdmin, audit } from '@/lib/admin-api'
import { serializeData } from '@/lib/serialize'
import { RESOURCES } from '@/lib/admin-resources'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { resource: string; id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  const def = RESOURCES[params?.resource ?? '']
  if (!def) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    // Toggle-only fast path
    if (Object.keys(body ?? {}).length === 1 && typeof body?.isActive === 'boolean') {
      const item = await def.model.update({ where: { id: params?.id ?? '' }, data: { isActive: body.isActive } })
      await audit(params.resource, params?.id ?? '', 'TOGGLE', session?.user?.id, { isActive: body.isActive })
      return NextResponse.json({ item: serializeData(item) })
    }
    // Archive / unarchive fast path (partial body) — must NOT run build() or it would reset every field.
    if (def.archivable && Object.keys(body ?? {}).length === 1 && typeof body?.archived === 'boolean') {
      const item = await def.model.update({ where: { id: params?.id ?? '' }, data: body.archived ? { archivedAt: new Date(), isActive: false } : { archivedAt: null } })
      await audit(params.resource, params?.id ?? '', body.archived ? 'ARCHIVE' : 'UNARCHIVE', session?.user?.id, {})
      return NextResponse.json({ item: serializeData(item) })
    }
    const item = await def.model.update({ where: { id: params?.id ?? '' }, data: def.build(body) })
    await audit(params.resource, params?.id ?? '', 'UPDATE', session?.user?.id, {})
    return NextResponse.json({ item: serializeData(item) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: `Unable to update ${def.label}.` }, { status: 500 }) }
}

export async function DELETE(_req: Request, { params }: { params: { resource: string; id: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  const def = RESOURCES[params?.resource ?? '']
  if (!def) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 })
  try {
    // Reference guard: never hard-delete master data that other records depend on.
    // Admins must deactivate (isActive=false) instead, preserving historical integrity.
    if (def.refGuard) {
      const refs = await def.refGuard(params?.id ?? '')
      if (refs > 0) {
        return NextResponse.json({ error: `Cannot delete this ${def.label.toLowerCase()} — it is referenced by ${refs} other record(s). Deactivate it instead.` }, { status: 409 })
      }
    }
    await def.model.delete({ where: { id: params?.id ?? '' } })
    await audit(params.resource, params?.id ?? '', 'DELETE', session?.user?.id, {})
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error(error)
    // Prisma FK violation (P2003) — record still referenced elsewhere. Surface a friendly guard message.
    if ((error as any)?.code === 'P2003') {
      return NextResponse.json({ error: `Cannot delete this ${def.label.toLowerCase()} — it is still referenced by other records. Deactivate it instead.` }, { status: 409 })
    }
    return NextResponse.json({ error: `Unable to delete ${def.label}.` }, { status: 500 })
  }
}
