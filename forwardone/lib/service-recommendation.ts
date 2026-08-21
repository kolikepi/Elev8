// Sprint 2.2 Phase C — Service recommendation engine.
//
// Produces a SUGGESTION only. It never auto-assigns a service, never sends anything to a customer and
// never invents a price. The administrator always makes the final decision.
//
// Design principle (core requirement): a service is NEVER recommended on total actual weight alone.
// A 50 kg shipment must not become Road Freight just because it is heavy. Every eligible configured
// service is scored across many factors — the customer-selected category and carrier preference,
// import/export direction, origin/destination country + zone availability, per-service volumetric
// divisor and the resulting volumetric/chargeable weight, active service restrictions (per-piece and
// shipment weight, dimensions, girth, piece count, prohibited/non-conveyable types), dangerous-goods
// status, remote-area status, tariff availability (a suggested carrier cost when a tariff matches, or a
// manual-rate flag when it does not) and transit-time configuration.
//
// The customer's chosen category is respected unless it is clearly unsuitable. When it may be
// unsuitable the engine NEVER silently replaces it: it raises a categoryWarning, keeps the customer's
// category services in the list and offers eligible alternatives with an explanation.

import {
  PieceInput, calcShipment, resolveVolumetricRule, round2, toCm, toKg,
} from '@/lib/piece-calc'
import { buildRateResult } from '@/lib/rate-engine'

export type RecommendationInput = {
  serviceCategory?: string
  customerCarrierPreference?: string | null
  aiRecommendation?: Array<{ name?: string; carrier?: string }> | null
  direction?: string
  originCountry?: string
  originCity?: string
  originPostalCode?: string
  destCountry?: string
  destCity?: string
  destPostalCode?: string
  pieces: PieceInput[]
  headerWeightKg?: number
  headerPieces?: number
  dangerousGoods?: boolean
  unNumber?: string | null
  dangerousGoodsClass?: string | null
  currency?: string
  date?: Date | string | null
}

export type RecommendationRow = {
  carrier: string
  service: string
  category: string
  transitTime: string | null
  divisor: number
  divisorStatus: string
  actualWeight: number
  volumetricWeight: number
  chargeableWeight: number
  volumeM3: number
  eligible: boolean
  eligibilityReasons: string[]
  ineligibleReasons: string[]
  restrictionWarnings: string[]
  zone: string | null
  zoneAvailable: boolean | null
  remoteArea: boolean
  dgEligible: boolean | null
  tariffAvailable: boolean
  manualRateRequired: boolean
  tariffVersionId: string | null
  tariffVersionName: string | null
  suggestedCarrierCost: number | null
  isCustomerCategory: boolean
  isCustomerPreference: boolean
  isAiRecommended: boolean
  score: number
}

export type RecommendationResult = {
  customerCategory: string | null
  customerCarrierPreference: string | null
  aiRecommendation: Array<{ name?: string; carrier?: string }>
  systemRecommendation: { carrier: string; service: string; category: string } | null
  services: RecommendationRow[]
  eligible: RecommendationRow[]
  alternatives: RecommendationRow[]
  ineligible: RecommendationRow[]
  categoryWarning: string | null
  notes: string[]
}

const norm = (v: unknown): string => String(v ?? '').trim().toUpperCase()
const looseMatch = (a: unknown, b: unknown): boolean => { const x = norm(a); const y = norm(b); if (!x || !y) return false; return x === y || x.includes(y) || y.includes(x) }
const pos = (v: unknown): number => { const p = Number(v); return Number.isFinite(p) && p > 0 ? p : 0 }

// Find the CountryZoneMapping row for a carrier + category + destination country, if configured.
function findZone(zoneMaps: any[], carrier: string, category: string, direction: string, destCountry: string) {
  const dc = norm(destCountry)
  if (!dc) return null
  const candidates = (Array.isArray(zoneMaps) ? zoneMaps : []).filter((z) => z?.isActive !== false)
    .filter((z) => (!z?.carrier || looseMatch(z.carrier, carrier)))
    .filter((z) => (!z?.serviceCategory || norm(z.serviceCategory) === norm(category)))
    .filter((z) => {
      const names = [z?.countryName, z?.isoAlpha2, z?.isoAlpha3, z?.carrierCountryName].map((x) => norm(x)).filter(Boolean)
      return names.includes(dc)
    })
  if (!candidates.length) return null
  // Prefer the most specific mapping (carrier + category named).
  candidates.sort((a, b) => ((b?.carrier ? 1 : 0) + (b?.serviceCategory ? 1 : 0)) - ((a?.carrier ? 1 : 0) + (a?.serviceCategory ? 1 : 0)))
  const row = candidates[0]
  const zone = String((direction === 'IMPORT' ? row?.importZone : row?.exportZone) ?? '')
  return { zone: zone || null, serviceAvailable: row?.serviceAvailable !== false, remoteArea: row?.remoteArea === true }
}

// Evaluate active ServiceRestriction rows for a carrier + category + destination. Some breaches are hard
// (they make the service ineligible); others are soft warnings surfaced to the admin.
function evaluateRestrictions(restrictions: any[], pieces: PieceInput[], opts: { carrier: string; category: string; destCountry: string; dangerousGoods: boolean }) {
  const hard: string[] = []
  const soft: string[] = []
  let dgEligible: boolean | null = null
  const cat = norm(opts.category)
  const carrier = norm(opts.carrier)
  const country = norm(opts.destCountry)
  const rules = (Array.isArray(restrictions) ? restrictions : []).filter((r) => r?.isActive !== false).filter((r) => {
    if (r?.serviceCategory && cat && norm(r.serviceCategory) !== cat) return false
    if (r?.carrier && carrier && !looseMatch(r.carrier, carrier)) return false
    if (r?.country && country && norm(r.country) !== country) return false
    return true
  })
  if (!rules.length) return { hard, soft, dgEligible }
  const list = Array.isArray(pieces) ? pieces : []
  let totalPieces = 0
  let totalActual = 0
  const perPiece = list.map((p) => {
    const q = Math.max(1, Math.floor(Number(p?.quantity) || 1))
    const l = toCm(pos(p?.length), p?.dimensionUnit)
    const w = toCm(pos(p?.width), p?.dimensionUnit)
    const h = toCm(pos(p?.height), p?.dimensionUnit)
    const wt = toKg(pos(p?.weight), p?.weightUnit)
    totalPieces += q
    totalActual += wt * q
    return { q, l, w, h, wt, girth: l + 2 * (w + h), type: norm(p?.packageType) }
  })
  for (const r of rules) {
    if (opts.dangerousGoods && r?.restrictedGoods) { const rg = String(r.restrictedGoods).toUpperCase(); if (rg.includes('DG') || rg.includes('DANGEROUS') || rg.includes('HAZARD')) { dgEligible = false; hard.push(`Dangerous goods are not accepted on this service (${String(r?.restrictedGoods)}).`) } }
    for (const pc of perPiece) {
      if (r?.maxWeightPerPiece != null && pc.wt > Number(r.maxWeightPerPiece)) hard.push(`A piece of ${round2(pc.wt)} kg exceeds the ${Number(r.maxWeightPerPiece)} kg per-piece limit.`)
      if (r?.maxLength != null && pc.l > Number(r.maxLength)) hard.push(`A piece length of ${round2(pc.l)} cm exceeds the ${Number(r.maxLength)} cm limit.`)
      if (r?.maxWidth != null && pc.w > Number(r.maxWidth)) hard.push(`A piece width of ${round2(pc.w)} cm exceeds the ${Number(r.maxWidth)} cm limit.`)
      if (r?.maxHeight != null && pc.h > Number(r.maxHeight)) hard.push(`A piece height of ${round2(pc.h)} cm exceeds the ${Number(r.maxHeight)} cm limit.`)
      if (r?.maxLengthGirth != null && pc.girth > Number(r.maxLengthGirth)) hard.push(`A piece length+girth of ${round2(pc.girth)} cm exceeds the ${Number(r.maxLengthGirth)} cm limit.`)
      if (r?.nonConveyable === true && pc.type && ['PALLET', 'CRATE', 'DRUM'].includes(pc.type)) soft.push(`${pc.type} may be non-conveyable on this service and could need special handling.`)
      if (r?.prohibitedTypes && pc.type) { const banned = String(r.prohibitedTypes).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean); if (banned.includes(pc.type)) hard.push(`Package type ${pc.type} is not accepted on this service.`) }
    }
    if (r?.maxPieces != null && totalPieces > Number(r.maxPieces)) hard.push(`${totalPieces} pieces exceeds the ${Number(r.maxPieces)}-piece limit for this service.`)
    if (r?.maxShipmentWeight != null && totalActual > Number(r.maxShipmentWeight)) hard.push(`Total weight ${round2(totalActual)} kg exceeds the ${Number(r.maxShipmentWeight)} kg shipment limit for this service.`)
    if (r?.serviceAvailable === false) hard.push('This service is flagged unavailable for the selected route.')
  }
  // De-duplicate messages.
  return { hard: Array.from(new Set(hard)), soft: Array.from(new Set(soft)), dgEligible }
}

export function recommendServices(input: RecommendationInput, data: {
  carrierServices: any[]
  volumetricRules: any[]
  restrictions: any[]
  zoneMaps: any[]
  tariffVersions: any[] // active versions, each with .rows
  surcharges: any[]
}): RecommendationResult {
  const customerCategory = input?.serviceCategory ? norm(input.serviceCategory) : null
  const preference = input?.customerCarrierPreference ? String(input.customerCarrierPreference) : null
  const direction = norm(input?.direction) || 'EXPORT'
  const originCountry = String(input?.originCountry ?? '')
  const destCountry = String(input?.destCountry ?? '')
  const date = input?.date ?? new Date()
  const aiRec = Array.isArray(input?.aiRecommendation) ? input!.aiRecommendation! : []
  const pieces = Array.isArray(input?.pieces) ? input.pieces : []
  const currency = String(input?.currency ?? 'EUR')

  const services = (Array.isArray(data?.carrierServices) ? data.carrierServices : []).filter((s) => s?.isActive !== false)
  const rows: RecommendationRow[] = services.map((svc) => {
    const carrier = String(svc?.carrier ?? '')
    const service = String(svc?.name ?? '')
    const category = norm(svc?.category)
    const resolution = resolveVolumetricRule(data?.volumetricRules as any, { serviceCategory: category, carrier, service, originCountry, destCountry, direction, date })
    const { totals } = calcShipment(pieces, resolution.divisor)
    const actualWeight = totals.actualWeight > 0 ? totals.actualWeight : pos(input?.headerWeightKg)
    const chargeableWeight = totals.chargeableWeight > 0 ? totals.chargeableWeight : actualWeight
    const totalPieces = totals.totalPieces > 0 ? totals.totalPieces : Math.max(1, Math.floor(pos(input?.headerPieces)))
    const palletCount = pieces.filter((p) => norm(p?.packageType) === 'PALLET').reduce((s, p) => s + (Math.max(1, Math.floor(Number(p?.quantity) || 1))), 0)

    const zoneInfo = findZone(data?.zoneMaps as any, carrier, category, direction, destCountry)
    const zone = zoneInfo?.zone ?? null
    const zoneAvailable = zoneInfo ? zoneInfo.serviceAvailable : null
    const remoteArea = zoneInfo?.remoteArea === true

    const restr = evaluateRestrictions(data?.restrictions as any, pieces, { carrier, category, destCountry, dangerousGoods: input?.dangerousGoods === true })

    // Tariff availability + suggested carrier cost for this specific service.
    const versions = (Array.isArray(data?.tariffVersions) ? data.tariffVersions : []).filter((v) => norm(v?.serviceCategory) === category && (!v?.carrier || looseMatch(v.carrier, carrier)))
    const tariffRows = versions.flatMap((v: any) => (v?.rows ?? []).map((r: any) => ({ ...r, currency: r?.currency ?? v?.currency })))
    const rate = buildRateResult({ rows: tariffRows, surcharges: data?.surcharges as any, ctx: { direction, zone, originCountry, destCountry, chargeableWeight, totalPieces, palletCount }, carrier, serviceCategory: category, currency })
    const tariffAvailable = rate.status === 'CALCULATED'
    const tariffVersion = versions.find((v: any) => (v?.rows ?? []).some((r: any) => r?.id === rate.matchedRowId)) ?? null

    const eligibilityReasons: string[] = []
    const ineligibleReasons: string[] = [...restr.hard]
    if (zoneAvailable === false) ineligibleReasons.push('The carrier does not serve the destination country on this service.')
    if (resolution.status === 'MANUAL_REQUIRED') eligibilityReasons.push('No volumetric rule configured — chargeable weight and rate need manual review.')

    if (customerCategory && category === customerCategory) eligibilityReasons.push('Matches the customer-selected service category.')
    if (preference && (looseMatch(carrier, preference) || looseMatch(service, preference))) eligibilityReasons.push('Matches the customer carrier/service preference.')
    if (zone) eligibilityReasons.push(`Destination is in ${direction === 'IMPORT' ? 'import' : 'export'} zone ${zone}.`)
    if (tariffAvailable) eligibilityReasons.push('An active tariff covers this lane and weight.')
    else eligibilityReasons.push('No active tariff matches — a manual rate is required.')
    if (remoteArea) eligibilityReasons.push('Destination is flagged as a remote area (surcharge may apply).')

    const eligible = ineligibleReasons.length === 0

    // Scoring — deliberately multi-factor, NEVER weight-only. Ineligible services get a floor score so
    // they can still be shown (with reasons) but never win the recommendation.
    let score = 0
    if (customerCategory && category === customerCategory) score += 50
    if (preference && (looseMatch(carrier, preference) || looseMatch(service, preference))) score += 30
    if (tariffAvailable) score += 20
    if (resolution.status === 'RESOLVED') score += 10
    if (zone) score += 5
    if (zoneAvailable === true) score += 5
    if (restr.soft.length) score -= 3 * restr.soft.length
    if (remoteArea) score -= 2
    // Lighter chargeable weight is a small tie-breaker within eligible services (never the primary driver).
    if (chargeableWeight > 0) score += Math.max(0, 10 - Math.min(10, chargeableWeight / 100))
    if (!eligible) score = -100 - ineligibleReasons.length

    return {
      carrier, service, category, transitTime: svc?.transitDays ? String(svc.transitDays) : null,
      divisor: resolution.divisor, divisorStatus: resolution.status,
      actualWeight, volumetricWeight: totals.volumetricWeight, chargeableWeight, volumeM3: totals.volumeM3,
      eligible, eligibilityReasons, ineligibleReasons, restrictionWarnings: restr.soft,
      zone, zoneAvailable, remoteArea, dgEligible: restr.dgEligible,
      tariffAvailable, manualRateRequired: !tariffAvailable, tariffVersionId: tariffVersion?.id ?? null, tariffVersionName: tariffVersion?.name ?? null,
      suggestedCarrierCost: tariffAvailable ? round2(rate.carrierCostSubtotal) : null,
      isCustomerCategory: customerCategory ? category === customerCategory : false,
      isCustomerPreference: preference ? (looseMatch(carrier, preference) || looseMatch(service, preference)) : false,
      isAiRecommended: aiRec.some((a) => looseMatch(a?.name, service) || looseMatch(a?.carrier, carrier)),
      score: round2(score),
    }
  })

  rows.sort((a, b) => b.score - a.score)
  const eligible = rows.filter((r) => r.eligible)
  const ineligible = rows.filter((r) => !r.eligible)

  // System recommendation: the highest-scoring ELIGIBLE service. When the customer picked a category we
  // prefer an eligible service in that category so we respect their choice; we only look outside it when
  // that category has no eligible service at all.
  let systemRecommendation: RecommendationRow | null = null
  if (customerCategory) {
    const inCat = eligible.filter((r) => r.category === customerCategory)
    systemRecommendation = inCat[0] ?? eligible[0] ?? null
  } else {
    systemRecommendation = eligible[0] ?? null
  }

  // Category suitability warning — never silently replace the customer's category.
  let categoryWarning: string | null = null
  const notes: string[] = []
  if (customerCategory) {
    const inCatEligible = eligible.filter((r) => r.category === customerCategory)
    const inCatAny = rows.filter((r) => r.category === customerCategory)
    if (inCatAny.length === 0) {
      categoryWarning = `No configured service exists for the customer-selected category (${customerCategory}). Review the alternatives below before quoting.`
    } else if (inCatEligible.length === 0) {
      categoryWarning = `The customer-selected category (${customerCategory}) has no eligible service for this shipment/lane (see the ineligibility reasons). Do not silently change it — consider the eligible alternatives and explain the recommendation to the customer.`
    }
  }
  if (systemRecommendation && customerCategory && systemRecommendation.category !== customerCategory) {
    notes.push(`The best eligible service (${systemRecommendation.carrier} · ${systemRecommendation.service}) is outside the customer-selected category. This is a suggestion only — confirm with the customer before changing the category.`)
  }

  const alternatives = eligible.filter((r) => !systemRecommendation || !(r.carrier === systemRecommendation.carrier && r.service === systemRecommendation.service))

  return {
    customerCategory, customerCarrierPreference: preference, aiRecommendation: aiRec,
    systemRecommendation: systemRecommendation ? { carrier: systemRecommendation.carrier, service: systemRecommendation.service, category: systemRecommendation.category } : null,
    services: rows, eligible, alternatives, ineligible, categoryWarning, notes,
  }
}
