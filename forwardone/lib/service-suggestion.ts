export interface ServiceSuggestion {
  name: string
  carrier: string
  description: string
  reason: string
}

// Rules-based recommendation engine. NEVER produces a price — only suggests services
// with a plain-language explanation of why they fit the shipment characteristics.
// Customer-facing: uses generic ForwardOne service labels (never real carrier brands).
export function suggestServices(contentsType?: string, weightKg?: number, serviceType?: string): ServiceSuggestion[] {
  const type = String(contentsType ?? '')
  const weight = Number.isFinite(weightKg) ? Number(weightKg) : 0
  const isPallet = type === 'PALLET'
  const wantsRoad = serviceType === 'ROAD_FREIGHT'

  if (isPallet || weight > 100 || wantsRoad) {
    return [
      { name: 'Road Freight', carrier: 'Road Freight', description: 'Dedicated road capacity for heavy or palletised freight.', reason: `${isPallet ? 'Palletised cargo' : `Weight of ${weight} kg`} is best moved by road between Albania and Europe.` },
      { name: 'Groupage (LTL)', carrier: 'Road Freight', description: 'Shared road transport — you only pay for the space you use.', reason: 'Cost-effective for part-load shipments that are not time-critical.' },
    ]
  }
  if (type === 'DOCUMENTS' && weight <= 1) {
    return [
      { name: 'Express Priority', carrier: 'Express', description: 'Time-definite international document delivery.', reason: 'Documents under 1 kg qualify for the fastest express envelope service.' },
      { name: 'Express', carrier: 'Express', description: 'Worldwide door-to-door express for paperwork.', reason: 'Excellent global coverage for urgent documents.' },
    ]
  }
  if (weight <= 30) {
    return [
      { name: 'Express Priority', carrier: 'Express', description: 'Fast worldwide parcel delivery.', reason: `A ${weight} kg parcel is ideal for priority express with full tracking.` },
      { name: 'Express', carrier: 'Express', description: 'Urgent express delivery across Europe.', reason: 'Strong European network for small, time-sensitive parcels.' },
    ]
  }
  return [
    { name: 'Express Economy', carrier: 'Express', description: 'Cost-effective service for heavier consignments.', reason: `At ${weight} kg an economy service balances cost and transit time.` },
    { name: 'Road Economy', carrier: 'Road Freight', description: 'Reliable Albania–Europe road service.', reason: 'A good economy alternative for heavier boxes and parcels.' },
  ]
}
