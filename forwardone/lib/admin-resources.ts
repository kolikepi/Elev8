import { prisma } from '@/lib/prisma'
import { str, strOrNull, int, intOrNull, dec, decOrNull, bool, dateOrNull, enumOrNull, enumOr, CATEGORY, DIRECTION, BASIS, DIM_UNIT, WT_UNIT } from '@/lib/admin-api'

// Each resource: prisma delegate, orderBy, and a build(body) that returns the create/update data object.
// archivable: when true the PATCH route exposes an archive/unarchive fast-path (sets archivedAt) that
// must NOT go through build() — otherwise a partial { archived } body would clobber every other field.
// refGuard: optional async fn returning the number of dependent/referencing records for a given id.
// When present and > 0, the DELETE route must refuse the hard delete and instruct the admin to deactivate instead.
// filterFields: query-param keys the GET list route may filter by (exact match), e.g. ?countryId=...
// searchFields: fields the GET list route searches with ?q= (case-insensitive contains).
export type ResourceDef = { model: any; label: string; orderBy: any; build: (b: any) => any; archivable?: boolean; refGuard?: (id: string) => Promise<number>; filterFields?: string[]; searchFields?: string[]; take?: number; include?: any }

export const RESOURCES: Record<string, ResourceDef> = {
  'volumetric-rules': {
    model: prisma.volumetricRule, label: 'Volumetric rule', orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], archivable: true,
    build: (b: any) => ({
      name: str(b?.name) || 'Untitled rule', carrier: strOrNull(b?.carrier), service: strOrNull(b?.service),
      serviceCategory: enumOrNull(b?.serviceCategory, CATEGORY) as any, direction: enumOrNull(b?.direction, DIRECTION) as any,
      originCountry: strOrNull(b?.originCountry), destCountry: strOrNull(b?.destCountry), packageType: strOrNull(b?.packageType),
      divisor: Math.max(1, int(b?.divisor) || 5000), dimensionUnit: enumOr(b?.dimensionUnit, DIM_UNIT, 'CM') as any,
      weightUnit: enumOr(b?.weightUnit, WT_UNIT, 'KG') as any, effectiveFrom: dateOrNull(b?.effectiveFrom), effectiveTo: dateOrNull(b?.effectiveTo),
      priority: int(b?.priority) || 100, notes: strOrNull(b?.notes), isActive: b?.isActive !== false,
    }),
  },
  'service-restrictions': {
    model: prisma.serviceRestriction, label: 'Service restriction', orderBy: { createdAt: 'desc' },
    build: (b: any) => ({
      name: str(b?.name) || 'Untitled restriction', carrier: strOrNull(b?.carrier),
      serviceCategory: enumOrNull(b?.serviceCategory, CATEGORY) as any, country: strOrNull(b?.country), zone: strOrNull(b?.zone),
      direction: enumOrNull(b?.direction, DIRECTION) as any, maxWeightPerPiece: decOrNull(b?.maxWeightPerPiece),
      maxLength: decOrNull(b?.maxLength), maxWidth: decOrNull(b?.maxWidth), maxHeight: decOrNull(b?.maxHeight),
      maxLengthGirth: decOrNull(b?.maxLengthGirth), maxPieces: intOrNull(b?.maxPieces), maxShipmentWeight: decOrNull(b?.maxShipmentWeight),
      maxPalletHeight: decOrNull(b?.maxPalletHeight), palletAboveWeight: decOrNull(b?.palletAboveWeight),
      prohibitedTypes: strOrNull(b?.prohibitedTypes), restrictedGoods: strOrNull(b?.restrictedGoods),
      nonConveyable: bool(b?.nonConveyable), serviceAvailable: b?.serviceAvailable !== false, isActive: b?.isActive !== false,
    }),
  },
  'surcharges': {
    model: prisma.surchargeRule, label: 'Surcharge rule', orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    build: (b: any) => ({
      name: str(b?.name) || 'Untitled surcharge', code: str(b?.code) || 'SUR', carrier: strOrNull(b?.carrier),
      serviceCategory: enumOrNull(b?.serviceCategory, CATEGORY) as any, direction: enumOrNull(b?.direction, DIRECTION) as any,
      country: strOrNull(b?.country), zone: strOrNull(b?.zone), postalFrom: strOrNull(b?.postalFrom), postalTo: strOrNull(b?.postalTo),
      basis: enumOr(b?.basis, BASIS, 'FIXED') as any, amount: dec(b?.amount), minAmount: decOrNull(b?.minAmount), maxAmount: decOrNull(b?.maxAmount),
      currency: str(b?.currency) || 'EUR', taxable: b?.taxable !== false, priority: int(b?.priority) || 100, isActive: b?.isActive !== false,
    }),
  },
  'country-zones': {
    model: prisma.countryZoneMapping, label: 'Country zone mapping', orderBy: { countryName: 'asc' },
    build: (b: any) => ({
      carrier: strOrNull(b?.carrier), serviceCategory: enumOrNull(b?.serviceCategory, CATEGORY) as any,
      countryName: str(b?.countryName) || 'Unknown', isoAlpha2: strOrNull(b?.isoAlpha2), isoAlpha3: strOrNull(b?.isoAlpha3),
      carrierCountryName: strOrNull(b?.carrierCountryName), carrierCountryCode: strOrNull(b?.carrierCountryCode),
      importZone: strOrNull(b?.importZone), exportZone: strOrNull(b?.exportZone), serviceAvailable: b?.serviceAvailable !== false,
      postalExceptions: strOrNull(b?.postalExceptions), remoteArea: bool(b?.remoteArea), isActive: b?.isActive !== false,
    }),
  },
  'carrier-services': {
    model: prisma.carrierService, label: 'Carrier service', orderBy: [{ category: 'asc' }, { carrier: 'asc' }],
    build: (b: any) => ({
      carrier: str(b?.carrier) || 'Carrier', name: str(b?.name) || 'Service', category: enumOr(b?.category, CATEGORY, 'EXPRESS') as any,
      code: strOrNull(b?.code), transitDays: strOrNull(b?.transitDays), isActive: b?.isActive !== false,
    }),
  },
  // Customer-facing services: the brand-free ForwardOne service names shown in the quote form.
  // Each maps to one or more internal carrier services (carrierServiceIds) that stay hidden from customers.
  'customer-services': {
    model: prisma.customerService, label: 'Customer service', orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
    build: (b: any) => ({
      name: str(b?.name) || 'Service', transitTime: strOrNull(b?.transitTime), category: enumOr(b?.category, CATEGORY, 'EXPRESS') as any,
      displayOrder: int(b?.displayOrder) || 0, isActive: b?.isActive !== false,
      carrierServiceIds: Array.isArray(b?.carrierServiceIds) ? b.carrierServiceIds.map((x: any) => String(x)).filter(Boolean) : [],
    }),
  },

  // ---- Phase 2.5: Global Location & shared master data ----
  // These are the module-agnostic source of truth (kept separate from carrier zone/tariff tables).
  'countries': {
    model: prisma.country, label: 'Country', orderBy: { name: 'asc' },
    searchFields: ['name', 'iso2', 'iso3'],
    refGuard: async (id: string) => countryRefCount(id),
    build: (b: any) => ({
      name: str(b?.name) || 'Unknown', iso2: (str(b?.iso2) || '').toUpperCase(), iso3: strOrNull(b?.iso3)?.toUpperCase() ?? null,
      callingCode: strOrNull(b?.callingCode), currency: strOrNull(b?.currency)?.toUpperCase() ?? null, isActive: b?.isActive !== false,
    }),
  },
  'regions': {
    model: prisma.region, label: 'Region / State', orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
    filterFields: ['countryId'], searchFields: ['name', 'code'], include: { country: { select: { name: true, iso2: true } } },
    refGuard: async (id: string) => prisma.city.count({ where: { regionId: id } }),
    build: (b: any) => ({
      countryId: str(b?.countryId), name: str(b?.name) || 'Unknown', code: strOrNull(b?.code), isActive: b?.isActive !== false,
    }),
  },
  'cities': {
    model: prisma.city, label: 'City', orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
    filterFields: ['countryId', 'regionId'], searchFields: ['name'], take: 500, include: { country: { select: { name: true, iso2: true } }, region: { select: { name: true } } },
    refGuard: async (id: string) => prisma.postalCode.count({ where: { cityId: id } }),
    build: (b: any) => ({
      countryId: str(b?.countryId), regionId: strOrNull(b?.regionId), name: str(b?.name) || 'Unknown', isActive: b?.isActive !== false,
    }),
  },
  'postal-codes': {
    model: prisma.postalCode, label: 'Postal code', orderBy: [{ countryId: 'asc' }, { code: 'asc' }],
    filterFields: ['countryId', 'cityId'], searchFields: ['code'], take: 500, include: { country: { select: { name: true, iso2: true } }, city: { select: { name: true } } },
    build: (b: any) => ({
      countryId: str(b?.countryId), cityId: strOrNull(b?.cityId), code: str(b?.code) || '', isActive: b?.isActive !== false,
    }),
  },
  'package-types': {
    model: prisma.packageType, label: 'Package type', orderBy: { name: 'asc' },
    build: (b: any) => ({
      code: (str(b?.code) || 'PKG').toUpperCase(), name: str(b?.name) || 'Package', description: strOrNull(b?.description), isActive: b?.isActive !== false,
    }),
  },
  'currencies': {
    model: prisma.currency, label: 'Currency', orderBy: { code: 'asc' },
    build: (b: any) => ({
      code: (str(b?.code) || 'XXX').toUpperCase(), name: str(b?.name) || 'Currency', symbol: strOrNull(b?.symbol), isActive: b?.isActive !== false,
    }),
  },
}

// Reference-count helper for countries: block hard delete when referenced by any child location.
async function countryRefCount(id: string): Promise<number> {
  const [regions, cities, postals] = await Promise.all([
    prisma.region.count({ where: { countryId: id } }),
    prisma.city.count({ where: { countryId: id } }),
    prisma.postalCode.count({ where: { countryId: id } }),
  ])
  return regions + cities + postals
}
