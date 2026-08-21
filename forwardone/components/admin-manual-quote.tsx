'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Boxes, Check, Loader2, MapPin, Package, Plus, Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { PieceBuilder, emptyPiece } from '@/components/piece-builder'
import { calcShipment, resolveDivisor, type PieceInput } from '@/lib/piece-calc'

type Row = any
type Party = { name: string; company: string; address: string; country: string; city: string; postalCode: string; phone: string; email: string }
type LocOpt = { id: string; name: string }

const emptyParty: Party = { name: '', company: '', address: '', country: '', city: '', postalCode: '', phone: '', email: '' }
const CATEGORIES = [['EXPRESS', 'Express Courier'], ['ROAD_FREIGHT', 'Road Freight'], ['AIR_FREIGHT', 'Air Freight'], ['SEA_FREIGHT', 'Sea Freight']]
const CONTENTS = [['DOCUMENTS', 'Documents'], ['PARCEL', 'Parcel'], ['MULTIPLE_PARCELS', 'Multiple Parcels'], ['BOXES', 'Boxes'], ['PALLET', 'Pallet']]
const SOURCES = [['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['PHONE', 'Phone'], ['ADMIN', 'Admin / walk-in']]
const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

// Admin-side manual Quote Request. Used when shipment details arrive OUTSIDE the customer portal
// (WhatsApp / email / phone). It reuses the same Quote model + downstream Quote→Offer→Booking→Shipment→Invoice
// flow — this form just collects the customer + shipment details and POSTs to /api/admin/quotes/create.
export function AdminManualQuote({ users, onCancel, onCreated }: { users: Row[]; onCancel: () => void; onCreated: (id: string) => void }) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [localUsers, setLocalUsers] = useState<Row[]>(users ?? [])
  const [newCust, setNewCust] = useState({ name: '', email: '', role: 'CUSTOMER', companyName: '', billingLegalName: '', billingTaxId: '', contactPerson: '', phone: '' })

  const [addresses, setAddresses] = useState<Row[]>([])
  const [countries, setCountries] = useState<LocOpt[]>([])
  const [volumetricRules, setVolumetricRules] = useState<Array<Record<string, any>>>([])
  const [restrictions, setRestrictions] = useState<Array<Record<string, any>>>([])

  const [serviceCategory, setServiceCategory] = useState('EXPRESS')
  const [direction, setDirection] = useState('EXPORT')
  const [contentsType, setContentsType] = useState('PARCEL')
  const [sender, setSender] = useState<Party>({ ...emptyParty })
  const [receiver, setReceiver] = useState<Party>({ ...emptyParty })
  const [pieceRows, setPieceRows] = useState<PieceInput[]>([{ ...emptyPiece }])
  const [goodsDescription, setGoodsDescription] = useState('')
  const [isCommercial, setIsCommercial] = useState(false)
  const [commercialValue, setCommercialValue] = useState('')
  const [incoterms, setIncoterms] = useState('DAP')
  const [dangerousGoods, setDangerousGoods] = useState(false)
  const [unNumber, setUnNumber] = useState('')
  const [dangerousGoodsClass, setDangerousGoodsClass] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [requestSource, setRequestSource] = useState('WHATSAPP')
  const [internalNotes, setInternalNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setLocalUsers(users ?? []) }, [users])
  useEffect(() => { void fetch('/api/locations/countries').then((r) => r?.json?.().catch?.(() => ({}))).then((d) => setCountries(((d?.countries ?? []) as Row[]).map((c) => ({ id: String(c?.id ?? ''), name: String(c?.name ?? '') })).filter((c) => c?.name))).catch((e: unknown) => console.error(e)) }, [])
  useEffect(() => { void fetch('/api/carrier-services').then((r) => r?.json?.().catch?.(() => ({}))).then((d) => { setVolumetricRules((d?.volumetricRules ?? []) as Row[]); setRestrictions((d?.restrictions ?? []) as Row[]) }).catch((e: unknown) => console.error(e)) }, [])
  useEffect(() => { if (!customerId) { setAddresses([]); return } void fetch(`/api/admin/users/${customerId}/addresses`).then((r) => r?.json?.().catch?.(() => ({}))).then((d) => setAddresses((d?.addresses ?? []) as Row[])).catch((e: unknown) => console.error(e)) }, [customerId])

  const isRoad = serviceCategory === 'ROAD_FREIGHT'; const isSea = serviceCategory === 'SEA_FREIGHT'
  const divisor = useMemo(() => resolveDivisor(volumetricRules, { serviceCategory, carrier: '' }), [volumetricRules, serviceCategory])
  const shipment = useMemo(() => calcShipment(pieceRows ?? [], divisor), [pieceRows, divisor])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase(); if (!q) return (localUsers ?? []).slice(0, 8)
    return (localUsers ?? []).filter((u: Row) => `${u?.name ?? ''} ${u?.email ?? ''} ${u?.billingLegalName ?? ''} ${u?.billingTradingName ?? ''} ${u?.billingTaxId ?? ''}`.toLowerCase().includes(q)).slice(0, 12)
  }, [localUsers, query])
  const selectedCustomer = (localUsers ?? []).find((u: Row) => u?.id === customerId) ?? null

  function applyAddress(side: 'sender' | 'receiver', a: Row) {
    const patch: Party = { name: String(a?.name ?? ''), company: String(a?.company ?? ''), address: [a?.addressLine1, a?.addressLine2].filter(Boolean).join(', '), country: String(a?.country ?? ''), city: String(a?.city ?? ''), postalCode: String(a?.zip ?? ''), phone: String(a?.phone ?? ''), email: String(a?.email ?? '') }
    if (side === 'sender') setSender(patch); else setReceiver(patch)
  }

  async function createCustomer() {
    const name = newCust.name.trim(); const email = newCust.email.trim().toLowerCase()
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast?.error?.('Enter a name and a valid email for the new customer.'); return }
    setCreatingCustomer(true)
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCust) })
      const data = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(data?.error ?? 'Unable to create the customer.')
      const created = { id: data?.id ?? '', name, email, role: data?.role ?? newCust.role, billingLegalName: newCust.billingLegalName || null, billingTradingName: newCust.companyName || null, billingTaxId: newCust.billingTaxId || null }
      setLocalUsers((prev: Row[]) => [created, ...(prev ?? [])])
      setCustomerId(created.id); setShowNew(false); setQuery('')
      toast?.success?.('Customer created and selected.')
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Unable to create the customer.' : 'Unable to create the customer.') } finally { setCreatingCustomer(false) }
  }

  function canSubmit(): boolean {
    if (!customerId) return false
    if (!((shipment?.totals?.actualWeight ?? 0) > 0)) return false
    if (!receiver.name || !receiver.country) return false
    if (isRoad) { if (!sender.name || !sender.address || !sender.country || !sender.city || !receiver.address || !receiver.city) return false } else { if (!sender.country) return false }
    if (dangerousGoods && (!unNumber || !dangerousGoodsClass)) return false
    return true
  }

  async function submit() {
    if (!canSubmit()) { toast?.error?.('Complete the required customer and shipment fields before creating the request.'); return }
    setSubmitting(true)
    try {
      const payload = JSON.stringify({
        customerId, serviceCategory, direction, contentsType, sender, receiver,
        pieceRows, pieces: shipment?.totals?.totalPieces ?? 1, weightKg: String(shipment?.totals?.actualWeight ?? 0),
        goodsDescription, isCommercial, commercialValue, incoterms, dangerousGoods, unNumber, dangerousGoodsClass,
        pickupDate: pickupDate || undefined, specialInstructions, requestSource, internalNotes,
      })
      const response = await fetch('/api/admin/quotes/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
      const data = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(data?.error ?? 'Unable to create the quote request.')
      toast?.success?.(`Quote ${data?.quote?.reference ?? ''} created. Prepare the quotation and offers next.`)
      const id = data?.quote?.id ?? ''
      onCreated(id)
      if (id) router?.push?.(`/admin/quotes/${id}`)
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Unable to create the quote request.' : 'Unable to create the quote request.') } finally { setSubmitting(false) }
  }

  return <div className="grid gap-5">
    <div className="flex items-center justify-between gap-3">
      <div><p className="section-kicker">Manual quote intake</p><h2 className="text-2xl font-bold text-[#0A1628]">New Quote Request</h2><p className="mt-1 text-sm text-slate-500">Log a shipment request that arrived by WhatsApp, email or phone. It uses the same quotation, offer and booking flow as a portal request.</p></div>
      <button type="button" onClick={onCancel} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back to quotes</button>
    </div>

    <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      <h3 className="flex items-center gap-2 font-bold text-[#0A1628]"><UserRound className="h-4 w-4 text-green-600" /> Customer</h3>
      <p className="mt-1 text-xs text-slate-500">Search the Customer Master by name, legal name or NIPT, or create a new customer.</p>
      {selectedCustomer ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50/60 p-4"><div><p className="font-semibold text-[#0A1628]">{selectedCustomer?.name ?? ''}</p><p className="text-xs text-slate-500">{selectedCustomer?.email ?? ''}{selectedCustomer?.billingLegalName ? ` · ${selectedCustomer?.billingLegalName}` : ''}{selectedCustomer?.billingTaxId ? ` · NIPT ${selectedCustomer?.billingTaxId}` : ''}</p></div><button type="button" onClick={() => { setCustomerId(''); setSender({ ...emptyParty }); setReceiver({ ...emptyParty }) }} className="text-xs font-semibold text-slate-500 underline">Change</button></div> : <div className="mt-4 grid gap-3">
        <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="field h-10 pl-9" value={query} onChange={(e) => setQuery(e?.target?.value ?? '')} placeholder="Search name, legal name or NIPT" /></label>
        <div className="grid gap-2">{matches?.map?.((u: Row) => <button type="button" key={u?.id ?? ''} onClick={() => setCustomerId(u?.id ?? '')} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:border-green-300 hover:bg-green-50/40"><span><span className="block text-sm font-semibold text-[#0A1628]">{u?.name ?? ''}</span><span className="block text-xs text-slate-500">{u?.email ?? ''}{u?.billingLegalName ? ` · ${u?.billingLegalName}` : ''}{u?.billingTaxId ? ` · NIPT ${u?.billingTaxId}` : ''}</span></span><span className="text-[10px] font-bold uppercase text-slate-400">{String(u?.role ?? '').replace('_', ' ')}</span></button>) ?? null}{(matches?.length ?? 0) === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No matching customer. Create a new one below.</p> : null}</div>
        <div>{!showNew ? <button type="button" onClick={() => setShowNew(true)} className="btn-secondary"><Plus className="h-4 w-4" /> New customer</button> : <div className="rounded-lg border border-slate-200 p-4"><div className="grid gap-3 sm:grid-cols-2"><label><span className="label">Name *</span><input className="field" value={newCust.name} onChange={(e) => setNewCust((c) => ({ ...c, name: e?.target?.value ?? '' }))} /></label><label><span className="label">Email *</span><input className="field" value={newCust.email} onChange={(e) => setNewCust((c) => ({ ...c, email: e?.target?.value ?? '' }))} /></label><label><span className="label">Account type</span><select className="field" value={newCust.role} onChange={(e) => setNewCust((c) => ({ ...c, role: e?.target?.value ?? 'CUSTOMER' }))}><option value="CUSTOMER">Individual customer</option><option value="BUSINESS_CUSTOMER">Business customer</option></select></label><label><span className="label">Company / trading name</span><input className="field" value={newCust.companyName} onChange={(e) => setNewCust((c) => ({ ...c, companyName: e?.target?.value ?? '' }))} /></label><label><span className="label">Legal name</span><input className="field" value={newCust.billingLegalName} onChange={(e) => setNewCust((c) => ({ ...c, billingLegalName: e?.target?.value ?? '' }))} /></label><label><span className="label">NIPT / Tax ID</span><input className="field" value={newCust.billingTaxId} onChange={(e) => setNewCust((c) => ({ ...c, billingTaxId: e?.target?.value ?? '' }))} /></label><label><span className="label">Contact person</span><input className="field" value={newCust.contactPerson} onChange={(e) => setNewCust((c) => ({ ...c, contactPerson: e?.target?.value ?? '' }))} /></label><label><span className="label">Phone</span><input className="field" value={newCust.phone} onChange={(e) => setNewCust((c) => ({ ...c, phone: e?.target?.value ?? '' }))} /></label></div><div className="mt-3 flex gap-2"><button type="button" disabled={creatingCustomer} onClick={createCustomer} className="btn-primary disabled:opacity-60">{creatingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create &amp; select</button><button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button></div></div>}</div>
      </div>}
    </section>

    <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      <h3 className="flex items-center gap-2 font-bold text-[#0A1628]"><Package className="h-4 w-4 text-green-600" /> Service &amp; request source</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label><span className="label">Service category</span><select className="field" value={serviceCategory} onChange={(e) => setServiceCategory(e?.target?.value ?? 'EXPRESS')}>{CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label><span className="label">Direction</span><select className="field" value={direction} onChange={(e) => setDirection(e?.target?.value ?? 'EXPORT')}><option value="EXPORT">Export from Albania</option><option value="IMPORT">Import to Albania</option></select></label>
        <label><span className="label">Request source</span><select className="field" value={requestSource} onChange={(e) => setRequestSource(e?.target?.value ?? 'WHATSAPP')}>{SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label><span className="label">Preferred pickup date</span><input className="field" type="date" value={pickupDate} onChange={(e) => setPickupDate(e?.target?.value ?? '')} /></label>
      </div>
      {isSea ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">Sea Freight quoting is handled manually — capture the route and cargo and a specialist will follow up.</div> : null}
    </section>

    <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      <h3 className="flex items-center gap-2 font-bold text-[#0A1628]"><MapPin className="h-4 w-4 text-green-600" /> Route &amp; parties</h3>
      <p className="mt-1 text-xs text-slate-500">{isRoad ? 'Road freight needs full loading & delivery detail.' : 'Origin country plus receiver & destination are required to quote.'}</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <PartyEditor title={isRoad ? 'Loading address' : 'Origin / sender'} side="sender" party={sender} onChange={setSender} countries={countries} addresses={addresses} onApply={applyAddress} requireFull={isRoad} customerId={customerId} />
        <PartyEditor title={isRoad ? 'Delivery address' : 'Receiver / destination'} side="receiver" party={receiver} onChange={setReceiver} countries={countries} addresses={addresses} onApply={applyAddress} requireFull={isRoad} requireNameCountry customerId={customerId} />
      </div>
    </section>

    <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      <h3 className="flex items-center gap-2 font-bold text-[#0A1628]"><Boxes className="h-4 w-4 text-green-600" /> Cargo &amp; customs</h3>
      <div className="mt-4 grid gap-5">
        <label className="sm:max-w-xs"><span className="label">Contents type</span><select className="field" value={contentsType} onChange={(e) => setContentsType(e?.target?.value ?? 'PARCEL')}>{CONTENTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <PieceBuilder pieces={pieceRows} onChange={(next) => setPieceRows(Array.isArray(next) && next.length ? next : [{ ...emptyPiece }])} divisor={divisor} restrictions={restrictions} serviceCategory={serviceCategory} carrier="" destCountry={receiver.country} />
        <label><span className="label">Goods description</span><input className="field" value={goodsDescription} onChange={(e) => setGoodsDescription(e?.target?.value ?? '')} placeholder="e.g. spare parts, textile samples..." /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Commercial value (EUR)</span><input className="field" type="number" min="0" step="0.01" value={commercialValue} onChange={(e) => setCommercialValue(e?.target?.value ?? '')} /></label><label><span className="label">Incoterms</span><select className="field" value={incoterms} onChange={(e) => setIncoterms(e?.target?.value ?? 'DAP')}>{INCOTERMS.map((v) => <option key={v}>{v}</option>)}</select></label></div>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-3 text-sm font-semibold text-[#0A1628] shadow-sm"><input type="checkbox" className="h-4 w-4 accent-green-600" checked={isCommercial} onChange={(e) => setIsCommercial(Boolean(e?.target?.checked))} /> This is a commercial (dutiable) shipment</label>
        <label className="flex cursor-pointer items-center justify-between rounded-lg bg-amber-50 p-4"><span className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-600" /><span><span className="block text-sm font-bold text-amber-900">Dangerous goods</span><span className="block text-xs text-amber-700">Requires additional documentation and review</span></span></span><input type="checkbox" className="h-5 w-5 accent-green-600" checked={dangerousGoods} onChange={(e) => setDangerousGoods(Boolean(e?.target?.checked))} /></label>
        {dangerousGoods ? <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">UN Number</span><input className="field" placeholder="e.g. UN3481" value={unNumber} onChange={(e) => setUnNumber(e?.target?.value ?? '')} /></label><label><span className="label">Dangerous Goods class</span><input className="field" placeholder="e.g. Class 9" value={dangerousGoodsClass} onChange={(e) => setDangerousGoodsClass(e?.target?.value ?? '')} /></label></div> : null}
        <label><span className="label">Special instructions</span><textarea className="field min-h-20 py-3" value={specialInstructions} onChange={(e) => setSpecialInstructions(e?.target?.value ?? '')} placeholder="Pickup access, handling or customs notes..." /></label>
        <label><span className="label">Internal notes <span className="font-normal text-slate-400">(never shown to the customer)</span></span><textarea className="field min-h-20 py-3" value={internalNotes} onChange={(e) => setInternalNotes(e?.target?.value ?? '')} placeholder="How the request arrived, who requested it, reference numbers..." /></label>
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="text-sm text-slate-500">{shipment?.totals?.totalPieces ?? 0} pc · {shipment?.totals?.actualWeight ?? 0} kg actual · {shipment?.totals?.chargeableWeight ?? 0} kg chargeable</div>
      <div className="flex gap-3"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button type="button" disabled={submitting || !canSubmit()} onClick={submit} className="btn-primary disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create quote request</button></div>
    </div>
  </div>
}

function PartyEditor({ title, side, party, onChange, countries, addresses, onApply, requireFull, requireNameCountry, customerId }: { title: string; side: 'sender' | 'receiver'; party: Party; onChange: (p: Party) => void; countries: LocOpt[]; addresses: Row[]; onApply: (side: 'sender' | 'receiver', a: Row) => void; requireFull?: boolean; requireNameCountry?: boolean; customerId: string }) {
  const listId = `country-${side}`
  const set = (k: keyof Party, v: string) => onChange({ ...party, [k]: v })
  const relevant = (addresses ?? []).filter((a: Row) => !a?.kind || a?.kind === (side === 'sender' ? 'SENDER' : 'RECEIVER') || a?.kind === 'BILLING')
  return <div className="rounded-xl bg-slate-50 p-5">
    <h4 className="mb-3 flex items-center gap-2 font-bold text-[#0A1628]"><UserRound className="h-4 w-4 text-green-600" /> {title}</h4>
    {customerId && (relevant?.length ?? 0) > 0 ? <div className="mb-3"><span className="label">Use a saved address</span><div className="flex flex-wrap gap-2">{relevant.map((a: Row) => <button type="button" key={a?.id ?? ''} onClick={() => onApply(side, a)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-green-300 hover:text-green-700">{a?.label || a?.name || a?.company || 'Address'}{a?.city ? ` · ${a?.city}` : ''}</button>)}</div></div> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={requireFull || requireNameCountry ? '' : ''}><span className="label">Contact name{requireFull || requireNameCountry ? ' *' : ''}</span><input className="field" value={party?.name ?? ''} onChange={(e) => set('name', e?.target?.value ?? '')} /></label>
      <label><span className="label">Company</span><input className="field" value={party?.company ?? ''} onChange={(e) => set('company', e?.target?.value ?? '')} /></label>
      <label className="sm:col-span-2"><span className="label">Street address{requireFull ? ' *' : ''}</span><input className="field" value={party?.address ?? ''} onChange={(e) => set('address', e?.target?.value ?? '')} /></label>
      <label><span className="label">Country *</span><input className="field" list={listId} value={party?.country ?? ''} onChange={(e) => set('country', e?.target?.value ?? '')} autoComplete="off" placeholder="Type to search..." /><datalist id={listId}>{countries?.map?.((c) => <option key={c?.id ?? ''} value={c?.name ?? ''} />) ?? null}</datalist></label>
      <label><span className="label">City{requireFull || requireNameCountry ? ' *' : ''}</span><input className="field" value={party?.city ?? ''} onChange={(e) => set('city', e?.target?.value ?? '')} /></label>
      <label><span className="label">Postal code</span><input className="field" value={party?.postalCode ?? ''} onChange={(e) => set('postalCode', e?.target?.value ?? '')} /></label>
      <label><span className="label">Phone</span><input className="field" value={party?.phone ?? ''} onChange={(e) => set('phone', e?.target?.value ?? '')} /></label>
      <label className="sm:col-span-2"><span className="label">Email</span><input className="field" value={party?.email ?? ''} onChange={(e) => set('email', e?.target?.value ?? '')} /></label>
    </div>
  </div>
}
