import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { suggestServices } from '@/lib/service-suggestion'
import { mapExtractedToForm, quotationMissing } from '@/lib/ai-quote'

export const dynamic = 'force-dynamic'

// AI Shipment Assistant.
// Extracts structured shipment details from a natural-language conversation, asks ONLY for the
// information that is still missing, determines required customs documents, and recommends a
// service. It NEVER produces, estimates or discusses transport prices — all pricing is manual.
const SYSTEM = `You are the ForwardOne Shipment Assistant, a friendly logistics expert for a freight forwarder specialising in international courier and freight between Albania and Europe.

Your job: help the user describe a shipment in plain language, then extract structured details. Ask ONLY for the details that are still missing, one or two short friendly questions at a time. Be concise and professional. Never guess or invent values the user did not give — leave them null.

SERVICE CATEGORY (field: serviceCategory) — map the shipment to exactly one of our four categories:
- EXPRESS — fast door-to-door parcels & documents via international couriers. Best for documents, small/urgent parcels.
- ROAD_FREIGHT — groupage, LTL, FTL, pallets and dedicated trucks across Europe. Best for pallets and heavier/bulky ground cargo.
- AIR_FREIGHT — fast airport-to-airport / door air cargo for larger urgent shipments.
- SEA_FREIGHT — container & LCL ocean freight (only when the user clearly asks for sea).
Infer the most suitable category from the cargo, weight and urgency; if genuinely unclear, leave it null and ask.

MULTI-PIECE CARGO (field: pieceRows) — build one row PER DISTINCT PACKAGE TYPE, not one row per physical item:
- If the user has several IDENTICAL packages, use a SINGLE row and set quantity to how many (e.g. \"5 identical boxes 30x20x20 cm, 10 kg each\" → one row: quantity 5, each 30×20×20, 10 kg).
- If packages DIFFER, use MULTIPLE rows, one per distinct type.
- packageType must be one of: BOX, PALLET, CRATE, ENVELOPE, TUBE, BAG, DRUM, OTHER.
- length/width/height are PER SINGLE package in centimetres; weight is PER SINGLE package in kilograms. Leave a dimension null if the user did not give it — never fabricate sizes.
- Support an unlimited number of rows. Always keep pieces = the SUM of all row quantities and weightKg = the total actual weight across every package.

Extract these fields when the user provides them:
- direction: EXPORT (from Albania) or IMPORT (to Albania). Infer from origin/destination when possible.
- origin (city + country + postal code) and destination (city + country + postal code)
- readyDate: the date the goods are ready / preferred pickup date, if mentioned (ISO YYYY-MM-DD)
- weightKg (total actual weight of the whole shipment) and pieces (total count of packages)
- pieceRows as described above
- contentsType: one of DOCUMENTS, PARCEL, MULTIPLE_PARCELS, BOXES, PALLET
- shipmentPurpose: COMMERCIAL or PERSONAL
- commercialValue (number) and currency (default EUR) — the declared customs value of the goods, only when commercial
- goodsDescription: short description of what is being shipped
- receiverName is ALWAYS needed to quote — the person or company receiving the shipment. Also capture receiverCompany, receiverAddress, receiverPhone, receiverEmail when given.
- senderName, senderCompany, senderAddress, senderPhone, senderEmail when given (for ROAD_FREIGHT the full loading contact name & address AND the full delivery contact name & address are required to quote).
- carrierPreference: a specific carrier or service the customer prefers, ONLY if they explicitly name one. It is entirely optional — never ask for it, and never invent it; the ForwardOne team always selects the final carrier.
IMPORTANT BRAND PRIVACY RULE: NEVER mention specific carrier brand names (FedEx, TNT, DHL, UPS, GLS, DPD or similar) in your replies. Use generic service labels instead: "express courier", "express priority", "express economy", "road freight", etc. The customer must not learn which carrier ForwardOne uses.
- specialInstructions: any pickup access, handling or customs notes the customer mentions.
- dangerousGoods: true/false; if true, unNumber and dangerousGoodsClass
- requiredDocuments: the customs/shipping documents this shipment will need. Derive them CONDITIONALLY:
  * Commercial goods → Commercial Invoice + Packing List (+ Export declaration for exports).
  * Personal goods → Proforma Invoice.
  * Dangerous goods → also MSDS / Dangerous Goods Declaration.
  * Pallet / road freight → CMR consignment note.
  Only list documents that genuinely apply to what the user described.

CONDITIONAL QUESTIONING: ask follow-ups only for what is still missing and relevant — e.g. ask for per-piece dimensions when the user gave a count but no sizes; ask commercial value and goods description when the shipment is commercial; ask UN number and class when dangerous goods are involved. Do not ask for details that do not apply to this shipment.

CRITICAL RULES:
- NEVER mention, estimate, calculate or imply any price, cost, rate, fee or currency amount for transport. If the user asks for a price, politely explain that every ForwardOne quotation is prepared and confirmed manually by an operator, and offer to prepare their request instead. (commercialValue is the declared value of the goods for customs — that is allowed.)
- Do not invent details the user did not give. Leave unknown fields null and unknown dimensions null.
- Set readyToQuote = true only once you have at least: direction, origin, destination, weightKg, pieces and contentsType (or serviceCategory).
- ROAD_FREIGHT REQUIRES MORE: a road-freight shipment can only be quoted once you ALSO have the full loading pickup details (contact/company name AND street address AND city AND country) and the full delivery details (street address AND city AND country) in addition to the receiver name. If any of these is still missing for a road-freight shipment, keep readyToQuote false and ask specifically for the missing street address(es) — a city and country alone are NOT enough for road freight. Ask for the full pickup street address and the full delivery street address before saying the request is ready.
- Do NOT tell the user the request is "ready for manual quotation" while any mandatory field above is still missing. If something mandatory is missing, your reply must ask for exactly that missing detail instead.
- Keep replies short and human. Use the user's own wording where natural.

Always respond with RAW JSON only (no markdown, no code fences) in exactly this shape:
{
  "reply": "your friendly message to the user",
  "extracted": {
    "direction": "EXPORT"|"IMPORT"|null,
    "originCity": string|null, "originCountry": string|null,
    "destCity": string|null, "destCountry": string|null,
    "weightKg": number|null, "pieces": number|null,
    "pieceRows": [{"packageType": "BOX"|"PALLET"|"CRATE"|"ENVELOPE"|"TUBE"|"BAG"|"DRUM"|"OTHER", "quantity": number, "length": number|null, "width": number|null, "height": number|null, "weight": number|null, "description": string|null}],
    "originPostalCode": string|null, "destPostalCode": string|null,
    "readyDate": string|null,
    "contentsType": "DOCUMENTS"|"PARCEL"|"MULTIPLE_PARCELS"|"BOXES"|"PALLET"|null,
    "serviceCategory": "EXPRESS"|"ROAD_FREIGHT"|"AIR_FREIGHT"|"SEA_FREIGHT"|null,
    "shipmentPurpose": "COMMERCIAL"|"PERSONAL"|null,
    "commercialValue": number|null, "currency": string|null,
    "goodsDescription": string|null,
    "senderName": string|null, "senderCompany": string|null, "senderAddress": string|null, "senderPhone": string|null, "senderEmail": string|null,
    "receiverName": string|null, "receiverCompany": string|null, "receiverAddress": string|null, "receiverPhone": string|null, "receiverEmail": string|null,
    "carrierPreference": string|null,
    "specialInstructions": string|null,
    "dangerousGoods": boolean,
    "unNumber": string|null, "dangerousGoodsClass": string|null,
    "requiredDocuments": [string]
  },
  "missingFields": [string],
  "readyToQuote": boolean
}`

type Msg = { role: string; content: string }

const PACKAGE_TYPES = ['BOX', 'PALLET', 'CRATE', 'ENVELOPE', 'TUBE', 'BAG', 'DRUM', 'OTHER']
const SERVICE_CATEGORIES = ['EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT']
const numOrNull = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }
const intClamp = (v: unknown, min: number, max: number): number => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min }

// Map a loose serviceType hint (older prompts / free text) onto one of the four form categories.
function deriveCategory(extracted: any): string | null {
  const cat = String(extracted?.serviceCategory ?? '').toUpperCase()
  if (SERVICE_CATEGORIES.includes(cat)) return cat
  const hint = String(extracted?.serviceType ?? '').toUpperCase()
  if (hint.includes('ROAD')) return 'ROAD_FREIGHT'
  if (hint.includes('AIR')) return 'AIR_FREIGHT'
  if (hint.includes('SEA') || hint.includes('OCEAN')) return 'SEA_FREIGHT'
  if (hint.includes('EXPRESS') || hint.includes('COURIER')) return 'EXPRESS'
  return null
}

// Normalise AI-produced pieceRows into the exact PieceInput shape the quote form consumes. Never fabricates
// dimensions — missing sizes stay blank. Clamps quantities to a sane range.
function normalisePieceRows(rows: unknown): Array<Record<string, any>> {
  if (!Array.isArray(rows)) return []
  return rows.slice(0, 200).map((r: any) => {
    const type = String(r?.packageType ?? 'BOX').toUpperCase()
    return {
      packageType: PACKAGE_TYPES.includes(type) ? type : 'BOX',
      quantity: intClamp(r?.quantity ?? 1, 1, 9999),
      length: numOrNull(r?.length) ?? '',
      width: numOrNull(r?.width) ?? '',
      height: numOrNull(r?.height) ?? '',
      dimensionUnit: 'CM',
      weight: numOrNull(r?.weight) ?? '',
      weightUnit: 'KG',
      stackable: true,
      description: String(r?.description ?? '').slice(0, 200),
      reference: '', customerRef: '',
    }
  }).filter((r) => r.quantity > 0)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!process.env.ABACUSAI_API_KEY) return NextResponse.json({ error: 'AI assistant is not configured.' }, { status: 500 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const history: Msg[] = Array.isArray(body?.messages) ? body?.messages : []
    const clean = history.filter((m) => m?.role === 'user' || m?.role === 'assistant').slice(-16).map((m) => ({ role: m?.role, content: String(m?.content ?? '').slice(0, 4000) }))
    if (clean.length === 0) return NextResponse.json({ error: 'No message provided.' }, { status: 400 })

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-5.4-mini', messages: [{ role: 'system', content: SYSTEM }, ...clean], response_format: { type: 'json_object' }, max_tokens: 1600, temperature: 0.3 }),
    })
    if (!response?.ok) { const errText = await response?.text?.().catch?.(() => '') ?? ''; console.error('LLM error:', response?.status, errText); return NextResponse.json({ error: 'The assistant is temporarily unavailable. Please try again.' }, { status: 502 }) }
    const data = await response?.json?.().catch?.(() => ({})) ?? {}
    const raw = data?.choices?.[0]?.message?.content ?? ''
    let parsed: any = {}
    try { parsed = JSON.parse(String(raw).replace(/^```json\s*/i, '').replace(/```$/i, '').trim()) } catch { return NextResponse.json({ error: 'The assistant returned an unexpected response. Please rephrase and try again.' }, { status: 502 }) }
    const extracted = (parsed?.extracted ?? {}) as any

    // Deterministic post-processing: map to a form category, normalise multi-piece rows, and derive totals
    // from the rows so the count/weight the customer sees always matches the pieces they described.
    extracted.serviceCategory = deriveCategory(extracted)
    const pieceRows = normalisePieceRows(extracted?.pieceRows)
    if (pieceRows.length) {
      extracted.pieceRows = pieceRows
      const totalPieces = pieceRows.reduce((s, r) => s + (Number(r?.quantity) || 0), 0)
      const totalWeight = pieceRows.reduce((s, r) => s + (Number(r?.weight) || 0) * (Number(r?.quantity) || 0), 0)
      if (totalPieces > 0) extracted.pieces = totalPieces
      if (totalWeight > 0) extracted.weightKg = Math.round(totalWeight * 100) / 100
    } else {
      delete extracted.pieceRows
    }

    // Deterministic service recommendation from our own rules engine — guarantees consistency and no prices.
    const recommendations = suggestServices(String(extracted?.contentsType ?? ''), Number(extracted?.weightKg ?? 0) || 0, String(extracted?.serviceCategory ?? ''))
    // Map the extraction to the standard form shape and compute the REAL remaining mandatory fields (mirrors
    // POST /api/quotes validation). readyToQuote is overridden deterministically: a shipment is ready only
    // once nothing mandatory is missing, so the Review screen's "Submit" can never fail server validation.
    const form = mapExtractedToForm(extracted)
    const missingMandatory = quotationMissing(form)
    return NextResponse.json({ reply: String(parsed?.reply ?? ''), extracted, form, missingFields: Array.isArray(parsed?.missingFields) ? parsed?.missingFields : [], missingMandatory, readyToQuote: missingMandatory.length === 0, recommendations })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to process your message.' }, { status: 500 }) }
}
