'use client'

// Admin "Additional offers" builder — Unified Multi Quote.
//
// Every additional offer now uses the SAME full pricing calculator as the primary offer (carrier cost, all
// surcharges/fees, fuel %, markup %, discount %, VAT %, transit, valid-until, customer notes) and computes
// its selling price + margin through the SINGLE shared engine in lib/offer-pricing.ts — the exact same math
// as the primary AdminQuotation panel (lib/quotation-build.ts). There is no second pricing formula.
//
// The customer still only ever sees SERVICE LABEL, TRANSIT TIME and (VAT-inclusive) SELLING PRICE. The
// carrier mapping, carrier cost, fees, markup/discount and margin remain strictly internal.
//
// Cards are collapsible and support Add offer, Start blank, Duplicate and Delete. Fully additive: with no
// extra offers the quote behaves exactly as before (single primary offer).

import { useEffect, useMemo, useState } from 'react'
import { Layers, Plus, Trash2, Save, Loader2, Lock, Copy, ChevronDown, ChevronRight, FilePlus2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { computeOfferPricing } from '@/lib/offer-pricing'

type Row = any
const SYM: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', ALL: 'L' }
const money = (v: unknown) => (Number(v ?? 0) || 0).toFixed(2)
const pct = (v: unknown) => (Number(v ?? 0) || 0).toFixed(1)

// A fresh blank offer with every calculator field defaulted (markup 15 / VAT 20 mirror the primary panel).
function blankOffer(): Row {
  return {
    customerServiceId: '', serviceName: '', transitTime: '', validUntil: '', notes: '',
    carrierName: '', carrierService: '', carrierServiceId: '', carrierCost: '',
    pickupFee: '', deliveryFee: '', remoteAreaFee: '', insuranceFee: '', dgFee: '', documentationFee: '', customsFee: '', otherCharges: '',
    fuelSurcharge: '', markupPct: 15, discountPct: '', vatPct: 20,
  }
}

export function QuoteOptionsBuilder({ quoteId, currency = 'EUR', primaryLabel, primaryTransit, primaryPrice }: { quoteId: string; currency?: string; primaryLabel?: string; primaryTransit?: string; primaryPrice?: unknown }) {
  const [rows, setRows] = useState<Row[]>([])
  const [services, setServices] = useState<Row[]>([])
  const [customerServices, setCustomerServices] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const sym = SYM[String(currency ?? 'EUR')] ?? ''

  useEffect(() => {
    void fetch('/api/carrier-services').then((r) => r?.json?.().catch?.(() => ({}))).then((d) => { setServices(d?.services ?? []); setCustomerServices(d?.customerServices ?? []) }).catch((e: unknown) => console.error(e))
    void fetch(`/api/admin/quotes/${quoteId}/options`).then((r) => r?.json?.().catch?.(() => ({}))).then((d) => {
      const list = (d?.options ?? []).map((o: Row) => ({ ...o, validUntil: String(o?.validUntil ?? '').slice(0, 10) }))
      setRows(list); setLoaded(true)
    }).catch((e: unknown) => { console.error(e); setLoaded(true) })
  }, [quoteId])

  const carriers = useMemo(() => Array.from(new Set((services ?? []).map((s: Row) => String(s?.carrier ?? '')).filter(Boolean))), [services])

  function addRow(seed?: Row) { setRows((r) => { const next = [...r, seed ? { ...seed } : blankOffer()]; setOpen((o) => ({ ...o, [next.length - 1]: true })); return next }) }
  function duplicate(i: number) { setRows((r) => { const src = r[i] ?? {}; const copy = { ...src }; delete copy.id; delete copy.isSelected; copy.serviceName = `${String(src?.serviceName ?? '').trim()}${src?.serviceName ? ' (copy)' : ''}`; const next = [...r.slice(0, i + 1), copy, ...r.slice(i + 1)]; setOpen((o) => ({ ...o, [i + 1]: true })); return next }) }
  function removeRow(i: number) { setRows((r) => r.filter((_, idx) => idx !== i)) }
  function update(i: number, patch: Row) { setRows((r) => r.map((row, idx) => idx === i ? { ...row, ...patch } : row)) }
  function toggle(i: number) { setOpen((o) => ({ ...o, [i]: !o[i] })) }
  function applyCustomerService(i: number, id: string) {
    const cs = customerServices?.find?.((c: Row) => c?.id === id)
    update(i, { customerServiceId: id, serviceName: cs?.name ?? '', transitTime: cs?.transitTime ?? '' })
  }

  async function save() {
    for (const [i, r] of rows.entries()) {
      if (!String(r?.serviceName ?? '').trim()) { toast?.error?.(`Offer ${i + 2}: choose a customer service / name.`); return }
      const p = computeOfferPricing(r)
      if (!(p.final > 0)) { toast?.error?.(`Offer ${i + 2}: enter pricing that yields a selling price above zero.`); return }
    }
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/options`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ options: rows.map((r) => ({ ...r, currency })) }) })
      const data = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(data?.error ?? 'Unable to save offers.')
      setRows((data?.options ?? []).map((o: Row) => ({ ...o, validUntil: String(o?.validUntil ?? '').slice(0, 10) })))
      toast?.success?.(rows.length ? 'Additional offers saved. They will be shown to the customer alongside the primary offer.' : 'Additional offers cleared.')
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Unable to save offers.' : 'Unable to save offers.') } finally { setBusy(false) }
  }

  return (
    <div className="mt-7 rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-green-600" /><h3 className="text-sm font-bold text-[#0A1628]">Offers <span className="font-normal text-slate-400">(the customer chooses one)</span></h3></div>
      <p className="mt-1 text-[11px] text-slate-500">Every offer uses the same pricing calculator. Offer 1 is the primary offer from the pricing panel; add alternative services below (e.g. a faster Express and a cheaper Road / Groupage option). The customer sees only <strong>service, transit time and price</strong>. Carrier, cost, fees and margin stay internal.</p>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs"><span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">Offer 1 · primary</span><span className="font-semibold text-[#0A1628]">{primaryLabel || '—'}</span><span className="text-slate-400">·</span><span>{primaryTransit || '—'}</span><span className="ml-auto font-mono font-bold text-[#0A1628]">{sym}{money(primaryPrice)}</span></div>
      {!loaded ? <div className="mt-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-green-600" /></div> : (
        <div className="mt-4 grid gap-4">
          {rows.map((r: Row, i: number) => {
            const p = computeOfferPricing(r)
            const isOpen = open[i] ?? false
            return (
              <div key={i} className="rounded-lg border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-2 p-3">
                  <button type="button" onClick={() => toggle(i)} className="flex flex-1 items-center gap-2 text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">Offer {i + 2}</span>
                    <span className="truncate text-sm font-semibold text-[#0A1628]">{String(r?.serviceName ?? '').trim() || 'New offer'}</span>
                    {r?.transitTime ? <span className="hidden text-xs text-slate-400 sm:inline">· {r?.transitTime}</span> : null}
                    {r?.isSelected ? <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">customer selected</span> : null}
                  </button>
                  <span className="font-mono text-sm font-bold text-[#0A1628]">{sym}{money(p.final)}</span>
                  <button type="button" title="Duplicate offer" onClick={() => duplicate(i)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><Copy className="h-4 w-4" /></button>
                  <button type="button" title="Delete offer" onClick={() => removeRow(i)} className="rounded p-1 text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
                {isOpen ? (
                  <div className="border-t border-slate-100 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label><span className="label">Customer service</span><select className="field" value={r?.customerServiceId ?? ''} onChange={(e) => applyCustomerService(i, e?.target?.value ?? '')}><option value="">Custom / choose...</option>{customerServices?.map?.((c: Row) => <option key={c?.id ?? ''} value={c?.id ?? ''}>{c?.name ?? ''}</option>) ?? null}</select></label>
                      <label><span className="label">Service label <span className="font-normal text-slate-400">(shown to customer)</span></span><input className="field" value={r?.serviceName ?? ''} onChange={(e) => update(i, { serviceName: e?.target?.value ?? '' })} placeholder="e.g. Express / Road Freight / Groupage" /></label>
                      <label><span className="label">Transit time <span className="font-normal text-slate-400">(shown to customer)</span></span><input className="field" value={r?.transitTime ?? ''} onChange={(e) => update(i, { transitTime: e?.target?.value ?? '' })} placeholder="e.g. 1–3 days" /></label>
                      <label><span className="label">Valid until</span><input type="date" className="field" value={r?.validUntil ?? ''} onChange={(e) => update(i, { validUntil: e?.target?.value ?? '' })} /></label>
                    </div>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Lock className="h-3 w-3" /> Internal only — never shown to the customer</div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <label><span className="label">Internal carrier</span><select className="field" value={r?.carrierName ?? ''} onChange={(e) => update(i, { carrierName: e?.target?.value ?? '', carrierService: '', carrierServiceId: '' })}><option value="">— optional —</option>{carriers.map((c: string) => <option key={c} value={c}>{c}</option>)}</select></label>
                        <label><span className="label">Internal service</span><select className="field" value={r?.carrierServiceId ?? ''} onChange={(e) => { const s = (services ?? []).find((x: Row) => x?.id === (e?.target?.value ?? '')); update(i, { carrierServiceId: e?.target?.value ?? '', carrierService: s?.name ?? '', transitTime: r?.transitTime || s?.transitDays || '' }) }}><option value="">— optional —</option>{(services ?? []).filter((s: Row) => !r?.carrierName || String(s?.carrier ?? '') === String(r?.carrierName)).map((s: Row) => <option key={s?.id ?? ''} value={s?.id ?? ''}>{s?.name ?? ''}</option>)}</select></label>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <NumField label={`Carrier cost ${sym}`} value={r?.carrierCost} onChange={(v) => update(i, { carrierCost: v })} />
                        <NumField label={`Pickup fee ${sym}`} value={r?.pickupFee} onChange={(v) => update(i, { pickupFee: v })} />
                        <NumField label={`Delivery fee ${sym}`} value={r?.deliveryFee} onChange={(v) => update(i, { deliveryFee: v })} />
                        <NumField label={`Remote area ${sym}`} value={r?.remoteAreaFee} onChange={(v) => update(i, { remoteAreaFee: v })} />
                        <NumField label={`Insurance ${sym}`} value={r?.insuranceFee} onChange={(v) => update(i, { insuranceFee: v })} />
                        <NumField label={`DG fee ${sym}`} value={r?.dgFee} onChange={(v) => update(i, { dgFee: v })} />
                        <NumField label={`Documentation ${sym}`} value={r?.documentationFee} onChange={(v) => update(i, { documentationFee: v })} />
                        <NumField label={`Customs ${sym}`} value={r?.customsFee} onChange={(v) => update(i, { customsFee: v })} />
                        <NumField label={`Other charges ${sym}`} value={r?.otherCharges} onChange={(v) => update(i, { otherCharges: v })} />
                        <NumField label="Fuel surcharge %" value={r?.fuelSurcharge} onChange={(v) => update(i, { fuelSurcharge: v })} />
                        <NumField label="Markup %" value={r?.markupPct} onChange={(v) => update(i, { markupPct: v })} />
                        <NumField label="Discount %" value={r?.discountPct} onChange={(v) => update(i, { discountPct: v })} />
                        <NumField label="VAT %" value={r?.vatPct} onChange={(v) => update(i, { vatPct: v })} />
                      </div>
                    </div>
                    <label className="mt-3 block"><span className="label">Customer notes <span className="font-normal text-slate-400">(optional — shown to customer)</span></span><textarea className="field min-h-[60px]" value={r?.notes ?? ''} onChange={(e) => update(i, { notes: e?.target?.value ?? '' })} placeholder="Anything the customer should know about this offer" /></label>
                    <div className="mt-3 grid gap-2 rounded-lg bg-[#0A1628] p-3 text-xs text-white sm:grid-cols-3">
                      <div><p className="text-slate-300">Selling price (incl. VAT)</p><p className="font-mono text-lg font-bold text-green-400">{sym}{money(p.final)}</p></div>
                      <div><p className="text-slate-300">Margin {sym}</p><p className={`font-mono text-lg font-bold ${p.marginAmount < 0 ? 'text-rose-400' : 'text-green-400'}`}>{sym}{money(p.marginAmount)}</p></div>
                      <div><p className="text-slate-300">Margin %</p><p className={`font-mono text-lg font-bold ${p.marginAmount < 0 ? 'text-rose-400' : 'text-green-400'}`}>{pct(p.marginPct)}%</p></div>
                      <div className="sm:col-span-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/10 pt-2 text-[11px] text-slate-300 sm:grid-cols-4">
                        <span>Base {sym}{money(p.base)}</span><span>Fuel {sym}{money(p.fuelAmount)}</span><span>Markup {sym}{money(p.markupAmount)}</span><span>Discount −{sym}{money(p.discountAmount)}</span><span>Subtotal {sym}{money(p.subtotal)}</span><span>VAT {sym}{money(p.vatAmount)}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => addRow()} className="btn-secondary"><Plus className="h-4 w-4" /> Add offer</button>
            <button type="button" onClick={() => addRow(blankOffer())} className="btn-secondary"><FilePlus2 className="h-4 w-4" /> Start blank</button>
            {rows.length ? <button type="button" onClick={() => duplicate(rows.length - 1)} className="btn-secondary"><Copy className="h-4 w-4" /> Duplicate last</button> : null}
            <button type="button" disabled={busy} onClick={save} className="btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save offers</button>
            {rows.length ? <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Sparkles className="h-3 w-3 text-green-600" /> Customer will see {rows.length + 1} offers to choose from.</span> : <span className="text-[11px] text-slate-500">No extra offers — the customer sees only the primary offer.</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// Small numeric input used across the calculator grid.
function NumField({ label, value, onChange }: { label: string; value: unknown; onChange: (v: string) => void }) {
  return (
    <label><span className="label">{label}</span><input type="number" min="0" step="0.01" className="field" value={(value as any) ?? ''} onChange={(e) => onChange(e?.target?.value ?? '')} placeholder="0" /></label>
  )
}
