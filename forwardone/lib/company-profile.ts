// Centralized ForwardOne company / billing profile. Company details shown on invoices come from here
// (a singleton DB row merged over sensible placeholder defaults) rather than being hardcoded in the
// template. If the row is missing or a field is empty, the default placeholder is used so the invoice
// always renders — an administrator can fill in the real legal details later.

import { prisma } from '@/lib/prisma'

export type CompanyProfile = {
  legalName: string
  taxId: string
  registeredAddress: string
  phone: string
  email: string
  website: string
  bankName: string
  bankAccount: string
  iban: string
  swift: string
  currency: string
  vatNumber: string
  vatInfo: string
  defaultVatPct: number
  paymentTermsDays: number
  logoUrl: string
  footerNote: string
}

// Placeholder defaults. These are clearly generic so it is obvious what still needs to be configured for a
// legally valid invoice. They never leak internal cost/margin data.
export const COMPANY_PROFILE_DEFAULTS: CompanyProfile = {
  legalName: 'ForwardOne',
  taxId: '',
  registeredAddress: '',
  phone: '',
  email: '',
  website: '',
  bankName: '',
  bankAccount: '',
  iban: '',
  swift: '',
  currency: 'EUR',
  vatNumber: '',
  vatInfo: '',
  defaultVatPct: 0,
  paymentTermsDays: 0,
  logoUrl: '',
  footerNote: 'Thank you for shipping with ForwardOne — International Shipping · Albania ↔ Europe.',
}

function pick(value: unknown, fallback: string): string {
  const s = typeof value === 'string' ? value.trim() : ''
  return s.length > 0 ? s : fallback
}

// Returns the merged company profile (DB row over defaults). Never throws — on any error it returns the
// defaults so invoice rendering is never blocked.
export async function getCompanyProfile(): Promise<CompanyProfile> {
  try {
    const row = await prisma.companyProfile.findUnique({ where: { id: 'forwardone' } })
    if (!row) return { ...COMPANY_PROFILE_DEFAULTS }
    const d = COMPANY_PROFILE_DEFAULTS
    return {
      legalName: pick(row.legalName, d.legalName),
      taxId: pick(row.taxId, d.taxId),
      registeredAddress: pick(row.registeredAddress, d.registeredAddress),
      phone: pick(row.phone, d.phone),
      email: pick(row.email, d.email),
      website: pick(row.website, d.website),
      bankName: pick(row.bankName, d.bankName),
      bankAccount: pick(row.bankAccount, d.bankAccount),
      iban: pick(row.iban, d.iban),
      swift: pick(row.swift, d.swift),
      currency: pick(row.currency, d.currency),
      vatNumber: pick(row.vatNumber, d.vatNumber),
      vatInfo: pick(row.vatInfo, d.vatInfo),
      defaultVatPct: Number(row.defaultVatPct ?? d.defaultVatPct) || 0,
      paymentTermsDays: Number(row.paymentTermsDays ?? d.paymentTermsDays) || 0,
      logoUrl: pick(row.logoUrl, d.logoUrl),
      footerNote: pick(row.footerNote, d.footerNote),
    }
  } catch (error) {
    console.error('getCompanyProfile failed, using defaults', error)
    return { ...COMPANY_PROFILE_DEFAULTS }
  }
}

// Which company fields still need to be configured for a fully legal invoice. Used to surface a
// configuration checklist to administrators.
export function missingCompanyFields(p: CompanyProfile): string[] {
  const required: { key: keyof CompanyProfile; label: string }[] = [
    { key: 'taxId', label: 'NIPT / Tax ID' },
    { key: 'registeredAddress', label: 'Registered address' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'bankName', label: 'Bank name' },
    { key: 'iban', label: 'IBAN' },
    { key: 'swift', label: 'SWIFT / BIC' },
    { key: 'vatNumber', label: 'VAT number' },
    { key: 'logoUrl', label: 'Company logo' },
  ]
  return required.filter((r) => !String(p[r.key] ?? '').trim()).map((r) => r.label)
}
