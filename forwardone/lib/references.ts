// Phase 3 — Core Operations reference generators.
//
// Shipments and invoices each carry their own human-facing reference, independent of the quote
// FWD-YYYY-NNNNN reference and independent of the shared ReferenceCounter (which is keyed by year only and
// cannot distinguish entity types). We derive the next number by scanning the highest existing reference
// for the current year in the same table, so restores/imports/seed data can never produce a duplicate.
//
//   Shipment reference : FWD-YYYY-NNNNN      (e.g. FWD-2026-00001)
//   Invoice  reference : FWD-INV-YYYY-NNNNN  (e.g. FWD-INV-2026-00001)

import { prisma } from '@/lib/prisma'

function nextNumber(latestRef: string | null | undefined): number {
  if (!latestRef) return 1
  const tail = parseInt(String(latestRef).split('-').pop() || '0', 10) || 0
  return tail + 1
}

export async function nextShipmentReference(year: number = new Date().getFullYear()): Promise<string> {
  const prefix = `FWD-${year}-`
  const latest = await prisma.shipment.findFirst({ where: { reference: { startsWith: prefix } }, orderBy: { reference: 'desc' }, select: { reference: true } })
  return `${prefix}${String(nextNumber(latest?.reference)).padStart(5, '0')}`
}

export async function nextInvoiceReference(year: number = new Date().getFullYear()): Promise<string> {
  const prefix = `FWD-INV-${year}-`
  const latest = await prisma.invoice.findFirst({ where: { reference: { startsWith: prefix } }, orderBy: { reference: 'desc' }, select: { reference: true } })
  return `${prefix}${String(nextNumber(latest?.reference)).padStart(5, '0')}`
}