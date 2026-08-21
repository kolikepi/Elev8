'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, MapPin, PackageCheck, Save, Truck, User } from 'lucide-react'
import { toast } from 'sonner'

type Row = any

const PACKAGE_TYPES = ['BOX', 'PALLET', 'CRATE', 'ENVELOPE', 'TUBE', 'BAG', 'DRUM', 'OTHER']
const CONTENTS_TYPES = ['DOCUMENTS', 'PARCEL', 'MULTIPLE_PARCELS', 'BOXES', 'PALLET']
const INCOTERMS = ['DAP', 'DDP', 'EXW', 'FCA', 'CPT', 'CIP', 'DPU']
const CURRENCIES = ['EUR', 'USD', 'GBP', 'ALL']

function party(source: Row): Row {
  return { name: source?.name ?? '', company: source?.company ?? '', address: source?.address ?? '', city: source?.city ?? '', country: source?.country ?? '', postalCode: source?.postalCode ?? '', phone: source?.phone ?? '', email: source?.email ?? '' }
}

function piecesFrom(quote: Row): Row[] {
  const saved = quote?.bookingJson?.pieces
  if (Array.isArray(saved) && saved.length) return saved.map((p: Row) => ({ packageType: p?.packageType ?? 'BOX', quantity: Number(p?.quantity ?? 1) || 1, length: Number(p?.length ?? 0) || 0, width: Number(p?.width ?? 0) || 0, height: Number(p?.height ?? 0) || 0, weight: Number(p?.weight ?? 0) || 0, description: p?.description ?? '' }))
  const sp = quote?.shipmentPieces
  if (Array.isArray(sp) && sp.length) return sp.map((p: Row) => ({ packageType: p?.packageType ?? 'BOX', quantity: Number(p?.quantity ?? 1) || 1, length: Number(p?.length ?? 0) || 0, width: Number(p?.width ?? 0) || 0, height: Number(p?.height ?? 0) || 0, weight: Number(p?.weight ?? 0) || 0, description: p?.description ?? '' }))
  return [{ packageType: 'BOX', quantity: Number(quote?.pieces ?? 1) || 1, length: 0, width: 0, height: 0, weight: Number(quote?.weightKg ?? 0) || 0, description: '' }]
}

export function BookingDetailsForm({ quote, base }: { quote: Row; base: string }) {
  const router = useRouter()
  const isRoad = String(quote?.serviceCategory ?? '') === 'ROAD_FREIGHT' || String(quote?.serviceCategory ?? '') === 'SEA_FREIGHT'
  const saved = quote?.bookingJson ?? {}

  const [sender, setSender] = useState<Row>(() => party({ ...(quote?.senderJson ?? {}), ...(saved?.sender ?? {}) }))
  const [receiver, setReceiver] = useState<Row>(() => party({ ...(quote?.receiverJson ?? {}), ...(saved?.receiver ?? {}) }))
  const [pieces, setPieces] = useState<Row[]>(() => piecesFrom(quote))
  const [shipment, setShipment] = useState<Row>(() => ({
    contentsType: saved?.contentsType ?? quote?.contentsType ?? 'PARCEL',
    goodsDescription: saved?.goodsDescription ?? quote?.goodsDescription ?? '',
    isCommercial: saved?.isCommercial ?? Boolean(quote?.isCommercial),
    commercialValue: saved?.commercialValue ?? (quote?.commercialValue != null ? Number(quote?.commercialValue) : ''),
    currency: saved?.currency ?? quote?.currency ?? 'EUR',
    incoterms: saved?.incoterms ?? quote?.incoterms ?? 'DAP',
    dangerousGoods: saved?.dangerousGoods ?? Boolean(quote?.dangerousGoods),
    unNumber: saved?.unNumber ?? quote?.unNumber ?? '',
    dangerousGoodsClass: saved?.dangerousGoodsClass ?? quote?.dangerousGoodsClass ?? '',
    customerReference: saved?.customerReference ?? '',
    specialInstructions: saved?.specialInstructions ?? quote?.specialInstructions ?? '',
  }))
  const [road, setRoad] = useState<Row>(() => ({
    loadingContactName: saved?.road?.loadingContactName ?? '', loadingContactPhone: saved?.road?.loadingContactPhone ?? '', loadingHours: saved?.road?.loadingHours ?? '', loadingDate: saved?.road?.loadingDate ?? '',
    unloadingContactName: saved?.road?.unloadingContactName ?? '', unloadingContactPhone: saved?.road?.unloadingContactPhone ?? '', unloadingHours: saved?.road?.unloadingHours ?? '',
    palletCount: saved?.road?.palletCount ?? '', stackable: saved?.road?.stackable ?? true, forkliftAtPickup: saved?.road?.forkliftAtPickup ?? false, forkliftAtDelivery: saved?.road?.forkliftAtDelivery ?? false, tailLiftRequired: saved?.road?.tailLiftRequired ?? false,
    requirements: saved?.road?.requirements ?? '', supplierRef: saved?.road?.supplierRef ?? '',
  }))
  const [busy, setBusy] = useState<'save' | 'confirm' | null>(null)

  const documentsNote = useMemo(() => {
    const notes: string[] = []
    if (shipment?.isCommercial) notes.push('A commercial invoice and packing list will be required for customs clearance.')
    if (shipment?.dangerousGoods) notes.push('Dangerous goods documentation (MSDS / DG declaration) will be required before booking.')
    return notes
  }, [shipment?.isCommercial, shipment?.dangerousGoods])

  function updatePiece(index: number, patch: Row) { setPieces((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p))) }
  function addPiece() { setPieces((prev) => [...prev, { packageType: 'BOX', quantity: 1, length: 0, width: 0, height: 0, weight: 0, description: '' }]) }
  function removePiece(index: number) { setPieces((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)) }

  function buildBooking(): Row {
    return {
      sender, receiver,
      pieces: pieces.map((p) => ({ packageType: String(p?.packageType ?? 'BOX'), quantity: Math.max(1, Number(p?.quantity ?? 1) || 1), length: Number(p?.length ?? 0) || 0, width: Number(p?.width ?? 0) || 0, height: Number(p?.height ?? 0) || 0, weight: Number(p?.weight ?? 0) || 0, description: String(p?.description ?? '') })),
      contentsType: shipment?.contentsType, goodsDescription: shipment?.goodsDescription,
      isCommercial: Boolean(shipment?.isCommercial), commercialValue: shipment?.commercialValue === '' ? 0 : Number(shipment?.commercialValue ?? 0),
      currency: shipment?.currency, incoterms: shipment?.incoterms,
      dangerousGoods: Boolean(shipment?.dangerousGoods), unNumber: shipment?.unNumber, dangerousGoodsClass: shipment?.dangerousGoodsClass,
      customerReference: shipment?.customerReference, specialInstructions: shipment?.specialInstructions,
      road: isRoad ? road : undefined,
    }
  }

  async function submit(action: 'save' | 'confirm') {
    if (busy) return
    if (action === 'confirm') {
      if (!receiver?.name || !receiver?.country) { toast?.error?.('Delivery contact name and country are required.'); return }
      if (!sender?.name || !sender?.country) { toast?.error?.('Pickup contact name and country are required.'); return }
    }
    setBusy(action)
    try {
      const response = await fetch(`/api/quotes/${quote?.id ?? ''}/booking`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking: buildBooking(), action }) })
      const data = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(data?.error ?? 'Unable to save booking details.')
      if (action === 'save') { toast?.success?.('Draft saved. You can finish this later.') }
      else { toast?.success?.('Booking details submitted. Our team will take it from here.'); router.push(`${base}/quotes/${quote?.id ?? ''}`); router.refresh() }
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Unable to save booking details.' : 'Unable to save booking details.') }
    finally { setBusy(null) }
  }

  return <div className="grid gap-6">
    <PartySection title="Pickup / sender" icon={MapPin} data={sender} setData={setSender} requireContact />
    <PartySection title="Delivery / receiver" icon={User} data={receiver} setData={setReceiver} requireContact />

    <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-green-600" /><h2 className="font-bold text-[#0A1628]">Confirm packages &amp; goods</h2></div>
      <p className="mt-1 text-xs text-slate-500">These were captured on your quote. Adjust them only if the actual shipment differs — changes that affect the price will be reviewed before booking.</p>
      <div className="mt-4 grid gap-4">{pieces.map((p, i) => <div key={i} className="rounded-lg border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#0A1628]">Item {i + 1}</p>{pieces.length > 1 ? <button type="button" onClick={() => removePiece(i)} className="text-xs font-semibold text-red-600">Remove</button> : null}</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label><span className="label">Type</span><select className="field" value={p?.packageType ?? 'BOX'} onChange={(e) => updatePiece(i, { packageType: e?.target?.value })}>{PACKAGE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}</select></label><label><span className="label">Quantity</span><input type="number" min="1" className="field" value={p?.quantity ?? 1} onChange={(e) => updatePiece(i, { quantity: e?.target?.value })} /></label><label><span className="label">Weight (kg)</span><input type="number" min="0" step="0.01" className="field" value={p?.weight ?? 0} onChange={(e) => updatePiece(i, { weight: e?.target?.value })} /></label><label><span className="label">Length (cm)</span><input type="number" min="0" step="0.1" className="field" value={p?.length ?? 0} onChange={(e) => updatePiece(i, { length: e?.target?.value })} /></label><label><span className="label">Width (cm)</span><input type="number" min="0" step="0.1" className="field" value={p?.width ?? 0} onChange={(e) => updatePiece(i, { width: e?.target?.value })} /></label><label><span className="label">Height (cm)</span><input type="number" min="0" step="0.1" className="field" value={p?.height ?? 0} onChange={(e) => updatePiece(i, { height: e?.target?.value })} /></label><label className="sm:col-span-2 lg:col-span-3"><span className="label">Item description</span><input className="field" value={p?.description ?? ''} onChange={(e) => updatePiece(i, { description: e?.target?.value })} placeholder="e.g. spare parts" /></label></div></div>)}</div>
      <button type="button" onClick={addPiece} className="btn-secondary mt-4">Add another item</button>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label><span className="label">Contents type</span><select className="field" value={shipment?.contentsType ?? 'PARCEL'} onChange={(e) => setShipment((s: Row) => ({ ...s, contentsType: e?.target?.value }))}>{CONTENTS_TYPES.map((t) => <option key={t} value={t}>{t.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}</option>)}</select></label>
        <label><span className="label">Incoterms</span><select className="field" value={shipment?.incoterms ?? 'DAP'} onChange={(e) => setShipment((s: Row) => ({ ...s, incoterms: e?.target?.value }))}>{INCOTERMS.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <label><span className="label">Your reference</span><input className="field" value={shipment?.customerReference ?? ''} onChange={(e) => setShipment((s: Row) => ({ ...s, customerReference: e?.target?.value }))} placeholder="Optional order / PO number" /></label>
        <label className="sm:col-span-2 lg:col-span-3"><span className="label">Goods description</span><input className="field" value={shipment?.goodsDescription ?? ''} onChange={(e) => setShipment((s: Row) => ({ ...s, goodsDescription: e?.target?.value }))} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(shipment?.isCommercial)} onChange={(e) => setShipment((s: Row) => ({ ...s, isCommercial: e?.target?.checked }))} className="h-4 w-4 accent-green-600" /> Commercial shipment</label>
        {shipment?.isCommercial ? <><label><span className="label">Declared value</span><input type="number" min="0" step="0.01" className="field" value={shipment?.commercialValue ?? ''} onChange={(e) => setShipment((s: Row) => ({ ...s, commercialValue: e?.target?.value }))} /></label><label><span className="label">Currency</span><select className="field" value={shipment?.currency ?? 'EUR'} onChange={(e) => setShipment((s: Row) => ({ ...s, currency: e?.target?.value }))}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label></> : null}
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-4"><label className="flex items-center gap-2 text-sm font-semibold text-[#0A1628]"><input type="checkbox" checked={Boolean(shipment?.dangerousGoods)} onChange={(e) => setShipment((s: Row) => ({ ...s, dangerousGoods: e?.target?.checked }))} className="h-4 w-4 accent-green-600" /> This shipment contains dangerous goods</label>{shipment?.dangerousGoods ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="label">UN number</span><input className="field" value={shipment?.unNumber ?? ''} onChange={(e) => setShipment((s: Row) => ({ ...s, unNumber: e?.target?.value }))} /></label><label><span className="label">DG class</span><input className="field" value={shipment?.dangerousGoodsClass ?? ''} onChange={(e) => setShipment((s: Row) => ({ ...s, dangerousGoodsClass: e?.target?.value }))} /></label></div> : null}</div>
    </section>

    {isRoad ? <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-green-600" /><h2 className="font-bold text-[#0A1628]">Road freight logistics</h2></div>
      <p className="mt-1 text-xs text-slate-500">Loading and unloading details help us schedule the vehicle correctly.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label><span className="label">Loading contact</span><input className="field" value={road?.loadingContactName ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, loadingContactName: e?.target?.value }))} /></label>
        <label><span className="label">Loading phone</span><input className="field" value={road?.loadingContactPhone ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, loadingContactPhone: e?.target?.value }))} /></label>
        <label><span className="label">Loading hours</span><input className="field" value={road?.loadingHours ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, loadingHours: e?.target?.value }))} placeholder="e.g. 09:00–17:00" /></label>
        <label><span className="label">Preferred loading date</span><input type="date" className="field" value={road?.loadingDate ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, loadingDate: e?.target?.value }))} /></label>
        <label><span className="label">Unloading contact</span><input className="field" value={road?.unloadingContactName ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, unloadingContactName: e?.target?.value }))} /></label>
        <label><span className="label">Unloading phone</span><input className="field" value={road?.unloadingContactPhone ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, unloadingContactPhone: e?.target?.value }))} /></label>
        <label><span className="label">Unloading hours</span><input className="field" value={road?.unloadingHours ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, unloadingHours: e?.target?.value }))} /></label>
        <label><span className="label">Pallet count</span><input type="number" min="0" className="field" value={road?.palletCount ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, palletCount: e?.target?.value }))} /></label>
        <label><span className="label">Supplier reference</span><input className="field" value={road?.supplierRef ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, supplierRef: e?.target?.value }))} /></label>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(road?.stackable)} onChange={(e) => setRoad((r: Row) => ({ ...r, stackable: e?.target?.checked }))} className="h-4 w-4 accent-green-600" /> Goods are stackable</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(road?.forkliftAtPickup)} onChange={(e) => setRoad((r: Row) => ({ ...r, forkliftAtPickup: e?.target?.checked }))} className="h-4 w-4 accent-green-600" /> Forklift available at pickup</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(road?.forkliftAtDelivery)} onChange={(e) => setRoad((r: Row) => ({ ...r, forkliftAtDelivery: e?.target?.checked }))} className="h-4 w-4 accent-green-600" /> Forklift available at delivery</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(road?.tailLiftRequired)} onChange={(e) => setRoad((r: Row) => ({ ...r, tailLiftRequired: e?.target?.checked }))} className="h-4 w-4 accent-green-600" /> Tail-lift required</label>
      </div>
      <label className="mt-4 block"><span className="label">Special loading requirements</span><textarea className="field min-h-20 py-3" value={road?.requirements ?? ''} onChange={(e) => setRoad((r: Row) => ({ ...r, requirements: e?.target?.value }))} /></label>
    </section> : null}

    <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      <h2 className="font-bold text-[#0A1628]">Additional instructions</h2>
      <label className="mt-3 block"><span className="label">Notes for our operations team</span><textarea className="field min-h-20 py-3" value={shipment?.specialInstructions ?? ''} onChange={(e) => setShipment((s: Row) => ({ ...s, specialInstructions: e?.target?.value }))} /></label>
      {documentsNote.length ? <div className="mt-4 rounded-lg bg-amber-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> Documents needed</div><ul className="mt-2 list-disc pl-5 text-xs text-amber-800">{documentsNote.map((n, i) => <li key={i}>{n}</li>)}</ul></div> : null}
    </section>

    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`${base}/quotes/${quote?.id ?? ''}`} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back to quote</Link>
      <div className="flex gap-3">
        <button type="button" disabled={busy !== null} onClick={() => submit('save')} className="btn-secondary disabled:opacity-60">{busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft</button>
        <button type="button" disabled={busy !== null} onClick={() => submit('confirm')} className="btn-primary disabled:opacity-60">{busy === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Submit booking details</button>
      </div>
    </div>
  </div>
}

function PartySection({ title, icon: Icon, data, setData, requireContact }: { title: string; icon: any; data: Row; setData: (fn: (prev: Row) => Row) => void; requireContact?: boolean }) {
  const fields: [string, string, boolean][] = [['name', 'Contact name', Boolean(requireContact)], ['company', 'Company', false], ['address', 'Address', false], ['city', 'City', false], ['postalCode', 'Postal code', false], ['country', 'Country', Boolean(requireContact)], ['phone', 'Phone', false], ['email', 'Email', false]]
  return <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-green-600" /><h2 className="font-bold text-[#0A1628]">{title}</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([key, label, required]) => <label key={key}><span className="label">{label}{required ? ' *' : ''}</span><input className="field" value={data?.[key] ?? ''} onChange={(e) => setData((prev: Row) => ({ ...prev, [key]: e?.target?.value }))} /></label>)}</div></section>
}
