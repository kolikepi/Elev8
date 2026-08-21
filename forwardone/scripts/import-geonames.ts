/**
 * One-time / idempotent GeoNames importer for the shared Location Master.
 * Source: https://download.geonames.org (CC BY 4.0). Populates Region, City, PostalCode.
 * Reuses existing Country rows (matched by ISO2). Does NOT touch carrier/tariff tables.
 * Re-runnable: guards against duplicates using existing-row sets + createMany skipDuplicates.
 *
 * Expects the GeoNames files already downloaded to DIR:
 *   admin1.txt          (admin1CodesASCII.txt)
 *   cities15000.txt     (from cities15000.zip)
 *   <CC>.txt            (per-country postal, from export/zip/<CC>.zip)
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const DIR = process.env.GEO_DIR || '/tmp/geo'
// Countries for which we import postal codes (where a reliable open dataset exists).
// Portugal is intentionally excluded (street-level, ~198k rows — disproportionate).
const POSTAL_CC = ['AL', 'IT', 'DE', 'GB', 'US', 'FR', 'ES', 'NL', 'BE', 'AT', 'CH', 'CZ', 'DK', 'IE', 'PL', 'SE']

function readLines(path: string): string[] {
  if (!fs.existsSync(path)) { console.warn(`  ! missing ${path}`); return [] }
  return fs.readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 0)
}

async function insertChunks<T>(model: { createMany: (a: any) => Promise<any> }, rows: T[], label: string, size = 2000) {
  let done = 0
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size)
    const res = await model.createMany({ data: chunk as any, skipDuplicates: true })
    done += res?.count ?? 0
  }
  console.log(`  + ${label}: inserted ${done} (of ${rows.length} candidates)`) 
  return done
}

async function main() {
  const countries = await prisma.country.findMany({ select: { id: true, iso2: true } })
  const byIso = new Map(countries.map((c) => [c.iso2, c.id]))
  console.log(`Countries in master: ${countries.length}`)

  // 1) Regions / States (admin1)
  const adm1 = readLines(`${DIR}/admin1.txt`)
  const regionRows: Array<{ countryId: string; name: string; code: string | null }> = []
  const regionSeen = new Set<string>()
  for (const line of adm1) {
    const cols = line.split('\t')
    const code = cols[0] ?? ''; const name = cols[1] ?? ''
    const [cc, rcode] = code.split('.')
    const cid = byIso.get(cc)
    if (!cid || !name) continue
    const key = `${cid}|${name}`
    if (regionSeen.has(key)) continue
    regionSeen.add(key)
    regionRows.push({ countryId: cid, name, code: rcode || null })
  }
  await insertChunks(prisma.region, regionRows, 'regions')

  // Region lookup: countryId + admin1 code -> regionId
  const regions = await prisma.region.findMany({ select: { id: true, countryId: true, code: true } })
  const regByCode = new Map<string, string>()
  for (const r of regions) if (r.code) regByCode.set(`${r.countryId}|${r.code}`, r.id)

  // 2) Cities (cities15000 — global, population > 15k)
  const cityLines = readLines(`${DIR}/cities15000.txt`)
  const existingCities = await prisma.city.findMany({ select: { countryId: true, name: true, regionId: true } })
  const citySeen = new Set(existingCities.map((c) => `${c.countryId}|${c.name}|${c.regionId ?? ''}`))
  const cityRows: Array<{ countryId: string; name: string; regionId: string | null }> = []
  for (const line of cityLines) {
    const cols = line.split('\t')
    const name = cols[1] ?? ''; const iso2 = cols[8] ?? ''; const adm1 = cols[10] ?? ''
    const cid = byIso.get(iso2)
    if (!cid || !name) continue
    const rid = regByCode.get(`${cid}|${adm1}`) ?? null
    const key = `${cid}|${name}|${rid ?? ''}`
    if (citySeen.has(key)) continue
    citySeen.add(key)
    cityRows.push({ countryId: cid, name, regionId: rid })
  }
  await insertChunks(prisma.city, cityRows, 'cities')

  // City lookup for postal linkage: countryId + lowercase name -> cityId (first match)
  const cities = await prisma.city.findMany({ select: { id: true, countryId: true, name: true } })
  const cityByName = new Map<string, string>()
  for (const c of cities) { const k = `${c.countryId}|${c.name.toLowerCase()}`; if (!cityByName.has(k)) cityByName.set(k, c.id) }

  // 3) Postal codes (per country, deduped by code)
  let postalTotal = 0
  for (const cc of POSTAL_CC) {
    const cid = byIso.get(cc)
    if (!cid) { console.warn(`  ! no country row for ${cc}`); continue }
    const lines = readLines(`${DIR}/${cc}.txt`)
    if (!lines.length) continue
    const existing = await prisma.postalCode.findMany({ where: { countryId: cid }, select: { code: true } })
    const seen = new Set(existing.map((p) => p.code))
    const rows: Array<{ countryId: string; code: string; placeName: string | null; cityId: string | null }> = []
    for (const line of lines) {
      const cols = line.split('\t')
      const code = cols[1] ?? ''; const place = cols[2] ?? ''
      if (!code) continue
      if (seen.has(code)) continue
      seen.add(code)
      const cityId = place ? (cityByName.get(`${cid}|${place.toLowerCase()}`) ?? null) : null
      rows.push({ countryId: cid, code, placeName: place || null, cityId })
    }
    postalTotal += await insertChunks(prisma.postalCode, rows, `postal ${cc}`)
  }

  const [rC, cC, pC] = await Promise.all([prisma.region.count(), prisma.city.count(), prisma.postalCode.count()])
  console.log(`\nDONE. Totals -> regions: ${rC}, cities: ${cC}, postal codes: ${pC} (postal inserted this run: ${postalTotal})`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
