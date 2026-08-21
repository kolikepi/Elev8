// Sprint 2.2.1 Phase B — Quotation Versioning helpers.
//
// A quotation is no longer a single row. Each ForwardOne reference keeps an ordered chain of
// AdminQuotation versions (V1, V2, V3, ...). An accepted quotation is NEVER overwritten — a revision
// always creates a NEW version. These helpers resolve the meaningful heads of that chain and produce
// the customer-safe projections. They contain NO pricing logic (the existing pricing / recommendation /
// volumetric / tariff engines remain the single source of truth for numbers).
//
// Version semantics:
//   isCurrent  = the customer-facing HEAD version (exactly one per quote). An unsent revision DRAFT is
//                NOT current; it becomes current only when the admin sends it.
//   latest ACCEPTED version = the version booking must always reference.
//
// Never expose carrier brand names, carrier cost, per-fee breakdown, markup, discount, override reason,
// internal notes, revision reason, decision snapshot, tariff id or created-by to customers.

import { customerServiceLabel } from '@/lib/customer-service-label'

export type AnyVersion = any

export function sortVersions(versions: AnyVersion[]): AnyVersion[] {
  return [...(versions ?? [])].sort((a, b) => Number(a?.versionNumber ?? 0) - Number(b?.versionNumber ?? 0))
}

// The customer-facing head. Prefer the explicit isCurrent flag; fall back to the highest version number
// (covers legacy rows and any transient state).
export function pickCurrentVersion(versions: AnyVersion[]): AnyVersion | null {
  const list = versions ?? []
  if (!list.length) return null
  const current = list.find((v) => v?.isCurrent === true)
  if (current) return current
  const sorted = sortVersions(list)
  return sorted[sorted.length - 1] ?? null
}

// The version booking must reference: the highest-numbered ACCEPTED version.
export function latestAcceptedVersion(versions: AnyVersion[]): AnyVersion | null {
  const accepted = (versions ?? []).filter((v) => String(v?.status ?? '') === 'ACCEPTED')
  if (!accepted.length) return null
  const sorted = sortVersions(accepted)
  return sorted[sorted.length - 1] ?? null
}

export function nextVersionNumber(versions: AnyVersion[]): number {
  const max = (versions ?? []).reduce((m: number, v: AnyVersion) => Math.max(m, Number(v?.versionNumber ?? 0)), 0)
  return max + 1
}

export function isExpired(version: AnyVersion | null, at?: Date): boolean {
  if (!version?.validUntil) return false
  const until = new Date(version.validUntil)
  if (isNaN(until.getTime())) return false
  return (at ?? new Date()).getTime() > until.getTime()
}

// A short, brand-free, cost-free customer status wording. Internal statuses (SENT/APPROVED/DRAFT/...) are
// never shown to customers.
export function customerVersionStatus(version: AnyVersion | null, needsReapproval: boolean): string {
  const s = String(version?.status ?? '')
  if (s === 'ACCEPTED') return 'Accepted'
  if (s === 'REJECTED') return 'Declined'
  if (needsReapproval) return 'Action required'
  if (s === 'SENT' || s === 'APPROVED') return 'Awaiting your review'
  return 'In preparation'
}

// Customer-safe projection of a single version. Whitelists selling-side fields only, hides the carrier
// brand behind a generic ForwardOne service label, and drops every internal cost / margin / reason field.
export function customerSafeVersion(version: AnyVersion | null): any {
  if (!version) return null
  return {
    id: version?.id ?? null,
    versionNumber: Number(version?.versionNumber ?? 1),
    serviceLabel: customerServiceLabel(version?.carrierSelected, version?.serviceSelected),
    finalTransitTime: version?.finalTransitTime ?? null,
    finalPrice: version?.finalPrice ?? null,
    currency: version?.currency ?? 'EUR',
    subtotal: version?.subtotal ?? null,
    vatPct: version?.vatPct ?? null,
    vatAmount: version?.vatAmount ?? null,
    notes: version?.notes ?? null,
    includedServices: version?.includedServices ?? null,
    excludedServices: version?.excludedServices ?? null,
    validUntil: version?.validUntil ?? null,
    status: String(version?.status ?? ''),
    sentAt: version?.sentAt ?? null,
    acceptedAt: version?.acceptedAt ?? null,
    rejectedAt: version?.rejectedAt ?? null,
    createdAt: version?.createdAt ?? null,
  }
}

// Customer-safe projection of a single extra QuoteOption. Only the selling-side fields the customer may
// see — the internal carrier brand, carrier service, carrier cost and margin are NEVER included.
export function customerSafeOption(option: AnyVersion | null): any {
  if (!option) return null
  return {
    optionId: option?.id ?? null,
    kind: 'extra',
    serviceLabel: String(option?.serviceName ?? '').trim() || 'Express',
    finalTransitTime: option?.transitTime ?? null,
    finalPrice: option?.sellingPrice ?? null,
    currency: option?.currency ?? 'EUR',
    notes: option?.notes ?? null,
    validUntil: option?.validUntil ?? null,
    sortOrder: Number(option?.sortOrder ?? 0),
    isSelected: option?.isSelected === true,
  }
}

// Build the combined customer-facing offer list for a quote: the PRIMARY offer derived from the current
// AdminQuotation head, followed by any EXTRA QuoteOptions attached to it (carrier-stripped, ordered).
// When there are no extras this yields a single primary offer identical to today's behaviour.
export function buildCustomerOffers(current: AnyVersion | null, options: AnyVersion[]): any[] {
  if (!current) return []
  const extras = sortOptions(options ?? []).map((o) => customerSafeOption(o))
  const anyExtraSelected = extras.some((e) => e?.isSelected === true)
  const accepted = String(current?.status ?? '') === 'ACCEPTED'
  const primary = {
    optionId: null, // null => accept the AdminQuotation head as-is (today's behaviour)
    kind: 'primary',
    serviceLabel: customerServiceLabel(current?.carrierSelected, current?.serviceSelected),
    finalTransitTime: current?.finalTransitTime ?? null,
    finalPrice: current?.finalPrice ?? null,
    currency: current?.currency ?? 'EUR',
    sortOrder: -1,
    isSelected: accepted && !anyExtraSelected,
  }
  return [primary, ...extras]
}

export function sortOptions(options: AnyVersion[]): AnyVersion[] {
  return [...(options ?? [])].sort((a, b) => (Number(a?.sortOrder ?? 0) - Number(b?.sortOrder ?? 0)) || (new Date(a?.createdAt ?? 0).getTime() - new Date(b?.createdAt ?? 0).getTime()))
}

// Customer-safe ordered history (oldest first). Only versions that have actually been shown to the
// customer (SENT/APPROVED/ACCEPTED/REJECTED) appear — unsent internal drafts stay hidden.
export function customerSafeHistory(versions: AnyVersion[]): any[] {
  const visible = (versions ?? []).filter((v) => ['SENT', 'APPROVED', 'ACCEPTED', 'REJECTED'].includes(String(v?.status ?? '')))
  return sortVersions(visible).map((v) => customerSafeVersion(v))
}

// The previous customer-visible version relative to the current head (for the "what changed" summary).
export function previousVisibleVersion(versions: AnyVersion[], current: AnyVersion | null): AnyVersion | null {
  if (!current) return null
  const visible = sortVersions((versions ?? []).filter((v) => ['SENT', 'APPROVED', 'ACCEPTED', 'REJECTED'].includes(String(v?.status ?? '')) && Number(v?.versionNumber ?? 0) < Number(current?.versionNumber ?? 0)))
  return visible.length ? visible[visible.length - 1] : null
}

// The customer-facing "what changed" summary between the current head and the previous customer-visible
// version. Only selling-side facts (price / service / transit) — never costs or reasons.
export function customerWhatChanged(current: AnyVersion | null, previous: AnyVersion | null): any | null {
  if (!current || !previous) return null
  const priceChanged = Number(current?.finalPrice ?? 0) !== Number(previous?.finalPrice ?? 0)
  const prevLabel = customerServiceLabel(previous?.carrierSelected, previous?.serviceSelected)
  const curLabel = customerServiceLabel(current?.carrierSelected, current?.serviceSelected)
  const serviceChanged = prevLabel !== curLabel
  const transitChanged = String(current?.finalTransitTime ?? '') !== String(previous?.finalTransitTime ?? '')
  return {
    previousVersionNumber: Number(previous?.versionNumber ?? 1),
    currentVersionNumber: Number(current?.versionNumber ?? 1),
    priceChanged,
    previousPrice: previous?.finalPrice ?? null,
    currentPrice: current?.finalPrice ?? null,
    currency: current?.currency ?? 'EUR',
    serviceChanged,
    previousService: prevLabel,
    currentService: curLabel,
    transitChanged,
    previousTransit: previous?.finalTransitTime ?? null,
    currentTransit: current?.finalTransitTime ?? null,
  }
}