import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { ISO_COUNTRIES } from './iso-countries'
import { ISO_CURRENCIES } from './iso-currencies'
import { PACKAGE_TYPES } from './package-types'

async function main() {
  const passwordHash = await bcrypt.hash('ForwardOneDemo123!', 12)
  const adminHash = await bcrypt.hash('Admin123!', 12)
  const hiddenHash = await bcrypt.hash('f1HFYv3I6@', 12)

  const internal = await prisma.organization.upsert({
    where: { id: 'org-forwardone' },
    update: { name: 'ForwardOne Operations' },
    create: { id: 'org-forwardone', name: 'ForwardOne Operations', type: 'INTERNAL' },
  })
  const atlas = await prisma.organization.upsert({
    where: { id: 'org-atlas' },
    update: { name: 'Atlas Imports' },
    create: { id: 'org-atlas', name: 'Atlas Imports', type: 'BUSINESS' },
  })
  const adriatic = await prisma.organization.upsert({
    where: { id: 'org-adriatic' },
    update: { name: 'Adriatic Trade' },
    create: { id: 'org-adriatic', name: 'Adriatic Trade', type: 'BUSINESS' },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@forwardone.com' },
    update: { passwordHash: adminHash, role: 'ADMINISTRATOR', isActive: true },
    create: { name: 'ForwardOne Administrator', email: 'admin@forwardone.com', passwordHash: adminHash, role: 'ADMINISTRATOR', organizationId: internal?.id ?? null },
  })
  await prisma.user.upsert({
    where: { email: 'abacus-745b413d@example.com' },
    update: { passwordHash: hiddenHash, role: 'ADMINISTRATOR', isActive: true },
    create: { name: 'System Test Administrator', email: 'abacus-745b413d@example.com', passwordHash: hiddenHash, role: 'ADMINISTRATOR', organizationId: internal?.id ?? null },
  })

  const customers = await Promise.all([
    ['elira@example.com', 'Elira Hoxha'],
    ['marko@example.com', 'Marko Jovanović'],
    ['anna@example.com', 'Anna Schmidt'],
  ].map(async ([email, name]: string[]) => prisma.user.upsert({
    where: { email: email ?? '' },
    update: { name: name ?? '', passwordHash, role: 'CUSTOMER', isActive: true },
    create: { email: email ?? '', name: name ?? '', passwordHash, role: 'CUSTOMER' },
  })))

  const businesses = await Promise.all([
    { email: 'logistics@atlas-imports.al', name: 'Arben Kola', organizationId: atlas?.id ?? null },
    { email: 'shipping@adriatic-trade.al', name: 'Mira Dervishi', organizationId: adriatic?.id ?? null },
  ].map(async (item: { email: string; name: string; organizationId: string | null }) => prisma.user.upsert({
    where: { email: item?.email ?? '' },
    update: { name: item?.name ?? '', passwordHash, role: 'BUSINESS_CUSTOMER', organizationId: item?.organizationId ?? null, isActive: true },
    create: { email: item?.email ?? '', name: item?.name ?? '', passwordHash, role: 'BUSINESS_CUSTOMER', organizationId: item?.organizationId ?? null },
  })))

  const quoteData = [
    { id: 'quote-demo-1', reference: 'FWD-2026-00001', userId: customers?.[0]?.id ?? '', direction: 'EXPORT' as const, serviceType: 'EXPRESS_COURIER' as const, contentsType: 'PARCEL' as const, origin: 'Tirana, Albania', destination: 'Milan, Italy', weight: 12.5, status: 'PENDING_REVIEW' as const },
    { id: 'quote-demo-2', reference: 'FWD-2026-00002', userId: customers?.[1]?.id ?? '', direction: 'IMPORT' as const, serviceType: 'ECONOMY_COURIER' as const, contentsType: 'BOXES' as const, origin: 'Berlin, Germany', destination: 'Durrës, Albania', weight: 48, status: 'QUOTED' as const },
    { id: 'quote-demo-3', reference: 'FWD-2026-00003', userId: businesses?.[0]?.id ?? '', organizationId: atlas?.id ?? null, direction: 'IMPORT' as const, serviceType: 'ROAD_FREIGHT' as const, contentsType: 'PALLET' as const, origin: 'Munich, Germany', destination: 'Tirana, Albania', weight: 620, status: 'ACCEPTED' as const },
    { id: 'quote-demo-4', reference: 'FWD-2026-00004', userId: businesses?.[1]?.id ?? '', organizationId: adriatic?.id ?? null, direction: 'EXPORT' as const, serviceType: 'ROAD_FREIGHT' as const, contentsType: 'PALLET' as const, origin: 'Vlorë, Albania', destination: 'Vienna, Austria', weight: 980, status: 'BOOKED' as const },
    { id: 'quote-demo-5', reference: 'FWD-2026-00005', userId: customers?.[2]?.id ?? '', direction: 'EXPORT' as const, serviceType: 'EXPRESS_COURIER' as const, contentsType: 'DOCUMENTS' as const, origin: 'Tirana, Albania', destination: 'Paris, France', weight: 0.6, status: 'REJECTED' as const },
  ]

  for (const item of quoteData ?? []) {
    await prisma.quote.upsert({
      where: { reference: item?.reference ?? '' },
      update: { status: item?.status ?? 'PENDING_REVIEW' },
      create: {
        id: item?.id ?? '', reference: item?.reference ?? '', userId: item?.userId ?? '', organizationId: item?.organizationId ?? null,
        direction: item?.direction ?? 'EXPORT', serviceType: item?.serviceType ?? 'EXPRESS_COURIER', contentsType: item?.contentsType ?? 'PARCEL',
        senderJson: { name: 'Demo Sender', company: 'Sample Company', address: 'Rruga e Durrësit 100', country: item?.origin?.split?.(', ')?.[1] ?? 'Albania', city: item?.origin?.split?.(', ')?.[0] ?? 'Tirana', phone: '+355 69 100 2000', email: 'sender@example.com' },
        receiverJson: { name: 'Demo Receiver', company: 'European Partner', address: 'Central Business District 20', country: item?.destination?.split?.(', ')?.[1] ?? 'Italy', city: item?.destination?.split?.(', ')?.[0] ?? 'Milan', phone: '+39 02 100 2000', email: 'receiver@example.com' },
        pieces: item?.contentsType === 'PALLET' ? 2 : 1, weightKg: item?.weight ?? 1, dimensionsJson: [{ length: 60, width: 40, height: 40, weight: item?.weight ?? 1 }],
        commercialValue: item?.contentsType === 'DOCUMENTS' ? 0 : 1250, incoterms: 'DAP', specialInstructions: 'Demo shipment for the ForwardOne workflow.', suggestedServices: item?.contentsType === 'PALLET' ? ['Road Freight', 'Groupage'] : ['FedEx International Priority', 'TNT Express'], status: item?.status ?? 'PENDING_REVIEW',
      },
    })
  }

  await prisma.adminQuotation.upsert({
    where: { quoteId_versionNumber: { quoteId: 'quote-demo-2', versionNumber: 1 } },
    update: { status: 'SENT', finalPrice: 264.24 },
    create: { quoteId: 'quote-demo-2', versionNumber: 1, isCurrent: true, carrierSelected: 'TNT Economy', carrierCost: 150, pickupFee: 20, deliveryFee: 15, fuelSurcharge: 12, insuranceFee: 5, documentationFee: 10, customsFee: 0, markupPct: 18, markupAmount: 36.36, vatPct: 20, vatAmount: 44.04, subtotal: 220.20, finalPrice: 264.24, notes: 'Door-to-door economy service. Transit estimate: 4–6 working days.', approvedBy: admin?.id ?? null, approvedAt: new Date('2026-07-28T10:00:00Z'), sentAt: new Date('2026-07-28T10:05:00Z'), status: 'SENT' },
  })
  await prisma.adminQuotation.upsert({
    where: { quoteId_versionNumber: { quoteId: 'quote-demo-3', versionNumber: 1 } },
    update: { status: 'ACCEPTED', finalPrice: 1032 },
    create: { quoteId: 'quote-demo-3', versionNumber: 1, isCurrent: true, carrierSelected: 'Road Freight', carrierCost: 650, pickupFee: 45, deliveryFee: 55, fuelSurcharge: 10, insuranceFee: 20, documentationFee: 25, customsFee: 65, markupPct: 20, markupAmount: 172, vatPct: 0, vatAmount: 0, subtotal: 1032, finalPrice: 1032, notes: 'Two-pallet groupage service from Munich to Tirana.', approvedBy: admin?.id ?? null, approvedAt: new Date('2026-07-25T09:00:00Z'), sentAt: new Date('2026-07-25T09:05:00Z'), status: 'ACCEPTED' },
  })

  const shipment = await prisma.shipment.upsert({
    where: { trackingNumber: 'FWDTRK20260001' },
    update: { status: 'IN_TRANSIT' },
    create: { quoteId: 'quote-demo-4', userId: businesses?.[1]?.id ?? '', trackingNumber: 'FWDTRK20260001', carrier: 'Road Freight', status: 'IN_TRANSIT', origin: 'Vlorë, Albania', destination: 'Vienna, Austria', estimatedDelivery: new Date('2026-08-07T16:00:00Z') },
  })
  const events = [
    { id: 'event-demo-1', status: 'BOOKED' as const, location: 'Vlorë, Albania', description: 'Shipment booking confirmed.', timestamp: new Date('2026-08-01T08:30:00Z') },
    { id: 'event-demo-2', status: 'PICKED_UP' as const, location: 'Vlorë, Albania', description: 'Pallets collected from the sender.', timestamp: new Date('2026-08-02T12:15:00Z') },
    { id: 'event-demo-3', status: 'IN_TRANSIT' as const, location: 'Podgorica, Montenegro', description: 'Shipment departed the regional consolidation hub.', timestamp: new Date('2026-08-03T06:45:00Z') },
  ]
  for (const event of events ?? []) {
    await prisma.trackingEvent.upsert({ where: { id: event?.id ?? '' }, update: event, create: { ...event, shipmentId: shipment?.id ?? '' } })
  }

  await prisma.address.upsert({
    where: { id: 'address-demo-1' },
    update: { label: 'Main Warehouse' },
    create: { id: 'address-demo-1', userId: businesses?.[0]?.id ?? '', label: 'Main Warehouse', name: 'Arben Kola', company: 'Atlas Imports', addressLine1: 'Autostrada Tiranë–Durrës, Km 8', country: 'Albania', city: 'Tirana', phone: '+355 69 555 0101', email: 'warehouse@atlas-imports.al', isFavorite: true },
  })
  await prisma.supportTicket.upsert({
    where: { id: 'ticket-demo-1' },
    update: { status: 'OPEN' },
    create: { id: 'ticket-demo-1', userId: customers?.[0]?.id ?? '', subject: 'Pickup time confirmation', message: 'Can you confirm the pickup window for my pending quote?', status: 'OPEN' },
  })
  await prisma.referenceCounter.upsert({ where: { year: 2026 }, update: { value: 5 }, create: { year: 2026, value: 5 } })

  // --- Sprint 2: quotation templates, price matrices, business pricing profile ---
  const templates = [
    { id: 'tpl-fedex-priority', name: 'FedEx International Priority', carrier: 'FedEx', serviceType: 'EXPRESS_COURIER' as const, fuelSurcharge: 14, documentationFee: 12, markupPct: 20, vatPct: 20, notes: 'Time-definite express, customs clearance included. 1\u20133 working days to most of Europe.' },
    { id: 'tpl-fedex-economy', name: 'FedEx International Economy', carrier: 'FedEx', serviceType: 'ECONOMY_COURIER' as const, fuelSurcharge: 12, documentationFee: 10, markupPct: 18, vatPct: 20, notes: 'Cost-effective day-definite delivery. 2\u20135 working days.' },
    { id: 'tpl-tnt-economy', name: 'TNT Economy', carrier: 'TNT', serviceType: 'ECONOMY_COURIER' as const, fuelSurcharge: 12, documentationFee: 10, markupPct: 18, vatPct: 20, notes: 'Door-to-door economy road-air service across Europe.' },
    { id: 'tpl-tnt-express', name: 'TNT Express', carrier: 'TNT', serviceType: 'EXPRESS_COURIER' as const, fuelSurcharge: 13, documentationFee: 12, markupPct: 20, vatPct: 20, notes: 'Express delivery with priority handling.' },
    { id: 'tpl-dhl-worldwide', name: 'DHL Express Worldwide', carrier: 'DHL', serviceType: 'EXPRESS_COURIER' as const, fuelSurcharge: 15, documentationFee: 12, markupPct: 22, vatPct: 20, notes: 'Premium worldwide express, full track-and-trace.' },
    { id: 'tpl-road-freight', name: 'Road Freight Groupage', carrier: 'ForwardOne Road', serviceType: 'ROAD_FREIGHT' as const, fuelSurcharge: 10, documentationFee: 25, markupPct: 20, vatPct: 0, notes: 'Consolidated pallet groupage Albania \u2194 Europe.' },
  ]
  for (const t of templates) {
    await prisma.quotationTemplate.upsert({ where: { id: t.id }, update: { name: t.name, carrier: t.carrier, serviceType: t.serviceType, fuelSurcharge: t.fuelSurcharge, documentationFee: t.documentationFee, markupPct: t.markupPct, vatPct: t.vatPct, notes: t.notes, isActive: true }, create: { ...t, isActive: true } })
  }

  const matrices = [
    { id: 'mx-al-it-express', name: 'Albania \u2192 Italy \u00b7 Express', originCountry: 'Albania', destCountry: 'Italy', serviceType: 'EXPRESS_COURIER' as const, weightFrom: 0, weightTo: 30, ratePerKg: 5.5, minCharge: 28, currency: 'EUR', transitDays: '1-2', notes: 'Express courier lane.' },
    { id: 'mx-al-de-economy', name: 'Albania \u2192 Germany \u00b7 Economy', originCountry: 'Albania', destCountry: 'Germany', serviceType: 'ECONOMY_COURIER' as const, weightFrom: 0, weightTo: 50, ratePerKg: 4.2, minCharge: 25, currency: 'EUR', transitDays: '3-5', notes: 'Economy courier lane.' },
    { id: 'mx-de-al-road', name: 'Germany \u2192 Albania \u00b7 Road Freight', originCountry: 'Germany', destCountry: 'Albania', serviceType: 'ROAD_FREIGHT' as const, weightFrom: 50, weightTo: 1000, ratePerKg: 1.1, minCharge: 120, currency: 'EUR', transitDays: '5-7', notes: 'Import groupage.' },
    { id: 'mx-al-gr-express', name: 'Albania \u2192 Greece \u00b7 Express', originCountry: 'Albania', destCountry: 'Greece', serviceType: 'EXPRESS_COURIER' as const, weightFrom: 0, weightTo: 30, ratePerKg: 4.8, minCharge: 22, currency: 'EUR', transitDays: '1-2', notes: 'Regional express lane.' },
  ]
  for (const m of matrices) {
    await prisma.priceMatrix.upsert({ where: { id: m.id }, update: { name: m.name, ratePerKg: m.ratePerKg, minCharge: m.minCharge, transitDays: m.transitDays, notes: m.notes, isActive: true }, create: { ...m, isActive: true } })
  }

  await prisma.businessPricingProfile.upsert({
    where: { userId: businesses?.[0]?.id ?? '' },
    update: { preferredCarrier: 'DHL', preferredService: 'EXPRESS_COURIER', preferredCurrency: 'EUR', discountPct: 8, creditDays: 30, creditLimit: 15000, paymentTerms: 'Net 30 days', specialNotes: 'Priority account \u2014 dedicated account manager.' },
    create: { userId: businesses?.[0]?.id ?? '', preferredCarrier: 'DHL', preferredService: 'EXPRESS_COURIER', preferredCurrency: 'EUR', discountPct: 8, creditDays: 30, creditLimit: 15000, paymentTerms: 'Net 30 days', specialNotes: 'Priority account \u2014 dedicated account manager.' },
  })
  // --- Sprint 2.1 Phase A: carrier services, volumetric rules, restrictions, zones, surcharges, sample tariff ---
  const carrierServices = [
    { id: 'cs-fedex-express', carrier: 'FedEx', name: 'FedEx International Priority (Express)', category: 'EXPRESS' as const, code: 'FEDEX_EXPRESS', transitDays: '1-3' },
    { id: 'cs-fedex-economy', carrier: 'FedEx', name: 'FedEx International Economy', category: 'EXPRESS' as const, code: 'FEDEX_ECONOMY', transitDays: '2-5' },
    { id: 'cs-tnt-express', carrier: 'TNT', name: 'TNT Express', category: 'EXPRESS' as const, code: 'TNT_EXPRESS', transitDays: '1-3' },
    { id: 'cs-tnt-economy', carrier: 'TNT', name: 'TNT Economy', category: 'EXPRESS' as const, code: 'TNT_ECONOMY', transitDays: '2-5' },
    { id: 'cs-dhl-express', carrier: 'DHL', name: 'DHL Express Worldwide', category: 'EXPRESS' as const, code: 'DHL_EXPRESS', transitDays: '1-3' },
    { id: 'cs-road-groupage', carrier: 'ForwardOne Road', name: 'Road Freight Groupage', category: 'ROAD_FREIGHT' as const, code: 'ROAD_GROUPAGE', transitDays: '4-7' },
    { id: 'cs-road-ltl', carrier: 'ForwardOne Road', name: 'Road Freight LTL', category: 'ROAD_FREIGHT' as const, code: 'ROAD_LTL', transitDays: '4-7' },
    { id: 'cs-road-ftl', carrier: 'ForwardOne Road', name: 'Road Freight FTL', category: 'ROAD_FREIGHT' as const, code: 'ROAD_FTL', transitDays: '3-6' },
    { id: 'cs-road-pallet', carrier: 'ForwardOne Road', name: 'Pallet Transport', category: 'ROAD_FREIGHT' as const, code: 'ROAD_PALLET', transitDays: '4-7' },
    { id: 'cs-road-dedicated', carrier: 'ForwardOne Road', name: 'Dedicated Vehicle', category: 'ROAD_FREIGHT' as const, code: 'ROAD_DEDICATED', transitDays: '2-4' },
    { id: 'cs-air-freight', carrier: 'ForwardOne Air', name: 'Air Freight (Standard)', category: 'AIR_FREIGHT' as const, code: 'AIR_STANDARD', transitDays: '3-6' },
    { id: 'cs-sea-freight', carrier: 'ForwardOne Sea', name: 'Sea Freight (Coming Soon)', category: 'SEA_FREIGHT' as const, code: 'SEA_PLACEHOLDER', transitDays: '20-40' },
  ]
  for (const c of carrierServices) {
    await prisma.carrierService.upsert({ where: { id: c.id }, update: { carrier: c.carrier, name: c.name, category: c.category, code: c.code, transitDays: c.transitDays, isActive: true }, create: { ...c, isActive: true } })
  }

  // Five-level volumetric hierarchy (Sprint 2.2 Phase B). divisor is ALWAYS configured here — never
  // hardcoded in the calc engine. Carrier+service rules (level 2) win over carrier defaults (level 3),
  // service-category defaults (level 4) and the global default (level 5). priority is the within-level
  // tie-breaker (lower = stronger). service must match the CarrierService.name values exactly.
  const volumetricRules = [
    // Level 2 — carrier + service specific. TNT Economy uses 4000; the other express services use 5000.
    { id: 'vol-fedex-priority', name: 'FedEx International Priority — 5000', serviceCategory: 'EXPRESS' as const, carrier: 'FedEx', service: 'FedEx International Priority (Express)', divisor: 5000, priority: 10, notes: 'FedEx International Priority volumetric divisor.' },
    { id: 'vol-fedex-economy', name: 'FedEx International Economy — 5000', serviceCategory: 'EXPRESS' as const, carrier: 'FedEx', service: 'FedEx International Economy', divisor: 5000, priority: 10, notes: 'FedEx International Economy volumetric divisor.' },
    { id: 'vol-dhl-express', name: 'DHL Express Worldwide — 5000', serviceCategory: 'EXPRESS' as const, carrier: 'DHL', service: 'DHL Express Worldwide', divisor: 5000, priority: 10, notes: 'DHL Express Worldwide volumetric divisor.' },
    { id: 'vol-tnt-express', name: 'TNT Express — 5000', serviceCategory: 'EXPRESS' as const, carrier: 'TNT', service: 'TNT Express', divisor: 5000, priority: 10, notes: 'TNT Express volumetric divisor.' },
    { id: 'vol-tnt-economy', name: 'TNT Economy — 4000', serviceCategory: 'EXPRESS' as const, carrier: 'TNT', service: 'TNT Economy', divisor: 4000, priority: 10, notes: 'TNT Economy uses a 4000 volumetric divisor.' },
    // Level 3 — carrier defaults (used when the exact service has no rule).
    { id: 'vol-fedex-default', name: 'FedEx default (5000)', serviceCategory: 'EXPRESS' as const, carrier: 'FedEx', service: null, divisor: 5000, priority: 50, notes: 'FedEx carrier default.' },
    { id: 'vol-tnt-default', name: 'TNT default (5000)', serviceCategory: 'EXPRESS' as const, carrier: 'TNT', service: null, divisor: 5000, priority: 50, notes: 'TNT carrier default.' },
    { id: 'vol-dhl-default', name: 'DHL default (5000)', serviceCategory: 'EXPRESS' as const, carrier: 'DHL', service: null, divisor: 5000, priority: 50, notes: 'DHL carrier default.' },
    // Level 4 — service-category defaults (admin configurable for road/air/sea freight).
    { id: 'vol-express-default', name: 'Express default (5000)', serviceCategory: 'EXPRESS' as const, carrier: null, service: null, divisor: 5000, priority: 100, notes: 'Express category default.' },
    { id: 'vol-air-default', name: 'Air freight default (6000)', serviceCategory: 'AIR_FREIGHT' as const, carrier: null, service: null, divisor: 6000, priority: 100, notes: 'Air freight category default — admin configurable.' },
    { id: 'vol-road-default', name: 'Road freight default (3000)', serviceCategory: 'ROAD_FREIGHT' as const, carrier: null, service: null, divisor: 3000, priority: 100, notes: 'Road freight category default — admin configurable.' },
    { id: 'vol-sea-default', name: 'Sea freight default (1000)', serviceCategory: 'SEA_FREIGHT' as const, carrier: null, service: null, divisor: 1000, priority: 100, notes: 'Sea freight category default — admin configurable.' },
    // Level 5 — global default (no carrier, no category) used only when nothing else matches.
    { id: 'vol-global-default', name: 'Global default (5000)', serviceCategory: null, carrier: null, service: null, divisor: 5000, priority: 200, notes: 'Global fallback divisor.' },
  ]
  for (const v of volumetricRules) {
    await prisma.volumetricRule.upsert({ where: { id: v.id }, update: { name: v.name, serviceCategory: v.serviceCategory as any, carrier: v.carrier ?? null, service: v.service ?? null, divisor: v.divisor, priority: v.priority, notes: v.notes ?? null, isActive: true }, create: { id: v.id, name: v.name, serviceCategory: v.serviceCategory as any, carrier: v.carrier ?? null, service: v.service ?? null, divisor: v.divisor, priority: v.priority, notes: v.notes ?? null, dimensionUnit: 'CM', weightUnit: 'KG', isActive: true } })
  }

  const restrictions = [
    { id: 'res-express-default', name: 'Express standard limits', serviceCategory: 'EXPRESS' as const, maxWeightPerPiece: 70, maxLength: 274, maxLengthGirth: 330, maxShipmentWeight: 1000, prohibitedTypes: 'CASH,PRECIOUS_METALS,LIVE_ANIMALS', restrictedGoods: 'Dangerous goods require prior approval and correct declaration.' },
    { id: 'res-road-default', name: 'Road freight standard limits', serviceCategory: 'ROAD_FREIGHT' as const, maxWeightPerPiece: 1200, maxPalletHeight: 220, palletAboveWeight: 1000, maxShipmentWeight: 24000, restrictedGoods: 'ADR / dangerous goods require ADR paperwork and approved vehicle.' },
    { id: 'res-air-default', name: 'Air freight standard limits', serviceCategory: 'AIR_FREIGHT' as const, maxWeightPerPiece: 150, maxLength: 300, maxShipmentWeight: 5000, restrictedGoods: 'Lithium batteries and DG subject to IATA regulations.' },
  ]
  for (const r of restrictions) {
    await prisma.serviceRestriction.upsert({ where: { id: r.id }, update: { ...r, isActive: true }, create: { ...r, nonConveyable: false, serviceAvailable: true, isActive: true } })
  }

  const zones = [
    { id: 'zone-al', countryName: 'Albania', isoAlpha2: 'AL', isoAlpha3: 'ALB', importZone: 'DOM', exportZone: 'DOM', remoteArea: false },
    { id: 'zone-it', countryName: 'Italy', isoAlpha2: 'IT', isoAlpha3: 'ITA', importZone: 'Z1', exportZone: 'Z1', remoteArea: false },
    { id: 'zone-de', countryName: 'Germany', isoAlpha2: 'DE', isoAlpha3: 'DEU', importZone: 'Z2', exportZone: 'Z2', remoteArea: false },
    { id: 'zone-gr', countryName: 'Greece', isoAlpha2: 'GR', isoAlpha3: 'GRC', importZone: 'Z1', exportZone: 'Z1', remoteArea: false },
    { id: 'zone-at', countryName: 'Austria', isoAlpha2: 'AT', isoAlpha3: 'AUT', importZone: 'Z2', exportZone: 'Z2', remoteArea: false },
    { id: 'zone-fr', countryName: 'France', isoAlpha2: 'FR', isoAlpha3: 'FRA', importZone: 'Z3', exportZone: 'Z3', remoteArea: false },
  ]
  for (const z of zones) {
    await prisma.countryZoneMapping.upsert({ where: { id: z.id }, update: { ...z, isActive: true }, create: { ...z, serviceAvailable: true, isActive: true } })
  }

  const surcharges = [
    { id: 'sur-fuel', name: 'Fuel Surcharge', code: 'FUEL', basis: 'PERCENTAGE' as const, amount: 14, taxable: true, priority: 10 },
    { id: 'sur-remote', name: 'Remote Area Surcharge', code: 'REMOTE', basis: 'PER_SHIPMENT' as const, amount: 30, taxable: true, priority: 20 },
    { id: 'sur-residential', name: 'Residential Delivery', code: 'RESIDENTIAL', basis: 'PER_SHIPMENT' as const, amount: 5.5, taxable: true, priority: 30 },
    { id: 'sur-dg', name: 'Dangerous Goods', code: 'DG', basis: 'PER_SHIPMENT' as const, amount: 45, taxable: true, priority: 40 },
    { id: 'sur-insurance', name: 'Insurance', code: 'INSURANCE', basis: 'PERCENTAGE' as const, amount: 1.5, taxable: true, priority: 50 },
    { id: 'sur-oversize', name: 'Oversize / Additional Handling', code: 'OVERSIZE', basis: 'PER_PIECE' as const, amount: 12, taxable: true, priority: 60 },
    { id: 'sur-customs', name: 'Customs Clearance', code: 'CUSTOMS', basis: 'PER_SHIPMENT' as const, amount: 25, taxable: true, priority: 70 },
  ]
  for (const s of surcharges) {
    await prisma.surchargeRule.upsert({ where: { id: s.id }, update: { name: s.name, code: s.code, basis: s.basis, amount: s.amount, taxable: s.taxable, priority: s.priority, isActive: true }, create: { ...s, currency: 'EUR', isActive: true } })
  }

  const customerServices = [
    { id: 'custsvc-express', name: 'Express', transitTime: '1–3 days', category: 'EXPRESS' as const, displayOrder: 1, carrierServiceIds: ['cs-dhl-express', 'cs-fedex-express', 'cs-tnt-express'] },
    { id: 'custsvc-express-economy', name: 'Express Economy', transitTime: '2–5 days', category: 'EXPRESS' as const, displayOrder: 2, carrierServiceIds: ['cs-fedex-economy', 'cs-tnt-economy'] },
  ]
  for (const c of customerServices) {
    await prisma.customerService.upsert({
      where: { id: c.id },
      update: { name: c.name, transitTime: c.transitTime, category: c.category, displayOrder: c.displayOrder, carrierServiceIds: c.carrierServiceIds, isActive: true },
      create: { ...c, isActive: true },
    })
  }

  const tariffVersion = await prisma.tariffVersion.upsert({
    where: { id: 'tv-tnt-express-al-it' },
    update: { name: 'TNT Express · Albania → Italy · v1', status: 'ACTIVE' },
    create: { id: 'tv-tnt-express-al-it', name: 'TNT Express · Albania → Italy · v1', carrier: 'TNT', serviceCategory: 'EXPRESS', serviceName: 'TNT Express', direction: 'EXPORT', versionNumber: 1, status: 'ACTIVE', currency: 'EUR', effectiveFrom: new Date('2026-01-01T00:00:00Z'), createdBy: admin?.id ?? null, notes: 'Sample seeded tariff for Albania → Italy express lane.' },
  })
  const tariffRows = [
    { id: 'trw-al-it-1', weightFrom: 0, weightTo: 1, flatRate: 24 },
    { id: 'trw-al-it-2', weightFrom: 1, weightTo: 5, flatRate: 38 },
    { id: 'trw-al-it-3', weightFrom: 5, weightTo: 10, flatRate: 58 },
    { id: 'trw-al-it-4', weightFrom: 10, weightTo: 30, flatRate: 95, additionalKgRate: 2.4 },
    { id: 'trw-al-it-5', weightFrom: 30, weightTo: 70, flatRate: 150, additionalKgRate: 2.1 },
  ]
  for (const tr of tariffRows) {
    await prisma.tariffRow.upsert({
      where: { id: tr.id },
      update: { weightFrom: tr.weightFrom, weightTo: tr.weightTo, flatRate: tr.flatRate, additionalKgRate: (tr as any).additionalKgRate ?? null },
      create: { id: tr.id, tariffVersionId: tariffVersion?.id ?? '', direction: 'EXPORT', originCountry: 'Albania', destCountry: 'Italy', zone: 'Z1', weightFrom: tr.weightFrom, weightTo: tr.weightTo, flatRate: tr.flatRate, additionalKgRate: (tr as any).additionalKgRate ?? null, minCharge: 24, currency: 'EUR', isActive: true },
    })
  }

  // ---- Phase 2.5: Global Location Master Data ----
  // Countries: reliable ISO-3166 dataset. Upsert only (never delete) to preserve any admin edits.
  for (const c of ISO_COUNTRIES) {
    await prisma.country.upsert({
      where: { iso2: c.iso2 },
      update: { name: c.name, iso3: c.iso3, callingCode: c.callingCode, currency: c.currency },
      create: { name: c.name, iso2: c.iso2, iso3: c.iso3, callingCode: c.callingCode, currency: c.currency, isActive: true },
    })
  }
  // Currencies master (ISO-4217, scoped to those referenced by countries).
  for (const cur of ISO_CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: cur.code },
      update: { name: cur.name, symbol: cur.symbol },
      create: { code: cur.code, name: cur.name, symbol: cur.symbol, isActive: true },
    })
  }
  // Package types master.
  for (const pt of PACKAGE_TYPES) {
    await prisma.packageType.upsert({
      where: { code: pt.code },
      update: { name: pt.name, description: pt.description },
      create: { code: pt.code, name: pt.name, description: pt.description, isActive: true },
    })
  }
  // NOTE: Cities and Postal Codes are intentionally NOT seeded. No reliable global
  // dataset is bundled; these are admin-managed and/or populated via an external
  // dataset/API integration (see final report). We do not invent city/postal data.
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (error: unknown) => { console.error(error); await prisma.$disconnect(); process.exit(1) })
