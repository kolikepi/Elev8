import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

// Public, read-only reference data for the guest quote form. Exposes ONLY non-sensitive master data:
// the country list, volumetric divisors, package restrictions, and the customer-facing service names
// (NO carrier brand, cost or margin). No session required.
export async function GET() {
  try {
    const [countries, volumetricRulesRaw, restrictionsRaw, customerServices] = await Promise.all([
      prisma.country.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, iso2: true } }),
      // Only carrier-agnostic (category/global) volumetric rules are exposed publicly — the same set the
      // guest form resolves against (carrier is always empty on the public path). Carrier/service brand
      // names and any carrier-specific rule NEVER leave the server.
      prisma.volumetricRule.findMany({
        where: { isActive: true, carrier: null, service: null }, orderBy: { priority: 'asc' },
        select: { id: true, serviceCategory: true, direction: true, originCountry: true, destCountry: true, packageType: true, divisor: true, priority: true, effectiveFrom: true, effectiveTo: true, isActive: true },
      }),
      // Restriction limits are public (per-piece/weight caps) but the carrier column is stripped out.
      prisma.serviceRestriction.findMany({
        where: { isActive: true },
        select: { id: true, serviceCategory: true, country: true, zone: true, direction: true, maxWeightPerPiece: true, maxLength: true, maxWidth: true, maxHeight: true, maxLengthGirth: true, maxPieces: true, maxShipmentWeight: true, maxPalletHeight: true, palletAboveWeight: true, prohibitedTypes: true, nonConveyable: true, serviceAvailable: true, isActive: true },
      }),
      prisma.customerService.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, category: true, transitTime: true, displayOrder: true } }),
    ])
    const volumetricRules = volumetricRulesRaw
    const restrictions = restrictionsRaw
    return NextResponse.json({
      countries: serializeData(countries ?? []),
      volumetricRules: serializeData(volumetricRules ?? []),
      restrictions: serializeData(restrictions ?? []),
      customerServices: serializeData(customerServices ?? []),
    })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load reference data.' }, { status: 500 }) }
}
