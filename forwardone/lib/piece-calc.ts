// Multi-piece shipment calculations — shared by the quote form, the quotes API and the AI assistant.
// All maths is pure so it can run identically on client and server. Nothing here is hardcoded to a
// single divisor: the volumetric divisor is always supplied by an admin-configured VolumetricRule.

export type PieceInput = {
  id?: string
  packageType?: string
  quantity?: number | string
  length?: number | string
  width?: number | string
  height?: number | string
  dimensionUnit?: string // CM | IN | M
  weight?: number | string
  weightUnit?: string // KG | LB
  stackable?: boolean
  description?: string
  reference?: string
  customerRef?: string
}

export type PieceResult = {
  quantity: number
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg: number
  actualWeight: number // total for the row (unit weight * quantity)
  volumetricWeight: number // total for the row
  chargeableWeight: number // total for the row
  volumeM3: number // total for the row
}

export type ShipmentTotals = {
  totalPieces: number
  actualWeight: number
  volumetricWeight: number
  chargeableWeight: number
  volumeM3: number
  divisor: number
}

const n = (value: unknown): number => { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0 }
const count = (value: unknown): number => { const parsed = Math.floor(Number(value)); return Number.isFinite(parsed) && parsed > 0 ? parsed : 1 }

export function toCm(value: number, unit?: string): number {
  const u = String(unit ?? 'CM').toUpperCase()
  if (u === 'IN') return value * 2.54
  if (u === 'M') return value * 100
  return value
}
export function toKg(value: number, unit?: string): number {
  const u = String(unit ?? 'KG').toUpperCase()
  if (u === 'LB') return value * 0.45359237
  return value
}

export function round2(value: number): number { return Math.round((Number(value) + Number.EPSILON) * 100) / 100 }

// ---- Carrier- and service-specific volumetric rule resolution (Sprint 2.2 Phase B) ----
// Rules are resolved against an explicit five-level priority hierarchy. The volumetric divisor is
// ALWAYS taken from an admin-configured VolumetricRule record — nothing here is hardcoded. When no
// active, in-date rule matches the query the resolver returns status MANUAL_REQUIRED (divisor 0) so
// callers can flag "manual review required" instead of silently inventing a divisor.

export type VolumetricQuery = {
  serviceCategory?: string
  carrier?: string
  service?: string
  originCountry?: string
  destCountry?: string
  direction?: string
  packageType?: string
  date?: Date | string | null
}

export type VolumetricResolution = {
  divisor: number
  rule: Record<string, any> | null
  ruleId: string | null
  ruleName: string | null
  priorityLevel: number | null // 1 = most specific ... 5 = global default
  priorityLabel: string
  formula: string // e.g. "(L × W × H) / 4000"
  fallbackUsed: boolean
  conflict: boolean
  conflictingRules: Array<{ id: string | null; name: string | null; divisor: number }>
  status: 'RESOLVED' | 'MANUAL_REQUIRED'
  warnings: string[]
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Carrier + Service + Origin + Destination',
  2: 'Carrier + Service',
  3: 'Carrier default',
  4: 'Service-category default',
  5: 'Global default',
}

const norm = (value: unknown): string => String(value ?? '').trim().toUpperCase()
// Carrier / service labels vary between the tariff sheets, the carrier-service catalogue and the admin
// free-text field, so these are matched tolerantly (exact, or one string contained in the other).
const looseMatch = (ruleVal: unknown, queryVal: unknown): boolean => { const r = norm(ruleVal); if (!r) return true; const q = norm(queryVal); if (!q) return false; return r === q || q.includes(r) || r.includes(q) }

function withinDates(rule: Record<string, any>, date?: Date | string | null): boolean {
  const d = date ? new Date(date) : new Date()
  if (Number.isNaN(d.getTime())) return true
  const from = rule?.effectiveFrom ? new Date(rule.effectiveFrom) : null
  const to = rule?.effectiveTo ? new Date(rule.effectiveTo) : null
  if (from && !Number.isNaN(from.getTime()) && d < from) return false
  if (to && !Number.isNaN(to.getTime()) && d > to) return false
  return true
}

// A rule is eligible when every field it constrains matches the query. Empty fields act as wildcards.
// Carrier/service use tolerant matching; country/category/direction/packageType use exact (normalised)
// matching and are only enforced when the query supplies that value.
function ruleEligible(rule: Record<string, any>, q: VolumetricQuery): boolean {
  if (rule?.isActive === false) return false
  if (rule?.archivedAt) return false
  if (!withinDates(rule, q?.date)) return false
  if (rule?.carrier && !looseMatch(rule.carrier, q?.carrier)) return false
  if (rule?.service && !looseMatch(rule.service, q?.service)) return false
  if (rule?.serviceCategory && q?.serviceCategory && norm(rule.serviceCategory) !== norm(q?.serviceCategory)) return false
  if (rule?.direction && q?.direction && norm(rule.direction) !== norm(q?.direction)) return false
  if (rule?.originCountry && q?.originCountry && norm(rule.originCountry) !== norm(q?.originCountry)) return false
  if (rule?.destCountry && q?.destCountry && norm(rule.destCountry) !== norm(q?.destCountry)) return false
  if (rule?.packageType && q?.packageType && norm(rule.packageType) !== norm(q?.packageType)) return false
  return true
}

// Map a rule to its position in the five-level hierarchy based on the fields it constrains.
function ruleLevel(rule: Record<string, any>): number {
  const c = !!rule?.carrier, s = !!rule?.service, o = !!rule?.originCountry, d = !!rule?.destCountry, cat = !!rule?.serviceCategory
  if (c && s && o && d) return 1
  if (c && s) return 2
  if (c) return 3
  if (cat) return 4
  return 5
}

export function resolveVolumetricRule(rules: Array<Record<string, any>> | undefined, q: VolumetricQuery): VolumetricResolution {
  const base: VolumetricResolution = { divisor: 0, rule: null, ruleId: null, ruleName: null, priorityLevel: null, priorityLabel: 'Not configured', formula: '', fallbackUsed: false, conflict: false, conflictingRules: [], status: 'MANUAL_REQUIRED', warnings: [] }
  const list = Array.isArray(rules) ? rules : []
  const eligible = list.filter((r) => ruleEligible(r, q))
  if (!eligible.length) return { ...base, warnings: ['No active volumetric rule matches this carrier, service and lane for the quotation date — manual review required.'] }
  const scored = eligible.map((r) => ({ rule: r, level: ruleLevel(r), priority: Number(r?.priority ?? 100) }))
  scored.sort((a, b) => (a.level - b.level) || (a.priority - b.priority))
  const best = scored[0]
  const divisor = Number(best?.rule?.divisor ?? 0)
  const valid = Number.isFinite(divisor) && divisor > 0
  // Conflict: another eligible rule at the same level & priority number but a different divisor.
  const peers = scored.filter((s) => s.level === best.level && s.priority === best.priority)
  const distinctDivisors = Array.from(new Set(peers.map((p) => Number(p.rule?.divisor ?? 0))))
  const conflict = peers.length > 1 && distinctDivisors.length > 1
  const warnings: string[] = []
  if (!valid) warnings.push(`Matched rule "${best?.rule?.name ?? ''}" has an invalid divisor — manual review required.`)
  if (conflict) warnings.push(`Conflicting volumetric rules at the same priority: ${peers.map((p) => p.rule?.name).filter(Boolean).join(', ')}. Applied "${best?.rule?.name}" (÷${divisor}) — please review.`)
  return {
    divisor: valid ? divisor : 0,
    rule: best?.rule ?? null, ruleId: best?.rule?.id ?? null, ruleName: best?.rule?.name ?? null,
    priorityLevel: best?.level ?? null, priorityLabel: PRIORITY_LABELS[best?.level] ?? 'Rule',
    formula: valid ? `(L × W × H) / ${divisor}` : '',
    fallbackUsed: (best?.level ?? 5) >= 4,
    conflict, conflictingRules: conflict ? peers.map((p) => ({ id: p.rule?.id ?? null, name: p.rule?.name ?? null, divisor: Number(p.rule?.divisor ?? 0) })) : [],
    status: valid ? 'RESOLVED' : 'MANUAL_REQUIRED', warnings,
  }
}

// Backward-compatible thin wrapper — returns just the divisor (0 when nothing resolves). Used by the
// customer quote form and the public quotes API where only the number is needed.
export function resolveDivisor(rules: Array<Record<string, any>> | undefined, opts: VolumetricQuery): number {
  return resolveVolumetricRule(rules, opts).divisor
}

export type ServiceComparisonRow = {
  carrier: string
  service: string
  category: string
  divisor: number
  ruleName: string | null
  priorityLabel: string
  fallbackUsed: boolean
  conflict: boolean
  status: string
  totalActualWeight: number
  totalVolumetricWeight: number
  totalChargeableWeight: number
}

// Admin-only: compute volumetric + chargeable weight for EVERY eligible configured service so an
// administrator can compare divisors side by side before selecting the final carrier/service. This is
// never surfaced to customers — it exposes internal service configuration.
export function compareServices(services: Array<Record<string, any>> | undefined, rules: Array<Record<string, any>> | undefined, pieces: PieceInput[], opts: { serviceCategory?: string; originCountry?: string; destCountry?: string; direction?: string; date?: Date | string | null }): ServiceComparisonRow[] {
  const cat = opts?.serviceCategory ? String(opts.serviceCategory) : ''
  const list = (Array.isArray(services) ? services : []).filter((s) => s?.isActive !== false && (!cat || norm(s?.category) === norm(cat)))
  return list.map((svc) => {
    const res = resolveVolumetricRule(rules, { serviceCategory: String(svc?.category ?? cat), carrier: String(svc?.carrier ?? ''), service: String(svc?.name ?? ''), originCountry: opts?.originCountry, destCountry: opts?.destCountry, direction: opts?.direction, date: opts?.date })
    const { totals } = calcShipment(pieces, res.divisor)
    return { carrier: String(svc?.carrier ?? ''), service: String(svc?.name ?? ''), category: String(svc?.category ?? ''), divisor: res.divisor, ruleName: res.ruleName, priorityLabel: res.priorityLabel, fallbackUsed: res.fallbackUsed, conflict: res.conflict, status: res.status, totalActualWeight: totals.actualWeight, totalVolumetricWeight: totals.volumetricWeight, totalChargeableWeight: totals.chargeableWeight }
  })
}

export function calcPiece(piece: PieceInput, divisor: number): PieceResult {
  const quantity = count(piece?.quantity)
  const lengthCm = round2(toCm(n(piece?.length), piece?.dimensionUnit))
  const widthCm = round2(toCm(n(piece?.width), piece?.dimensionUnit))
  const heightCm = round2(toCm(n(piece?.height), piece?.dimensionUnit))
  const weightKg = round2(toKg(n(piece?.weight), piece?.weightUnit))
  const unitVolumeM3 = (lengthCm * widthCm * heightCm) / 1_000_000
  const unitVolumetric = divisor > 0 ? (lengthCm * widthCm * heightCm) / divisor : 0
  const unitChargeable = Math.max(weightKg, unitVolumetric)
  return {
    quantity,
    lengthCm, widthCm, heightCm, weightKg,
    actualWeight: round2(weightKg * quantity),
    volumetricWeight: round2(unitVolumetric * quantity),
    chargeableWeight: round2(unitChargeable * quantity),
    volumeM3: round2(unitVolumeM3 * quantity),
  }
}

export function calcShipment(pieces: PieceInput[], divisor: number): { rows: PieceResult[]; totals: ShipmentTotals } {
  const rows = (Array.isArray(pieces) ? pieces : []).map((p) => calcPiece(p, divisor))
  const totals: ShipmentTotals = {
    totalPieces: rows.reduce((sum, r) => sum + (r?.quantity ?? 0), 0),
    actualWeight: round2(rows.reduce((sum, r) => sum + (r?.actualWeight ?? 0), 0)),
    volumetricWeight: round2(rows.reduce((sum, r) => sum + (r?.volumetricWeight ?? 0), 0)),
    chargeableWeight: round2(rows.reduce((sum, r) => sum + (r?.chargeableWeight ?? 0), 0)),
    volumeM3: round2(rows.reduce((sum, r) => sum + (r?.volumeM3 ?? 0), 0)),
    divisor,
  }
  return { rows, totals }
}

export type ValidationWarning = { pieceNumber: number | null; code: string; message: string; limitType: string | null }

// Compare a shipment against active ServiceRestriction rows for the chosen category/carrier and return
// human-readable warnings. Warnings never block submission — they are surfaced to the customer and
// recorded so an admin can approve or reject with full context.
export function validatePieces(pieces: PieceInput[], restrictions: Array<Record<string, any>> | undefined, opts: { serviceCategory?: string; carrier?: string; destCountry?: string }): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const list = Array.isArray(restrictions) ? restrictions.filter((r) => r?.isActive !== false) : []
  const cat = opts?.serviceCategory ? String(opts.serviceCategory) : ''
  const carrier = opts?.carrier ? String(opts.carrier) : ''
  const country = opts?.destCountry ? String(opts.destCountry).toUpperCase() : ''
  const rules = list.filter((r) => {
    if (r?.serviceCategory && cat && String(r.serviceCategory) !== cat) return false
    if (r?.carrier && carrier && String(r.carrier) !== carrier) return false
    if (r?.country && country && String(r.country).toUpperCase() !== country) return false
    return true
  })
  if (!rules.length) return warnings
  const totalPieces = (Array.isArray(pieces) ? pieces : []).reduce((sum, p) => sum + count(p?.quantity), 0)
  let totalActual = 0
  ;(Array.isArray(pieces) ? pieces : []).forEach((piece, index) => {
    const pieceNo = index + 1
    const q = count(piece?.quantity)
    const l = toCm(n(piece?.length), piece?.dimensionUnit)
    const w = toCm(n(piece?.width), piece?.dimensionUnit)
    const h = toCm(n(piece?.height), piece?.dimensionUnit)
    const wt = toKg(n(piece?.weight), piece?.weightUnit)
    totalActual += wt * q
    const girth = l + 2 * (w + h)
    const type = String(piece?.packageType ?? '').toUpperCase()
    for (const r of rules) {
      if (r?.maxWeightPerPiece != null && wt > Number(r.maxWeightPerPiece)) warnings.push({ pieceNumber: pieceNo, code: 'MAX_WEIGHT_PER_PIECE', limitType: 'weight', message: `Piece ${pieceNo}: ${round2(wt)} kg exceeds the ${Number(r.maxWeightPerPiece)} kg per-piece limit for ${cat || 'this service'}.` })
      if (r?.maxLength != null && l > Number(r.maxLength)) warnings.push({ pieceNumber: pieceNo, code: 'MAX_LENGTH', limitType: 'dimension', message: `Piece ${pieceNo}: length ${round2(l)} cm exceeds the ${Number(r.maxLength)} cm limit.` })
      if (r?.maxWidth != null && w > Number(r.maxWidth)) warnings.push({ pieceNumber: pieceNo, code: 'MAX_WIDTH', limitType: 'dimension', message: `Piece ${pieceNo}: width ${round2(w)} cm exceeds the ${Number(r.maxWidth)} cm limit.` })
      if (r?.maxHeight != null && h > Number(r.maxHeight)) warnings.push({ pieceNumber: pieceNo, code: 'MAX_HEIGHT', limitType: 'dimension', message: `Piece ${pieceNo}: height ${round2(h)} cm exceeds the ${Number(r.maxHeight)} cm limit.` })
      if (r?.maxLengthGirth != null && girth > Number(r.maxLengthGirth)) warnings.push({ pieceNumber: pieceNo, code: 'MAX_LENGTH_GIRTH', limitType: 'dimension', message: `Piece ${pieceNo}: length+girth ${round2(girth)} cm exceeds the ${Number(r.maxLengthGirth)} cm limit.` })
      if (r?.prohibitedTypes && type) { const banned = String(r.prohibitedTypes).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean); if (banned.includes(type)) warnings.push({ pieceNumber: pieceNo, code: 'PROHIBITED_TYPE', limitType: 'type', message: `Piece ${pieceNo}: package type ${type} is not accepted on ${cat || 'this service'}.` }) }
    }
  })
  for (const r of rules) {
    if (r?.maxPieces != null && totalPieces > Number(r.maxPieces)) warnings.push({ pieceNumber: null, code: 'MAX_PIECES', limitType: 'count', message: `Shipment has ${totalPieces} pieces, above the ${Number(r.maxPieces)}-piece limit for ${cat || 'this service'}.` })
    if (r?.maxShipmentWeight != null && totalActual > Number(r.maxShipmentWeight)) warnings.push({ pieceNumber: null, code: 'MAX_SHIPMENT_WEIGHT', limitType: 'weight', message: `Total weight ${round2(totalActual)} kg exceeds the ${Number(r.maxShipmentWeight)} kg shipment limit for ${cat || 'this service'}.` })
    if (r?.serviceAvailable === false) warnings.push({ pieceNumber: null, code: 'SERVICE_UNAVAILABLE', limitType: 'availability', message: `${cat || 'This service'} may not be available for the selected route — a specialist will confirm.` })
  }
  return warnings
}
