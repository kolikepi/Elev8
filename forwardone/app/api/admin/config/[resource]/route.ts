import { NextResponse } from 'next/server'
import { guardAdmin, audit } from '@/lib/admin-api'
import { serializeData } from '@/lib/serialize'
import { RESOURCES } from '@/lib/admin-resources'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { resource: string } }) {
  if (!(await guardAdmin())) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  const def = RESOURCES[params?.resource ?? '']
  if (!def) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 })
  try {
    const url = new URL(req.url)
    const where: any = {}
    // Exact-match filters (whitelisted per resource) — e.g. ?countryId=... for cities.
    for (const f of def.filterFields ?? []) {
      const v = url.searchParams.get(f)
      if (v) where[f] = v
    }
    // Free-text search across whitelisted fields.
    const q = url.searchParams.get('q')?.trim()
    if (q && (def.searchFields?.length)) {
      where.OR = def.searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }))
    }
    const args: any = { orderBy: def.orderBy }
    if (Object.keys(where).length) args.where = where
    if (def.take) args.take = def.take
    if (def.include) args.include = def.include
    const items = await def.model.findMany(args)
    return NextResponse.json({ items: serializeData(items) })
  }
  catch (error: unknown) { console.error(error); return NextResponse.json({ error: `Unable to load ${def.label}.` }, { status: 500 }) }
}

export async function POST(request: Request, { params }: { params: { resource: string } }) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  const def = RESOURCES[params?.resource ?? '']
  if (!def) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const item = await def.model.create({ data: def.build(body) })
    await audit(params.resource, item?.id ?? '', 'CREATE', session?.user?.id, { name: item?.name ?? item?.countryName ?? item?.carrier })
    return NextResponse.json({ item: serializeData(item) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: `Unable to create ${def.label}.` }, { status: 500 }) }
}
