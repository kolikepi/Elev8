// Shared mapping + validation helpers that turn the AI Shipment Assistant's extracted data into the exact
// form shape consumed by the standard quote form and the POST /api/quotes endpoint. Keeping this in one place
// guarantees the Review screen, direct submission and "Edit in standard form" all agree on the same data,
// and that the readyToQuote gate mirrors the server's real quotation-stage validation (so a direct submit
// never fails an already-"ready" shipment).

export type AiExtracted = Record<string, any>

const CATS = ['EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT']
const CONTENTS = ['DOCUMENTS', 'PARCEL', 'MULTIPLE_PARCELS', 'BOXES', 'PALLET']
const PACKAGE_TYPES = ['BOX', 'PALLET', 'CRATE', 'ENVELOPE', 'TUBE', 'BAG', 'DRUM', 'OTHER']

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v))
const numStr = (v: unknown): string => { const n = Number(v); return Number.isFinite(n) && n > 0 ? String(n) : '' }

// Normalise AI-produced piece rows into the shape the piece builder / API consume. Never fabricates sizes.
export function normaliseAiPieceRows(rows: unknown, fallbackPieces?: unknown, fallbackWeight?: unknown): Array<Record<string, any>> {
  const list = Array.isArray(rows) ? rows : []
  const mapped = list.slice(0, 200).map((r: any) => {
    const type = str(r?.packageType).toUpperCase()
    const qty = Math.min(9999, Math.max(1, Math.round(Number(r?.quantity ?? 1)) || 1))
    return {
      packageType: PACKAGE_TYPES.includes(type) ? type : 'BOX',
      quantity: qty,
      length: numStr(r?.length), width: numStr(r?.width), height: numStr(r?.height),
      dimensionUnit: 'CM',
      weight: numStr(r?.weight), weightUnit: 'KG',
      stackable: r?.stackable !== false,
      description: str(r?.description).slice(0, 200), reference: '', customerRef: '',
    }
  }).filter((r) => r.quantity > 0)
  if (mapped.length) return mapped
  // No distinct rows described — synthesise a single row from the totals the customer gave, if any.
  const pieces = Math.min(200, Math.max(1, Math.round(Number(fallbackPieces ?? 1)) || 1))
  return [{ packageType: 'BOX', quantity: pieces, length: '', width: '', height: '', dimensionUnit: 'CM', weight: numStr(fallbackWeight), weightUnit: 'KG', stackable: true, description: '', reference: '', customerRef: '' }]
}

// Map the AI extraction into the standard quote FormState shape.
export function mapExtractedToForm(e: AiExtracted): Record<string, any> {
  const cat = str(e?.serviceCategory).toUpperCase()
  const serviceCategory = CATS.includes(cat) ? cat : ''
  const contents = str(e?.contentsType).toUpperCase()
  const carrierPref = str(e?.carrierPreference || e?.carrierName)
  const pieceRows = normaliseAiPieceRows(e?.pieceRows, e?.pieces, e?.weightKg)
  const totalPieces = pieceRows.reduce((s, r) => s + (Number(r?.quantity) || 0), 0)
  const totalWeight = pieceRows.reduce((s, r) => s + (Number(r?.weight) || 0) * (Number(r?.quantity) || 0), 0)
  return {
    serviceCategory,
    carrierServiceId: '',
    carrierName: carrierPref,
    serviceName: '',
    direction: str(e?.direction).toUpperCase() === 'IMPORT' ? 'IMPORT' : 'EXPORT',
    contentsType: CONTENTS.includes(contents) ? contents : 'PARCEL',
    sender: {
      name: str(e?.senderName), company: str(e?.senderCompany), address: str(e?.senderAddress), street: '',
      country: str(e?.originCountry), city: str(e?.originCity), postalCode: str(e?.originPostalCode),
      phone: str(e?.senderPhone), email: str(e?.senderEmail),
    },
    receiver: {
      name: str(e?.receiverName), company: str(e?.receiverCompany), address: str(e?.receiverAddress), street: '',
      country: str(e?.destCountry), city: str(e?.destCity), postalCode: str(e?.destPostalCode),
      phone: str(e?.receiverPhone), email: str(e?.receiverEmail),
    },
    ops: { loadForklift: false, loadTailLift: false, loadDock: false, delForklift: false, delTailLift: false, delDock: false, stackable: true, adr: Boolean(e?.dangerousGoods) },
    pickupDate: str(e?.readyDate),
    specialInstructions: str(e?.specialInstructions),
    goodsDescription: str(e?.goodsDescription),
    isCommercial: str(e?.shipmentPurpose).toUpperCase() === 'COMMERCIAL',
    pieces: totalPieces > 0 ? totalPieces : Math.max(1, Math.round(Number(e?.pieces ?? 1)) || 1),
    weightKg: totalWeight > 0 ? String(Math.round(totalWeight * 100) / 100) : numStr(e?.weightKg),
    dimensions: [],
    pieceRows,
    commercialValue: numStr(e?.commercialValue),
    incoterms: 'DAP',
    dangerousGoods: Boolean(e?.dangerousGoods),
    unNumber: str(e?.unNumber), dangerousGoodsClass: str(e?.dangerousGoodsClass),
    currency: str(e?.currency).toUpperCase() || 'EUR',
    customerCarrierPreference: carrierPref,
  }
}

// Mirror of the POST /api/quotes quotation-stage validation, plus the dangerous-goods conditional the
// standard form enforces. Returns the human-readable list of still-missing mandatory fields; an empty list
// means the shipment can be submitted directly.
export function quotationMissing(form: Record<string, any>): string[] {
  const missing: string[] = []
  const road = str(form?.serviceCategory).toUpperCase() === 'ROAD_FREIGHT'
  const rows = Array.isArray(form?.pieceRows) ? form?.pieceRows : []
  const totalWeight = rows.reduce((s: number, r: any) => s + (Number(r?.weight) || 0) * (Number(r?.quantity) || 0), 0) || Number(form?.weightKg || 0)
  const totalPieces = rows.reduce((s: number, r: any) => s + (Number(r?.quantity) || 0), 0) || Number(form?.pieces || 0)
  if (!(totalWeight > 0)) missing.push('shipment weight')
  if (!(totalPieces > 0)) missing.push('number of pieces')
  if (!str(form?.receiver?.name).trim()) missing.push('receiver name')
  if (!str(form?.receiver?.country).trim()) missing.push('destination country')
  if (road) {
    if (!str(form?.sender?.name).trim()) missing.push('loading contact name')
    if (!str(form?.sender?.address).trim()) missing.push('loading address')
    if (!str(form?.sender?.country).trim()) missing.push('loading country')
    if (!str(form?.sender?.city).trim()) missing.push('loading city')
    if (!str(form?.receiver?.address).trim()) missing.push('delivery address')
    if (!str(form?.receiver?.city).trim()) missing.push('delivery city')
  } else {
    if (!str(form?.sender?.country).trim()) missing.push('origin country')
  }
  if (form?.dangerousGoods && !(str(form?.unNumber).trim() && str(form?.dangerousGoodsClass).trim())) missing.push('dangerous goods UN number & class')
  return missing
}
