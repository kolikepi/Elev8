import { prisma } from '@/lib/prisma'

// Generate the next quote reference (FWD-YYYY-NNNNN). Mirrors the logic used by the customer quote route:
// sync the persistent counter forward past the highest existing reference for the year, then atomically
// increment it, so admin-created and portal-created quotes share ONE reference namespace with no clashes.
export async function nextQuoteReference(year: number): Promise<string> {
  const latest = await prisma.quote.findFirst({ where: { reference: { startsWith: `FWD-${year}-` } }, orderBy: { reference: 'desc' }, select: { reference: true } })
  const maxExisting = latest?.reference ? (parseInt(latest.reference.split('-').pop() || '0', 10) || 0) : 0
  const counter = await prisma.referenceCounter.upsert({ where: { year }, update: { value: { increment: 1 } }, create: { year, value: 1 } })
  let value = counter?.value ?? 1
  if (value <= maxExisting) { value = maxExisting + 1; await prisma.referenceCounter.update({ where: { year }, data: { value } }) }
  return `FWD-${year}-${String(value).padStart(5, '0')}`
}
