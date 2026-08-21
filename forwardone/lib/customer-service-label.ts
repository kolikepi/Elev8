// Customer-facing service label mapping.
//
// Freight-forwarder / carrier brand names (FedEx, TNT, DHL, UPS, ...) must NEVER be shown to customers.
// This helper converts an internal carrier and/or service string into a generic, brand-free ForwardOne
// service label that is safe to display on customer pages, API responses, emails and PDFs.
//
// IMPORTANT: Admin-facing surfaces must NOT use this helper — administrators keep seeing the real
// carrier + service names exactly as stored. The underlying carrier data in the database is never modified.
//
// Examples:
//   FedEx International Priority -> Express Priority
//   FedEx International Economy  -> Express Economy
//   TNT Express                 -> Express
//   TNT Economy                 -> Express Economy
//   DHL Express Worldwide       -> Express
//   Road Freight / groupage     -> Road Freight / Groupage

const CARRIER_BRANDS = ['fedex', 'tnt', 'dhl', 'ups', 'gls', ' dpd', 'dpd ']

export function customerServiceLabel(carrier?: string | null, service?: string | null): string {
  const raw = [carrier, service].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  if (!raw) return ''
  const t = raw.toLowerCase()

  // Freight / groupage tiers first (these are already generic but we normalise them).
  if (t.includes('groupage')) return 'Groupage'
  if (t.includes('air')) return 'Air Freight'
  if (t.includes('sea') || t.includes('ocean')) return 'Sea Freight'
  if (t.includes('road') || t.includes('freight') || t.includes('truck')) return 'Road Freight'

  // Express couriers — determine the tier without exposing the brand.
  const isExpressCarrier = CARRIER_BRANDS.some((b) => t.includes(b.trim())) || t.includes('express') || t.includes('economy') || t.includes('priority') || t.includes('courier')
  if (isExpressCarrier) {
    if (t.includes('priority')) return 'Express Priority'
    if (t.includes('economy')) return 'Express Economy'
    return 'Express'
  }

  // No recognised carrier brand and no freight keyword — the value is already generic, keep as-is.
  return raw
}
