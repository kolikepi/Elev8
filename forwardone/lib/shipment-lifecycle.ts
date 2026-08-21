// Sprint 2.2.1 Phase C — Shipment Lifecycle & Amendment Impact library.
//
// This module is the single source of truth for:
//   1. The INTERNAL shipment lifecycle states and the legal transitions between them.
//   2. The CUSTOMER-FACING friendly labels for those states (raw internal codes are NEVER shown to customers).
//   3. The customs sub-status (internal) -> friendly customer message mapping.
//   4. Phase helpers (before collection / after collection / delivered-lock) that drive the post-booking edit rules.
//   5. Service-conditional milestone helpers (e.g. customs milestones only for international shipments).
//   6. classifyAmendment() — reuses the Phase A change-impact philosophy (lib/booking-impact.ts) to classify a
//      post-booking amendment as NO_PRICE_IMPACT / RECALCULATION_REQUIRED / MANUAL_REVIEW_REQUIRED.
//
// Design principle: "SIMPLE OUTSIDE — POWERFUL INSIDE". Internally we track a rich, auditable lifecycle;
// externally the customer only ever sees clear, jargon-free progress.

import type { ImpactLevel } from './booking-impact'

export type { ImpactLevel } from './booking-impact'

// ---------------------------------------------------------------------------
// Internal lifecycle states (must mirror the Prisma ShipmentStatus enum).
// ---------------------------------------------------------------------------
export type ShipmentStatus =
  | 'BOOKED'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP_PENDING'
  | 'PICKED_UP'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DESTINATION'
  | 'CUSTOMS_CLEARANCE'
  | 'CUSTOMS_HOLD'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FINANCIALLY_CLOSED'
  | 'ON_HOLD'
  | 'EXCEPTION'
  | 'CANCELLED'
  | 'RETURN_IN_PROGRESS'
  | 'RETURNED'
  | 'LOST'
  | 'DAMAGED'

// The normal happy-path progression order. Used to compute "has the shipment reached/passed X".
export const LIFECYCLE_ORDER: ShipmentStatus[] = [
  'BOOKED',
  'PICKUP_SCHEDULED',
  'PICKUP_PENDING',
  'PICKED_UP',
  'COLLECTED',
  'IN_TRANSIT',
  'ARRIVED_AT_DESTINATION',
  'CUSTOMS_CLEARANCE',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FINANCIALLY_CLOSED',
]

// States that represent "the goods have been collected from the sender" (i.e. physically in the network).
// Before this point a change is an "Amend Booking"; at/after this point it becomes a "Shipment Amendment".
export const COLLECTED_STATES: ShipmentStatus[] = [
  'PICKED_UP',
  'COLLECTED',
  'IN_TRANSIT',
  'ARRIVED_AT_DESTINATION',
  'CUSTOMS_CLEARANCE',
  'CUSTOMS_HOLD',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FINANCIALLY_CLOSED',
  'RETURN_IN_PROGRESS',
  'RETURNED',
]

// Terminal / locked states — no further direct edits or normal transitions.
export const TERMINAL_STATES: ShipmentStatus[] = [
  'DELIVERED',
  'FINANCIALLY_CLOSED',
  'CANCELLED',
  'RETURNED',
  'LOST',
]

// Exception / off-happy-path states that can be entered from most active states.
export const EXCEPTION_STATES: ShipmentStatus[] = [
  'ON_HOLD',
  'EXCEPTION',
  'CUSTOMS_HOLD',
  'LOST',
  'DAMAGED',
]

// ---------------------------------------------------------------------------
// Legal transitions. Admin status changes are validated against this map.
// Exception states can be reached from any active (non-terminal) state, so they
// are appended dynamically in canTransition() rather than listed on every row.
// ---------------------------------------------------------------------------
const BASE_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  BOOKED: ['PICKUP_SCHEDULED', 'PICKUP_PENDING', 'PICKED_UP', 'COLLECTED', 'CANCELLED'],
  PICKUP_SCHEDULED: ['PICKUP_PENDING', 'PICKED_UP', 'COLLECTED', 'CANCELLED'],
  PICKUP_PENDING: ['PICKED_UP', 'COLLECTED', 'CANCELLED'],
  PICKED_UP: ['COLLECTED', 'IN_TRANSIT'],
  COLLECTED: ['IN_TRANSIT'],
  IN_TRANSIT: ['ARRIVED_AT_DESTINATION', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY'],
  ARRIVED_AT_DESTINATION: ['CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY'],
  CUSTOMS_CLEARANCE: ['CUSTOMS_HOLD', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_DESTINATION'],
  CUSTOMS_HOLD: ['CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'EXCEPTION'],
  DELIVERED: ['FINANCIALLY_CLOSED', 'RETURN_IN_PROGRESS'],
  FINANCIALLY_CLOSED: [],
  ON_HOLD: ['IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'CANCELLED', 'RETURN_IN_PROGRESS'],
  EXCEPTION: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ON_HOLD', 'CANCELLED', 'RETURN_IN_PROGRESS', 'DELIVERED'],
  CANCELLED: [],
  RETURN_IN_PROGRESS: ['RETURNED', 'IN_TRANSIT'],
  RETURNED: [],
  LOST: [],
  DAMAGED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RETURN_IN_PROGRESS', 'EXCEPTION'],
}

// Exception states reachable from any non-terminal state.
const REACHABLE_ANYTIME: ShipmentStatus[] = ['ON_HOLD', 'EXCEPTION', 'LOST', 'DAMAGED']

export function allowedTransitions(from: ShipmentStatus): ShipmentStatus[] {
  const base = BASE_TRANSITIONS[from] ?? []
  if (TERMINAL_STATES.includes(from)) return base
  const extra = REACHABLE_ANYTIME.filter((s) => s !== from && !base.includes(s))
  return [...base, ...extra]
}

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return true
  return allowedTransitions(from).includes(to)
}

export function isValidStatus(value: unknown): value is ShipmentStatus {
  return typeof value === 'string' && (LIFECYCLE_ORDER.includes(value as ShipmentStatus) || (value as string) in BASE_TRANSITIONS)
}

// ---------------------------------------------------------------------------
// Customer-facing friendly labels. Raw internal codes are NEVER shown.
// ---------------------------------------------------------------------------
const CUSTOMER_STATUS_LABELS: Record<ShipmentStatus, string> = {
  BOOKED: 'Booking confirmed',
  PICKUP_SCHEDULED: 'Collection scheduled',
  PICKUP_PENDING: 'Awaiting collection',
  PICKED_UP: 'Collected',
  COLLECTED: 'Collected',
  IN_TRANSIT: 'In transit',
  ARRIVED_AT_DESTINATION: 'Arrived in destination country',
  CUSTOMS_CLEARANCE: 'Customs clearance in progress',
  CUSTOMS_HOLD: 'Customs clearance in progress',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FINANCIALLY_CLOSED: 'Delivered',
  ON_HOLD: 'On hold',
  EXCEPTION: 'Delay — we are on it',
  CANCELLED: 'Cancelled',
  RETURN_IN_PROGRESS: 'Return in progress',
  RETURNED: 'Returned to sender',
  LOST: 'Under investigation',
  DAMAGED: 'Under review',
}

export function customerStatusLabel(status?: string | null): string {
  if (!status) return 'Processing'
  return CUSTOMER_STATUS_LABELS[status as ShipmentStatus] ?? 'Processing'
}

// Admin-facing readable label (keeps the state distinct, title-cased).
export function adminStatusLabel(status?: string | null): string {
  if (!status) return '—'
  return String(status)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Customs sub-statuses (INTERNAL) -> friendly customer messages.
// ---------------------------------------------------------------------------
export type CustomsSubStatus =
  | 'CUSTOMS_PENDING'
  | 'UNDER_CUSTOMS_REVIEW'
  | 'DOCUMENTS_REQUIRED'
  | 'DUTIES_TAXES_PENDING'
  | 'CUSTOMS_HOLD'
  | 'CUSTOMS_CLEARED'

export const CUSTOMS_SUB_STATUSES: CustomsSubStatus[] = [
  'CUSTOMS_PENDING',
  'UNDER_CUSTOMS_REVIEW',
  'DOCUMENTS_REQUIRED',
  'DUTIES_TAXES_PENDING',
  'CUSTOMS_HOLD',
  'CUSTOMS_CLEARED',
]

const CUSTOMS_CUSTOMER_MESSAGES: Record<CustomsSubStatus, string> = {
  CUSTOMS_PENDING: 'Customs clearance in progress',
  UNDER_CUSTOMS_REVIEW: 'Your shipment is being reviewed by customs',
  DOCUMENTS_REQUIRED: 'Customs needs additional information to release your shipment',
  DUTIES_TAXES_PENDING: 'Duties or taxes need to be settled before delivery',
  CUSTOMS_HOLD: 'Your shipment is being reviewed by customs',
  CUSTOMS_CLEARED: 'Customs clearance completed',
}

// Sub-statuses that require the customer to take an action (drives action-required cards).
const CUSTOMS_ACTION_REQUIRED: Record<CustomsSubStatus, boolean> = {
  CUSTOMS_PENDING: false,
  UNDER_CUSTOMS_REVIEW: false,
  DOCUMENTS_REQUIRED: true,
  DUTIES_TAXES_PENDING: true,
  CUSTOMS_HOLD: false,
  CUSTOMS_CLEARED: false,
}

export function customsCustomerMessage(sub?: string | null): string {
  if (!sub) return ''
  return CUSTOMS_CUSTOMER_MESSAGES[sub as CustomsSubStatus] ?? 'Customs clearance in progress'
}

export function customsActionRequired(sub?: string | null): boolean {
  if (!sub) return false
  return CUSTOMS_ACTION_REQUIRED[sub as CustomsSubStatus] ?? false
}

export function adminCustomsLabel(sub?: string | null): string {
  if (!sub) return '—'
  return adminStatusLabel(sub)
}

// ---------------------------------------------------------------------------
// Phase helpers — drive the post-booking edit rules.
// ---------------------------------------------------------------------------
export function isBeforeCollection(status?: string | null): boolean {
  if (!status) return true
  if (COLLECTED_STATES.includes(status as ShipmentStatus)) return false
  if (status === 'CANCELLED') return false
  return true
}

export function isAfterCollection(status?: string | null): boolean {
  return COLLECTED_STATES.includes(status as ShipmentStatus)
}

// Once delivered (or financially closed), the shipment record is locked against edits/amendments
// except for financial closure and returns handled through dedicated workflows.
export function isDeliveredLocked(status?: string | null): boolean {
  return status === 'DELIVERED' || status === 'FINANCIALLY_CLOSED' || status === 'RETURNED'
}

export function isTerminal(status?: string | null): boolean {
  return TERMINAL_STATES.includes(status as ShipmentStatus)
}

// Which amendment workflow applies for the current lifecycle phase.
export function amendmentModeFor(status?: string | null): {
  mode: 'BOOKING_AMENDMENT' | 'SHIPMENT_AMENDMENT' | 'LOCKED'
  phase: 'BEFORE_COLLECTION' | 'AFTER_COLLECTION' | 'DELIVERED'
  label: string
} {
  if (isDeliveredLocked(status) || isTerminal(status)) {
    return { mode: 'LOCKED', phase: 'DELIVERED', label: 'Shipment locked' }
  }
  if (isAfterCollection(status)) {
    return { mode: 'SHIPMENT_AMENDMENT', phase: 'AFTER_COLLECTION', label: 'Create Shipment Amendment' }
  }
  return { mode: 'BOOKING_AMENDMENT', phase: 'BEFORE_COLLECTION', label: 'Amend Booking' }
}

// ---------------------------------------------------------------------------
// Service-conditional milestones. International shipments include customs;
// domestic shipments skip it. Air/Sea add an origin/destination handling leg.
// ---------------------------------------------------------------------------
export type Milestone = {
  key: string
  label: string
  statuses: ShipmentStatus[]
}

export function needsCustoms(originCountry?: string | null, destCountry?: string | null): boolean {
  const o = String(originCountry ?? '').trim().toLowerCase()
  const d = String(destCountry ?? '').trim().toLowerCase()
  if (!o || !d) return true // default to showing customs when unknown (safer for international forwarder)
  return o !== d
}

export function milestonesFor(opts: {
  originCountry?: string | null
  destCountry?: string | null
}): Milestone[] {
  const customs = needsCustoms(opts.originCountry, opts.destCountry)
  const steps: Milestone[] = [
    { key: 'booked', label: 'Booking confirmed', statuses: ['BOOKED', 'PICKUP_SCHEDULED', 'PICKUP_PENDING'] },
    { key: 'collected', label: 'Collected', statuses: ['PICKED_UP', 'COLLECTED'] },
    { key: 'transit', label: 'In transit', statuses: ['IN_TRANSIT', 'ARRIVED_AT_DESTINATION'] },
  ]
  if (customs) {
    steps.push({ key: 'customs', label: 'Customs clearance', statuses: ['CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD'] })
  }
  steps.push({ key: 'delivery', label: 'Out for delivery', statuses: ['OUT_FOR_DELIVERY'] })
  steps.push({ key: 'delivered', label: 'Delivered', statuses: ['DELIVERED', 'FINANCIALLY_CLOSED'] })
  return steps
}

// Index of the current status within the happy-path order (for progress rendering). -1 if off-path.
export function lifecycleIndex(status?: string | null): number {
  if (!status) return -1
  return LIFECYCLE_ORDER.indexOf(status as ShipmentStatus)
}

// ---------------------------------------------------------------------------
// Amendment impact classification — reuses the Phase A philosophy.
// Given the current shipment values and the proposed new values, classify each
// changed field and return an overall impact. This module NEVER computes price.
// ---------------------------------------------------------------------------
export type AmendmentChange = {
  field: string
  label: string
  from: string
  to: string
  impact: ImpactLevel
}

export type AmendmentClassification = {
  changes: AmendmentChange[]
  overall: ImpactLevel
}

const SEVERITY: Record<ImpactLevel, number> = {
  NO_PRICE_IMPACT: 0,
  RECALCULATION_REQUIRED: 1,
  MANUAL_REVIEW_REQUIRED: 2,
}

// Field -> impact rules for post-booking amendments (spec §5).
// Contact/address-line/reference details never change price. Route (country/city/postal),
// weight, pieces, dimensions, contents, service => recalculation. Commercial status, incoterms,
// dangerous goods, insurance/customs-critical flags => manual commercial/compliance review.
const AMENDMENT_FIELD_RULES: Record<string, { label: string; impact: ImpactLevel }> = {
  // No price impact — administrative details.
  'sender.name': { label: 'Pickup contact name', impact: 'NO_PRICE_IMPACT' },
  'sender.company': { label: 'Pickup company', impact: 'NO_PRICE_IMPACT' },
  'sender.address': { label: 'Pickup address line', impact: 'NO_PRICE_IMPACT' },
  'sender.phone': { label: 'Pickup phone', impact: 'NO_PRICE_IMPACT' },
  'sender.email': { label: 'Pickup email', impact: 'NO_PRICE_IMPACT' },
  'receiver.name': { label: 'Delivery contact name', impact: 'NO_PRICE_IMPACT' },
  'receiver.company': { label: 'Delivery company', impact: 'NO_PRICE_IMPACT' },
  'receiver.address': { label: 'Delivery address line', impact: 'NO_PRICE_IMPACT' },
  'receiver.phone': { label: 'Delivery phone', impact: 'NO_PRICE_IMPACT' },
  'receiver.email': { label: 'Delivery email', impact: 'NO_PRICE_IMPACT' },
  reference: { label: 'Customer reference', impact: 'NO_PRICE_IMPACT' },
  notes: { label: 'Special instructions', impact: 'NO_PRICE_IMPACT' },
  goodsDescription: { label: 'Goods description', impact: 'NO_PRICE_IMPACT' },
  // Recalculation required — route & physical characteristics.
  'sender.country': { label: 'Pickup country', impact: 'RECALCULATION_REQUIRED' },
  'sender.city': { label: 'Pickup city', impact: 'RECALCULATION_REQUIRED' },
  'sender.postalCode': { label: 'Pickup postal code', impact: 'RECALCULATION_REQUIRED' },
  'receiver.country': { label: 'Delivery country', impact: 'RECALCULATION_REQUIRED' },
  'receiver.city': { label: 'Delivery city', impact: 'RECALCULATION_REQUIRED' },
  'receiver.postalCode': { label: 'Delivery postal code', impact: 'RECALCULATION_REQUIRED' },
  totalWeight: { label: 'Total weight (kg)', impact: 'RECALCULATION_REQUIRED' },
  totalPieces: { label: 'Total pieces', impact: 'RECALCULATION_REQUIRED' },
  pieces: { label: 'Package types / dimensions', impact: 'RECALCULATION_REQUIRED' },
  contentsType: { label: 'Contents type', impact: 'RECALCULATION_REQUIRED' },
  service: { label: 'Service level', impact: 'RECALCULATION_REQUIRED' },
  // Manual review — commercial / compliance critical.
  isCommercial: { label: 'Commercial vs personal', impact: 'MANUAL_REVIEW_REQUIRED' },
  incoterms: { label: 'Incoterms', impact: 'MANUAL_REVIEW_REQUIRED' },
  commercialValue: { label: 'Declared value', impact: 'MANUAL_REVIEW_REQUIRED' },
  dangerousGoods: { label: 'Dangerous goods', impact: 'MANUAL_REVIEW_REQUIRED' },
  unNumber: { label: 'UN number', impact: 'MANUAL_REVIEW_REQUIRED' },
  dangerousGoodsClass: { label: 'DG class', impact: 'MANUAL_REVIEW_REQUIRED' },
}

const txt = (v: unknown): string => String(v ?? '').trim()
const norm = (v: unknown): string => txt(v).toLowerCase().replace(/\s+/g, ' ')

// Classify a set of proposed amendment changes. `changes` is a flat map of field -> {from, to}.
// Only fields whose values actually differ are included in the result.
export function classifyAmendment(changes: Record<string, { from: unknown; to: unknown }>): AmendmentClassification {
  const out: AmendmentChange[] = []
  for (const [field, pair] of Object.entries(changes || {})) {
    if (!pair) continue
    if (norm(pair.from) === norm(pair.to)) continue
    const rule = AMENDMENT_FIELD_RULES[field] ?? { label: field, impact: 'RECALCULATION_REQUIRED' as ImpactLevel }
    out.push({ field, label: rule.label, from: txt(pair.from) || '—', to: txt(pair.to) || '—', impact: rule.impact })
  }
  const overall = out.reduce<ImpactLevel>((max, c) => (SEVERITY[c.impact] > SEVERITY[max] ? c.impact : max), 'NO_PRICE_IMPACT')
  return { changes: out, overall }
}

// Friendly, customer-facing wording for an amendment outcome. Internal codes are NEVER shown to customers.
export function amendmentCustomerMessage(overall: ImpactLevel): string {
  if (overall === 'NO_PRICE_IMPACT') return 'Your shipment details have been updated.'
  if (overall === 'RECALCULATION_REQUIRED') return 'We have received your changes and are updating your shipment details. We will confirm any impact shortly.'
  return 'We have received your changes. Our team is reviewing them and will confirm the details with you shortly.'
}
