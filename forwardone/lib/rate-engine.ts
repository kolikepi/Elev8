// Carrier rate + surcharge engine — Sprint 2.1 Phase E.
// Pure, deterministic maths shared by the auto-calculation API. Nothing here is auto-sent: the output
// is a SUGGESTED breakdown that an administrator must review, adjust and approve. When no tariff matches
// the engine returns status MANUAL_REQUIRED and never invents a rate.

const num = (v: unknown): number => { const p = Number(v); return Number.isFinite(p) ? p : 0 }
const pos = (v: unknown): number => { const p = Number(v); return Number.isFinite(p) && p > 0 ? p : 0 }
export const round2 = (v: number): number => Math.round((Number(v) + Number.EPSILON) * 100) / 100

export type TariffRowLike = Record<string, any>
export type SurchargeLike = Record<string, any>

export type RateContext = {
  direction?: string | null
  zone?: string | null
  originCountry?: string | null
  destCountry?: string | null
  chargeableWeight: number
  totalPieces: number
  palletCount?: number
}

export type CalcLine = {
  code: string
  label: string
  basis?: string | null
  quantity?: number | null
  rate?: number | null
  amount: number
  taxable: boolean
  customerVisible: boolean
  sortOrder: number
}

export type RateResult = {
  status: 'CALCULATED' | 'MANUAL_REQUIRED'
  manualReason: string | null
  matchedRowId: string | null
  baseRate: number
  additionalKgCharge: number
  minChargeAdjustment: number
  surchargeTotal: number
  carrierCostSubtotal: number
  currency: string
  lines: CalcLine[]
}

const eqOrNull = (rule: unknown, value: string): boolean => { const r = rule == null ? '' : String(rule); if (!r) return true; return r.toUpperCase() === String(value ?? '').toUpperCase() }

// Pick the best matching active tariff row for the shipment. Rows are scored by specificity so a row
// naming the exact zone/lane beats a generic catch-all. Weight bands are inclusive of weightFrom and,
// when weightTo>0, of weightTo; weightTo===0 means "and above". Returns null when nothing matches.
export function matchTariffRow(rows: TariffRowLike[] | undefined, ctx: RateContext): TariffRowLike | null {
  const w = pos(ctx?.chargeableWeight)
  const zone = ctx?.zone ? String(ctx.zone).toUpperCase() : ''
  const origin = ctx?.originCountry ? String(ctx.originCountry).toUpperCase() : ''
  const dest = ctx?.destCountry ? String(ctx.destCountry).toUpperCase() : ''
  const dir = ctx?.direction ? String(ctx.direction).toUpperCase() : ''
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r?.isActive !== false)
  const scored: Array<{ row: TariffRowLike; score: number }> = []
  for (const r of list) {
    if (r?.direction && dir && String(r.direction).toUpperCase() !== dir) continue
    const from = num(r?.weightFrom)
    const to = num(r?.weightTo)
    const exact = pos(r?.exactWeight)
    let bandOk = false
    if (exact > 0) bandOk = Math.abs(exact - w) < 0.001 || (w > 0 && w <= exact)
    else if (to > 0) bandOk = w >= from && w <= to + 0.001
    else bandOk = w >= from
    if (!bandOk) continue
    let score = 0
    const rZone = [r?.zone, r?.destZone, r?.importZone, r?.exportZone].map((x) => (x == null ? '' : String(x).toUpperCase())).filter(Boolean)
    if (zone) { if (rZone.length && rZone.includes(zone)) score += 4; else if (rZone.length) continue }
    if (r?.destCountry && dest) { if (String(r.destCountry).toUpperCase() === dest) score += 3; else continue }
    if (r?.originCountry && origin) { if (String(r.originCountry).toUpperCase() === origin) score += 2; else continue }
    if (r?.direction && dir) score += 1
    if (exact > 0) score += 1
    scored.push({ row: r, score })
  }
  if (!scored.length) return null
  scored.sort((a, b) => (b.score - a.score) || (num(a.row?.weightTo) || 1e9) - (num(b.row?.weightTo) || 1e9))
  return scored[0]?.row ?? null
}

// Base carrier charge from a matched row. Supports per-kg cards, flat per-band cards, an optional
// additional-kg rate above the band ceiling, and min/max charge clamping.
export function computeBaseRate(row: TariffRowLike, chargeableWeight: number): { baseRate: number; additionalKgCharge: number; minChargeAdjustment: number; amount: number } {
  const w = pos(chargeableWeight)
  const ratePerKg = pos(row?.ratePerKg)
  const flat = pos(row?.flatRate)
  const addRate = pos(row?.additionalKgRate)
  const to = num(row?.weightTo)
  const minCharge = pos(row?.minCharge)
  const maxCharge = pos(row?.maxCharge)
  let baseRate = 0
  let additionalKgCharge = 0
  if (ratePerKg > 0) {
    baseRate = round2(ratePerKg * w)
    if (addRate > 0 && to > 0 && w > to) additionalKgCharge = round2(addRate * (w - to))
  } else if (flat > 0) {
    baseRate = round2(flat)
    if (addRate > 0 && to > 0 && w > to) additionalKgCharge = round2(addRate * (w - to))
  }
  let amount = round2(baseRate + additionalKgCharge)
  let minChargeAdjustment = 0
  if (minCharge > 0 && amount < minCharge) { minChargeAdjustment = round2(minCharge - amount); amount = minCharge }
  if (maxCharge > 0 && amount > maxCharge) { amount = maxCharge }
  return { baseRate, additionalKgCharge, minChargeAdjustment, amount: round2(amount) }
}

// Match + apply active surcharge rules against a base carrier amount. Each rule becomes one line so the
// admin sees a fully itemised breakdown. Basis handling: FIXED/PER_SHIPMENT once, PERCENTAGE on base,
// PER_KG/PER_CHARGEABLE_KG times chargeable weight, PER_PIECE times pieces, PER_PALLET times pallets.
export function applySurcharges(rules: SurchargeLike[] | undefined, ctx: RateContext, opts: { carrier?: string | null; serviceCategory?: string | null; baseAmount: number }): CalcLine[] {
  const list = (Array.isArray(rules) ? rules : []).filter((r) => r?.isActive !== false)
  const w = pos(ctx?.chargeableWeight)
  const pieces = Math.max(0, Math.floor(num(ctx?.totalPieces)))
  const pallets = Math.max(0, Math.floor(num(ctx?.palletCount ?? 0)))
  const country = ctx?.destCountry ? String(ctx.destCountry).toUpperCase() : ''
  const zone = ctx?.zone ? String(ctx.zone).toUpperCase() : ''
  const carrier = opts?.carrier ? String(opts.carrier) : ''
  const cat = opts?.serviceCategory ? String(opts.serviceCategory) : ''
  const dir = ctx?.direction ? String(ctx.direction) : ''
  const matched = list.filter((r) => eqOrNull(r?.carrier, carrier) && eqOrNull(r?.serviceCategory, cat) && eqOrNull(r?.direction, dir) && eqOrNull(r?.country, country) && eqOrNull(r?.zone, zone))
  matched.sort((a, b) => num(a?.priority ?? 100) - num(b?.priority ?? 100))
  const lines: CalcLine[] = []
  let sort = 10
  for (const r of matched) {
    const basis = String(r?.basis ?? 'FIXED').toUpperCase()
    const rate = num(r?.amount)
    let amount = 0
    let quantity: number | null = null
    if (basis === 'PERCENTAGE') { amount = opts.baseAmount * rate / 100; quantity = opts.baseAmount }
    else if (basis === 'PER_KG' || basis === 'PER_CHARGEABLE_KG') { amount = rate * w; quantity = w }
    else if (basis === 'PER_PIECE') { amount = rate * pieces; quantity = pieces }
    else if (basis === 'PER_PALLET') { const q = pallets || pieces; amount = rate * q; quantity = q }
    else { amount = rate; quantity = 1 } // FIXED / PER_SHIPMENT
    amount = round2(amount)
    const minAmount = pos(r?.minAmount)
    const maxAmount = pos(r?.maxAmount)
    if (minAmount > 0 && amount < minAmount) amount = minAmount
    if (maxAmount > 0 && amount > maxAmount) amount = maxAmount
    if (amount === 0) continue
    lines.push({ code: String(r?.code ?? r?.name ?? 'SURCHARGE'), label: String(r?.name ?? r?.code ?? 'Surcharge'), basis, quantity, rate, amount, taxable: r?.taxable !== false, customerVisible: false, sortOrder: sort })
    sort += 1
  }
  return lines
}

// Assemble a full suggested breakdown for a shipment. Returns MANUAL_REQUIRED (with no invented figures)
// when no active tariff row matches the lane/weight.
export function buildRateResult(params: {
  rows: TariffRowLike[] | undefined
  surcharges: SurchargeLike[] | undefined
  ctx: RateContext
  carrier?: string | null
  serviceCategory?: string | null
  currency?: string | null
}): RateResult {
  const currency = String(params?.currency ?? 'EUR')
  const w = pos(params?.ctx?.chargeableWeight)
  if (w <= 0) return { status: 'MANUAL_REQUIRED', manualReason: 'Chargeable weight is zero — capture piece dimensions and weights before pricing.', matchedRowId: null, baseRate: 0, additionalKgCharge: 0, minChargeAdjustment: 0, surchargeTotal: 0, carrierCostSubtotal: 0, currency, lines: [] }
  const row = matchTariffRow(params?.rows, params?.ctx)
  if (!row) return { status: 'MANUAL_REQUIRED', manualReason: 'No active tariff matches this carrier, lane and weight band — a manual rate is required.', matchedRowId: null, baseRate: 0, additionalKgCharge: 0, minChargeAdjustment: 0, surchargeTotal: 0, carrierCostSubtotal: 0, currency, lines: [] }
  const base = computeBaseRate(row, w)
  const rowCurrency = row?.currency ? String(row.currency) : currency
  const lines: CalcLine[] = []
  lines.push({ code: 'BASE_RATE', label: `Base carrier rate (${round2(w)} kg chargeable)`, basis: pos(row?.ratePerKg) > 0 ? 'PER_CHARGEABLE_KG' : 'FLAT', quantity: pos(row?.ratePerKg) > 0 ? round2(w) : 1, rate: pos(row?.ratePerKg) > 0 ? num(row?.ratePerKg) : num(row?.flatRate), amount: base.baseRate, taxable: true, customerVisible: false, sortOrder: 1 })
  if (base.additionalKgCharge > 0) lines.push({ code: 'ADDITIONAL_KG', label: 'Additional weight charge', basis: 'PER_KG', quantity: null, rate: num(row?.additionalKgRate), amount: base.additionalKgCharge, taxable: true, customerVisible: false, sortOrder: 2 })
  if (base.minChargeAdjustment > 0) lines.push({ code: 'MIN_CHARGE', label: 'Minimum charge adjustment', basis: 'FIXED', quantity: 1, rate: base.minChargeAdjustment, amount: base.minChargeAdjustment, taxable: true, customerVisible: false, sortOrder: 3 })
  const surchargeLines = applySurcharges(params?.surcharges, params?.ctx, { carrier: params?.carrier, serviceCategory: params?.serviceCategory, baseAmount: base.amount })
  for (const l of surchargeLines) lines.push(l)
  const surchargeTotal = round2(surchargeLines.reduce((s, l) => s + num(l.amount), 0))
  const carrierCostSubtotal = round2(base.amount + surchargeTotal)
  return { status: 'CALCULATED', manualReason: null, matchedRowId: row?.id ?? null, baseRate: base.baseRate, additionalKgCharge: base.additionalKgCharge, minChargeAdjustment: base.minChargeAdjustment, surchargeTotal, carrierCostSubtotal, currency: rowCurrency, lines }
}
