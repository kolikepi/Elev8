import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { customerServiceLabel } from '@/lib/customer-service-label'
import { customerStatusLabel, customsCustomerMessage, customsActionRequired, milestonesFor, lifecycleIndex } from '@/lib/shipment-lifecycle'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const query = new URL(request?.url ?? '').searchParams?.get?.('query')?.trim?.() ?? ''
    if (!query) return NextResponse.json({ error: 'A tracking or reference number is required.' }, { status: 400 })
    // Guard against enumeration / overly-broad scans: require a plausible full identifier.
    if (query.length < 6 || query.length > 40) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })
    const include = { quote: { select: { reference: true } }, trackingEvents: { orderBy: { timestamp: 'desc' as const } } }
    // Prioritised exact-match lookup: tracking number, then the customer-facing shipment
    // reference (FWD-YYYY-NNNNN), then the originating quote reference. Exact match only
    // — no partial/contains matching — so references cannot be enumerated.
    const shipment =
      (await prisma.shipment.findFirst({ where: { trackingNumber: query }, include })) ||
      (await prisma.shipment.findFirst({ where: { reference: query }, include })) ||
      (await prisma.shipment.findFirst({ where: { quote: { reference: query } }, include }))
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    // Customer-friendly event feed — hide internal descriptions and carrier codes.
    const events = (shipment?.trackingEvents ?? []).map((e: any) => ({
      status: e?.status ?? '',
      statusLabel: customerStatusLabel(e?.status),
      location: e?.location ?? '',
      country: e?.country ?? '',
      description: e?.customerDescription || e?.description || '',
      timestamp: e?.timestamp ?? null,
    }))

    const [originCountry, destCountry] = [shipment?.origin ?? '', shipment?.destination ?? ''].map((s) => (s.split(',').pop() ?? '').trim())
    const customsMessage = shipment?.customsSubStatus ? customsCustomerMessage(shipment?.customsSubStatus) : ''

    return NextResponse.json({
      shipment: serializeData({
        trackingNumber: shipment?.trackingNumber ?? '',
        reference: shipment?.reference ?? shipment?.quote?.reference ?? '',
        carrier: customerServiceLabel(shipment?.carrier),
        status: shipment?.status ?? '',
        statusLabel: customerStatusLabel(shipment?.status),
        stageIndex: lifecycleIndex(shipment?.status),
        milestones: milestonesFor({ originCountry, destCountry }),
        customsMessage,
        customsActionRequired: shipment?.customsSubStatus ? customsActionRequired(shipment?.customsSubStatus) : false,
        actionRequired: shipment?.actionRequired ?? false,
        actionMessage: shipment?.actionMessage ?? '',
        origin: shipment?.origin ?? '',
        destination: shipment?.destination ?? '',
        estimatedDelivery: shipment?.estimatedDelivery ?? null,
        events,
      }),
    })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Tracking is temporarily unavailable.' }, { status: 500 })
  }
}
