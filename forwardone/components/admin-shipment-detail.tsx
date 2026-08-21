'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Ban, CheckCircle2, ClipboardEdit, CircleDollarSign, Download, Eye, EyeOff, FileText, Loader2, PackageSearch, PlusCircle, RotateCcw, Save, Send, Trash2, Truck, Upload } from 'lucide-react'
import {
  allowedTransitions,
  adminStatusLabel,
  adminCustomsLabel,
  CUSTOMS_SUB_STATUSES,
  amendmentModeFor,
  isDeliveredLocked,
  type ShipmentStatus,
} from '@/lib/shipment-lifecycle'
import { DOCUMENT_CATEGORIES, documentCategoryLabel } from '@/lib/documents'
import { InvoiceActions } from '@/components/invoice-actions'
import { invoiceEligibility } from '@/lib/invoice-eligibility'

type Row = any

const fmt = (x: unknown) => String(x ?? '').split('_').join(' ').replace(/\b\w/g, (c) => c.toUpperCase())
const money = (v: unknown, ccy = 'EUR') => { const n = Number(v ?? 0); return `${ccy} ${(Number.isFinite(n) ? n : 0).toFixed(2)}` }
const dt = (v: unknown) => (v ? new Date(String(v)).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) : '—')

function Badge({ value }: { value: string }) {
  const v = String(value ?? '')
  const c = ['DELIVERED', 'BOOKED', 'FINANCIALLY_CLOSED', 'CUSTOMS_CLEARED', 'APPLIED', 'APPROVED'].includes(v)
    ? 'bg-green-50 text-green-700'
    : ['EXCEPTION', 'CANCELLED', 'CUSTOMS_HOLD', 'LOST', 'DAMAGED', 'REJECTED'].includes(v)
      ? 'bg-red-50 text-red-700'
      : ['PENDING_REVIEW', 'PENDING_APPROVAL', 'PENDING', 'ON_HOLD', 'RETURN_IN_PROGRESS'].includes(v)
        ? 'bg-amber-50 text-amber-700'
        : 'bg-blue-50 text-blue-700'
  return <span className={`status-badge whitespace-nowrap ${c}`}>{fmt(v)}</span>
}

function Cell({ label, quoted, booked, actual }: { label: string; quoted: any; booked: any; actual: any }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3 text-sm font-medium text-slate-600">{label}</td>
      <td className="py-2 pr-3 text-sm text-slate-800">{quoted ?? '—'}</td>
      <td className="py-2 pr-3 text-sm text-slate-800">{booked ?? '—'}</td>
      <td className="py-2 text-sm font-semibold text-[#0A1628]">{actual ?? '—'}</td>
    </tr>
  )
}

const AMEND_FIELDS: { field: string; label: string }[] = [
  { field: 'receiver.name', label: 'Delivery contact name' },
  { field: 'receiver.phone', label: 'Delivery phone' },
  { field: 'receiver.address', label: 'Delivery address line' },
  { field: 'receiver.city', label: 'Delivery city' },
  { field: 'receiver.postalCode', label: 'Delivery postal code' },
  { field: 'receiver.country', label: 'Delivery country' },
  { field: 'totalWeight', label: 'Total weight (kg)' },
  { field: 'totalPieces', label: 'Total pieces' },
  { field: 'contentsType', label: 'Contents type' },
  { field: 'service', label: 'Service level' },
  { field: 'incoterms', label: 'Incoterms' },
  { field: 'dangerousGoods', label: 'Dangerous goods' },
  { field: 'notes', label: 'Special instructions' },
]

export function AdminShipmentDetail({ shipment, reload }: { shipment: Row; reload: () => Promise<void> }) {
  const [tab, setTab] = useState<'data' | 'timeline' | 'amendments' | 'charges' | 'lifecycle' | 'documents' | 'invoice'>('lifecycle')
  const [busy, setBusy] = useState(false)
  const s = shipment ?? {}
  const quote = s?.quote ?? {}
  const locked = isDeliveredLocked(s?.status)
  const mode = amendmentModeFor(s?.status)
  const transitions = useMemo(() => allowedTransitions(s?.status as ShipmentStatus), [s?.status])

  async function call(url: string, method: string, body: any, ok: string) {
    setBusy(true)
    try {
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r?.json?.().catch?.(() => ({})) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Request failed.')
      toast?.success?.(ok)
      await reload()
      return true
    } catch (e: unknown) {
      toast?.error?.(e instanceof Error ? e.message : 'Request failed.')
      return false
    } finally { setBusy(false) }
  }

  const tabs: [typeof tab, string][] = [
    ['lifecycle', 'Lifecycle'],
    ['data', 'Quoted / Booked / Actual'],
    ['timeline', 'Timeline'],
    ['documents', 'Documents'],
    ['invoice', 'Invoice'],
    ['amendments', 'Amendments'],
    ['charges', 'Charges'],
  ]

  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-md)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-bold text-[#0A1628]">{s?.reference ?? s?.trackingNumber ?? ''}</p>
          {s?.reference ? <p className="font-mono text-[11px] text-slate-400">Tracking: {s?.trackingNumber ?? '—'}{s?.awbNumber ? ` · AWB: ${s?.awbNumber}` : ''}</p> : null}
          <h3 className="mt-1 text-lg font-bold text-[#0A1628]">{s?.origin ?? ''} <ArrowRight className="inline h-4 w-4" /> {s?.destination ?? ''}</h3>
          <p className="mt-1 text-xs text-slate-500">Service: {s?.customerServiceName ?? fmt(s?.bookedService) ?? '—'} · Carrier (internal): {s?.carrier ?? '—'} · {s?.user?.name ?? ''}</p>
          {s?.sellingPrice != null ? <p className="mt-1 text-xs font-semibold text-green-700">Selling price: {money(s?.sellingPrice, s?.sellingCurrency ?? 'EUR')}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge value={s?.status ?? ''} />
          <span className="text-xs text-slate-400">{mode.label}</span>
        </div>
      </div>

      {s?.actionRequired ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Action required: {s?.actionMessage || fmt(s?.actionType) || 'Review needed.'}</span>
        </div>
      ) : null}
      {locked ? (
        <div className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">This shipment is delivered and locked. Historical data remains fully auditable; only a return can be started.</div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-100 pb-2">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
        ))}
      </div>

      {tab === 'lifecycle' ? <LifecycleTab s={s} transitions={transitions} locked={locked} busy={busy} call={call} /> : null}
      {tab === 'data' ? <DataTab s={s} quote={quote} /> : null}
      {tab === 'timeline' ? <TimelineTab s={s} /> : null}
      {tab === 'documents' ? <DocumentsTab s={s} /> : null}
      {tab === 'invoice' ? <InvoiceTab s={s} reload={reload} /> : null}
      {tab === 'amendments' ? <AmendmentsTab s={s} mode={mode} busy={busy} call={call} /> : null}
      {tab === 'charges' ? <ChargesTab s={s} busy={busy} call={call} /> : null}
    </div>
  )
}

function LifecycleTab({ s, transitions, locked, busy, call }: any) {
  const [status, setStatus] = useState('')
  const [customs, setCustoms] = useState(s?.customsSubStatus ?? '')
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const body: any = {
      shipmentId: s?.id,
      status: status || s?.status,
      location: form.get('location') ?? '',
      country: form.get('country') ?? '',
      customerDescription: form.get('customerDescription') ?? '',
      internalDescription: form.get('internalDescription') ?? '',
      description: form.get('customerDescription') ?? '',
      source: 'MANUAL',
    }
    if (customs) body.customsSubStatus = customs
    const ok = await call('/api/shipments', 'POST', body, 'Shipment updated.')
    if (ok) setStatus('')
  }
  return (
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <form onSubmit={submit} className="rounded-xl border border-slate-100 p-4">
        <h4 className="flex items-center gap-2 font-semibold text-[#0A1628]"><Truck className="h-4 w-4" /> Update status</h4>
        <label className="mt-4 block"><span className="label">Next status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field" disabled={locked}>
            <option value="">Keep current ({adminStatusLabel(s?.status)})</option>
            {transitions.map((t: string) => <option key={t} value={t}>{adminStatusLabel(t)}</option>)}
          </select>
        </label>
        <label className="mt-3 block"><span className="label">Customs sub-status (internal)</span>
          <select value={customs} onChange={(e) => setCustoms(e.target.value)} className="field" disabled={locked}>
            <option value="">None</option>
            {CUSTOMS_SUB_STATUSES.map((c) => <option key={c} value={c}>{adminCustomsLabel(c)}</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Location</span><input name="location" className="field" /></label>
          <label className="block"><span className="label">Country</span><input name="country" className="field" /></label>
        </div>
        <label className="mt-3 block"><span className="label">Customer-facing note</span><textarea name="customerDescription" className="field min-h-16 py-2" placeholder="Shown to the customer" /></label>
        <label className="mt-3 block"><span className="label">Internal note</span><textarea name="internalDescription" className="field min-h-16 py-2" placeholder="Never shown to the customer" /></label>
        <button disabled={busy || locked} className="btn-primary mt-4 w-full disabled:opacity-50"><Send className="h-4 w-4" /> Save update</button>
      </form>
      <div className="rounded-xl border border-slate-100 p-4">
        <h4 className="flex items-center gap-2 font-semibold text-[#0A1628]"><Truck className="h-4 w-4" /> Operational details</h4>
        <OperationalForm s={s} busy={busy} call={call} />
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="flex items-center gap-2 font-semibold text-[#0A1628]"><PackageSearch className="h-4 w-4" /> Actual carrier data</h4>
          <ActualForm s={s} busy={busy} call={call} />
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="flex items-center gap-2 font-semibold text-red-700"><Ban className="h-4 w-4" /> Cancellation / Return</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy || locked} onClick={() => call(`/api/admin/shipments/${s?.id}/cancel`, 'POST', { action: 'CANCEL' }, 'Shipment cancelled.')} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">Cancel shipment</button>
            <button disabled={busy} onClick={() => call(`/api/admin/shipments/${s?.id}/cancel`, 'POST', { action: 'RETURN' }, 'Return started.')} className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Start return</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActualForm({ s, busy, call }: any) {
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const body = Object.fromEntries(form.entries())
    await call(`/api/admin/shipments/${s?.id}/actual`, 'POST', body, 'Actual data recorded.')
  }
  return (
    <form onSubmit={submit} className="mt-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Actual weight (kg)</span><input name="actualWeightKg" type="number" step="0.01" defaultValue={s?.actualWeightKg ?? ''} className="field" /></label>
        <label className="block"><span className="label">Actual pieces</span><input name="actualPieceCount" type="number" defaultValue={s?.actualPieceCount ?? ''} className="field" /></label>
        <label className="block"><span className="label">Chargeable weight</span><input name="actualChargeableWeightKg" type="number" step="0.01" defaultValue={s?.actualChargeableWeightKg ?? ''} className="field" /></label>
        <label className="block"><span className="label">Carrier cost (internal)</span><input name="actualCarrierCost" type="number" step="0.01" defaultValue={s?.actualCarrierCost ?? ''} className="field" /></label>
        <label className="block"><span className="label">Carrier reference</span><input name="actualCarrierReference" defaultValue={s?.actualCarrierReference ?? ''} className="field" /></label>
        <label className="block"><span className="label">Carrier service</span><input name="actualCarrierService" defaultValue={s?.actualCarrierService ?? ''} className="field" /></label>
      </div>
      <label className="mt-3 block"><span className="label">Dimensions</span><input name="actualDimensions" defaultValue={s?.actualDimensions ?? ''} placeholder="e.g. 40x30x20 cm" className="field" /></label>
      <button disabled={busy} className="btn-secondary mt-4 w-full disabled:opacity-50">Save actual data</button>
    </form>
  )
}

function DataTab({ s, quote }: any) {
  const qSender = quote?.senderJson ?? {}
  const qReceiver = quote?.receiverJson ?? {}
  return (
    <div className="mt-5 overflow-x-auto">
      <p className="mb-3 text-xs text-slate-500">Quoted and booked snapshots are preserved and never overwritten. Actual reflects the real carrier outcome.</p>
      <table className="w-full min-w-[520px] border-collapse">
        <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400"><th className="pb-2 pr-3">Field</th><th className="pb-2 pr-3">Quoted</th><th className="pb-2 pr-3">Booked</th><th className="pb-2">Actual</th></tr></thead>
        <tbody>
          <Cell label="Weight (kg)" quoted={quote?.weightKg ?? '—'} booked={s?.bookedWeightKg ?? '—'} actual={s?.actualWeightKg ?? '—'} />
          <Cell label="Pieces" quoted={quote?.pieces ?? '—'} booked={s?.bookedPieceCount ?? '—'} actual={s?.actualPieceCount ?? '—'} />
          <Cell label="Chargeable wt (kg)" quoted={'—'} booked={'—'} actual={s?.actualChargeableWeightKg ?? '—'} />
          <Cell label="Service" quoted={fmt(quote?.serviceType)} booked={fmt(s?.bookedService)} actual={fmt(s?.actualCarrierService)} />
          <Cell label="Contents" quoted={fmt(quote?.contentsType)} booked={'—'} actual={'—'} />
          <Cell label="Dimensions" quoted={'—'} booked={'—'} actual={s?.actualDimensions ?? '—'} />
          <Cell label="Carrier cost" quoted={'—'} booked={'—'} actual={s?.actualCarrierCost != null ? money(s?.actualCarrierCost, s?.actualCurrency ?? 'EUR') : '—'} />
          <Cell label="Origin" quoted={`${qSender?.city ?? ''} ${qSender?.country ?? ''}`.trim() || '—'} booked={s?.origin ?? '—'} actual={dt(s?.actualPickupAt)} />
          <Cell label="Destination" quoted={`${qReceiver?.city ?? ''} ${qReceiver?.country ?? ''}`.trim() || '—'} booked={s?.destination ?? '—'} actual={dt(s?.actualDeliveryAt)} />
        </tbody>
      </table>
    </div>
  )
}

function TimelineTab({ s }: any) {
  const events = s?.trackingEvents ?? []
  if (!events.length) return <p className="mt-5 text-sm text-slate-500">No tracking events yet.</p>
  return (
    <ol className="mt-5 space-y-3">
      {events.map((e: any) => (
        <li key={e?.id ?? Math.random()} className="rounded-lg border border-slate-100 p-3">
          <div className="flex items-center justify-between gap-2"><Badge value={e?.status ?? ''} /><span className="text-xs text-slate-400">{dt(e?.timestamp)}</span></div>
          <p className="mt-2 text-sm text-slate-700">{[e?.location, e?.country].filter(Boolean).join(', ')}</p>
          {e?.customerDescription ? <p className="mt-1 text-sm text-slate-600">Customer: {e?.customerDescription}</p> : null}
          {e?.internalDescription ? <p className="mt-1 text-xs text-slate-400">Internal: {e?.internalDescription}</p> : null}
          {!e?.customerDescription && e?.description ? <p className="mt-1 text-sm text-slate-600">{e?.description}</p> : null}
          <p className="mt-1 text-xs text-slate-400">Source: {fmt(e?.source ?? 'MANUAL')}</p>
        </li>
      ))}
    </ol>
  )
}

function AmendmentsTab({ s, mode, busy, call }: any) {
  const [field, setField] = useState(AMEND_FIELDS[0].field)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const amendments = s?.amendments ?? []
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!to.trim()) { toast?.error?.('Enter the new value.'); return }
    const ok = await call(`/api/admin/shipments/${s?.id}/amend`, 'POST', { changes: { [field]: { from, to } }, reason }, 'Amendment raised.')
    if (ok) { setFrom(''); setTo(''); setReason('') }
  }
  return (
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <div>
        <h4 className="flex items-center gap-2 font-semibold text-[#0A1628]"><ClipboardEdit className="h-4 w-4" /> {mode.mode === 'LOCKED' ? 'Amendments locked' : mode.label}</h4>
        {mode.mode === 'LOCKED' ? (
          <p className="mt-3 text-sm text-slate-500">This shipment is delivered and can no longer be amended.</p>
        ) : (
          <form onSubmit={submit} className="mt-3">
            <label className="block"><span className="label">Field to change</span>
              <select value={field} onChange={(e) => setField(e.target.value)} className="field">{AMEND_FIELDS.map((f) => <option key={f.field} value={f.field}>{f.label}</option>)}</select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block"><span className="label">From</span><input value={from} onChange={(e) => setFrom(e.target.value)} className="field" placeholder="Current value" /></label>
              <label className="block"><span className="label">To</span><input value={to} onChange={(e) => setTo(e.target.value)} className="field" placeholder="New value" /></label>
            </div>
            <label className="mt-3 block"><span className="label">Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} className="field" /></label>
            <button disabled={busy} className="btn-primary mt-4 w-full disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Raise amendment</button>
          </form>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-[#0A1628]">Amendment history</h4>
        {amendments.length ? (
          <ol className="mt-3 space-y-3">
            {amendments.map((a: any) => (
              <li key={a?.id ?? Math.random()} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-slate-700">{fmt(a?.amendmentType)}</span><Badge value={a?.status ?? ''} /></div>
                <p className="mt-1 text-xs text-slate-500">{fmt(a?.phase)} · Impact: {fmt(a?.impact)} · {dt(a?.createdAt)}</p>
                {Array.isArray(a?.changesJson) ? <ul className="mt-2 space-y-1 text-xs text-slate-600">{a.changesJson.map((c: any, i: number) => <li key={i}>{c?.label ?? c?.field}: {c?.from} → {c?.to}</li>)}</ul> : null}
                {a?.reason ? <p className="mt-1 text-xs text-slate-400">Reason: {a?.reason}</p> : null}
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-slate-500">No amendments raised.</p>}
      </div>
    </div>
  )
}

function ChargesTab({ s, busy, call }: any) {
  const [type, setType] = useState('')
  const [selling, setSelling] = useState('')
  const [cost, setCost] = useState('')
  const [reason, setReason] = useState('')
  const [approval, setApproval] = useState(true)
  const adjustments = s?.adjustments ?? []
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!type.trim()) { toast?.error?.('Enter a charge type.'); return }
    const ok = await call(`/api/admin/shipments/${s?.id}/adjustment`, 'POST', {
      adjustmentType: type, customerSellingAdjustment: Number(selling || 0), carrierCostAdjustment: Number(cost || 0), customerReason: reason, requiresCustomerApproval: approval,
    }, 'Charge created.')
    if (ok) { setType(''); setSelling(''); setCost(''); setReason('') }
  }
  return (
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <form onSubmit={submit}>
        <h4 className="flex items-center gap-2 font-semibold text-[#0A1628]"><PlusCircle className="h-4 w-4" /> Add charge</h4>
        <label className="mt-3 block"><span className="label">Charge type</span><input value={type} onChange={(e) => setType(e.target.value)} className="field" placeholder="e.g. Remote area surcharge" /></label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block"><span className="label">Customer amount (EUR)</span><input value={selling} onChange={(e) => setSelling(e.target.value)} type="number" step="0.01" className="field" /></label>
          <label className="block"><span className="label">Carrier cost (internal)</span><input value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.01" className="field" /></label>
        </div>
        <label className="mt-3 block"><span className="label">Reason (customer-facing)</span><input value={reason} onChange={(e) => setReason(e.target.value)} className="field" /></label>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} /> Requires customer approval</label>
        <button disabled={busy} className="btn-primary mt-4 w-full disabled:opacity-50">Create charge</button>
      </form>
      <div>
        <h4 className="font-semibold text-[#0A1628]">Charges</h4>
        {adjustments.length ? (
          <ol className="mt-3 space-y-3">
            {adjustments.map((a: any) => (
              <li key={a?.id ?? Math.random()} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-slate-700">{a?.adjustmentType}</span><Badge value={a?.status ?? ''} /></div>
                <p className="mt-1 text-sm text-slate-700">Customer: {money(a?.customerSellingAdjustment, a?.currency)} · Cost: {money(a?.carrierCostAdjustment, a?.currency)}</p>
                {a?.requiresCustomerApproval ? <p className="mt-1 text-xs text-slate-500">Approval: {fmt(a?.customerApprovalStatus ?? 'PENDING')}</p> : null}
                {a?.customerReason ? <p className="mt-1 text-xs text-slate-400">{a?.customerReason}</p> : null}
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-slate-500">No charges added.</p>}
      </div>
    </div>
  )
}

function OperationalForm({ s, busy, call }: any) {
  const [awb, setAwb] = useState(s?.awbNumber ?? '')
  const [carrier, setCarrier] = useState(s?.carrier ?? '')
  const [notes, setNotes] = useState(s?.operationalNotes ?? '')
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await call(`/api/admin/shipments/${s?.id}`, 'PATCH', { awbNumber: awb, carrier, operationalNotes: notes }, 'Operational details saved.')
  }
  return (
    <form onSubmit={submit} className="mt-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Internal carrier</span><input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="field" placeholder="e.g. FedEx" /></label>
        <label className="block"><span className="label">AWB / Tracking</span><input value={awb} onChange={(e) => setAwb(e.target.value)} className="field" placeholder="Air waybill / carrier tracking" /></label>
      </div>
      <label className="mt-3 block"><span className="label">Operational notes (internal)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="field min-h-16 py-2" placeholder="Never shown to the customer" /></label>
      <button disabled={busy} className="btn-secondary mt-4 w-full disabled:opacity-50"><Save className="h-4 w-4" /> Save operational details</button>
    </form>
  )
}

function DocumentsTab({ s }: any) {
  const [docs, setDocs] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0])
  const [visible, setVisible] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/shipments/${s?.id}/documents`)
      const d = (await r?.json?.().catch?.(() => ({}))) ?? {}
      setDocs(d?.documents ?? [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [s?.id])

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) { toast?.error?.('Choose a file to upload.'); return }
    setBusy(true)
    try {
      const pres = await fetch('/api/upload/presigned', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream' }) })
      const presData = (await pres?.json?.().catch?.(() => ({}))) ?? {}
      if (!pres?.ok) throw new Error(presData?.error ?? 'Unable to prepare upload.')
      const put = await fetch(presData?.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!put?.ok) throw new Error('File upload failed.')
      const save = await fetch(`/api/shipments/${s?.id}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, fileName: file.name, cloudStoragePath: presData?.cloud_storage_path, contentType: file.type || 'application/octet-stream', sizeBytes: file.size, isCustomerVisible: visible }) })
      const saveData = (await save?.json?.().catch?.(() => ({}))) ?? {}
      if (!save?.ok) throw new Error(saveData?.error ?? 'Unable to save document.')
      toast?.success?.('Document uploaded.')
      setFile(null); setVisible(false)
      const input = document.getElementById('doc-file-input') as HTMLInputElement | null
      if (input) input.value = ''
      await load()
    } catch (err: unknown) {
      toast?.error?.(err instanceof Error ? err.message : 'Upload failed.')
    } finally { setBusy(false) }
  }

  async function toggleVisibility(doc: Row) {
    setBusy(true)
    try {
      const r = await fetch(`/api/shipments/${s?.id}/documents/${doc?.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isCustomerVisible: !doc?.isCustomerVisible }) })
      if (!r?.ok) throw new Error('Unable to update visibility.')
      await load()
    } catch (err: unknown) { toast?.error?.(err instanceof Error ? err.message : 'Update failed.') } finally { setBusy(false) }
  }
  async function removeDoc(doc: Row) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/shipments/${s?.id}/documents/${doc?.id}`, { method: 'DELETE' })
      if (!r?.ok) throw new Error('Unable to delete document.')
      toast?.success?.('Document deleted.')
      await load()
    } catch (err: unknown) { toast?.error?.(err instanceof Error ? err.message : 'Delete failed.') } finally { setBusy(false) }
  }
  async function download(doc: Row) {
    try {
      const r = await fetch(`/api/shipments/${s?.id}/documents/${doc?.id}`)
      const d = (await r?.json?.().catch?.(() => ({}))) ?? {}
      if (!r?.ok || !d?.url) throw new Error(d?.error ?? 'Unable to open document.')
      const a = document.createElement('a')
      a.href = d.url; a.download = doc?.fileName ?? 'document'; document.body.appendChild(a); a.click(); a.remove()
    } catch (err: unknown) { toast?.error?.(err instanceof Error ? err.message : 'Download failed.') }
  }

  return (
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <form onSubmit={upload} className="rounded-xl border border-slate-100 p-4">
        <h4 className="flex items-center gap-2 font-semibold text-[#0A1628]"><Upload className="h-4 w-4" /> Upload document</h4>
        <label className="mt-3 block"><span className="label">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="field">
            {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{documentCategoryLabel(c)}</option>)}
          </select>
        </label>
        <label className="mt-3 block"><span className="label">File</span>
          <input id="doc-file-input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="field" />
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Visible to customer</label>
        <button disabled={busy} className="btn-primary mt-4 w-full disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</button>
      </form>
      <div>
        <h4 className="font-semibold text-[#0A1628]">Documents</h4>
        {loading ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : docs.length ? (
          <ul className="mt-3 space-y-2">
            {docs.map((d: Row) => (
              <li key={d?.id ?? Math.random()} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700"><FileText className="h-4 w-4 shrink-0 text-green-600" /><span className="truncate">{d?.fileName ?? ''}</span></p>
                    <p className="mt-1 text-xs text-slate-500">{documentCategoryLabel(d?.category)}{d?.isCustomerVisible ? ' · Visible to customer' : ' · Internal only'}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => download(d)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"><Download className="mr-1 inline h-3.5 w-3.5" />Download</button>
                  <button disabled={busy} onClick={() => toggleVisibility(d)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50">{d?.isCustomerVisible ? <><EyeOff className="mr-1 inline h-3.5 w-3.5" />Hide</> : <><Eye className="mr-1 inline h-3.5 w-3.5" />Show</>}</button>
                  <button disabled={busy} onClick={() => removeDoc(d)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-slate-500">No documents uploaded.</p>}
      </div>
    </div>
  )
}

function InvoiceTab({ s, reload }: any) {
  const [invoice, setInvoice] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [vatInput, setVatInput] = useState('')
  const [termsInput, setTermsInput] = useState('')
  const [dueInput, setDueInput] = useState('')
  const eligibility = invoiceEligibility({
    status: s?.status,
    sellingPrice: s?.sellingPrice,
    actualWeightKg: s?.actualWeightKg,
    actualChargeableWeightKg: s?.actualChargeableWeightKg,
    direction: s?.quote?.direction ?? null,
  })
  const eligible = eligibility.eligible

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/shipments/${s?.id}/invoice`)
      const d = (await r?.json?.().catch?.(() => ({}))) ?? {}
      setInvoice((d?.invoices ?? [])[0] ?? null)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => {
    setVatInput(invoice?.vatPct != null ? String(invoice.vatPct) : '')
    setTermsInput(invoice?.paymentTerms ?? '')
    setDueInput(invoice?.dueDate ? String(invoice.dueDate).slice(0, 10) : '')
  }, [invoice?.id, invoice?.vatPct, invoice?.paymentTerms, invoice?.dueDate])
  useEffect(() => { void load() }, [s?.id])

  async function createInvoice() {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/shipments/${s?.id}/invoice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const d = (await r?.json?.().catch?.(() => ({}))) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to create invoice.')
      toast?.success?.('Draft invoice created.')
      setInvoice(d?.invoice ?? null)
      await reload?.()
    } catch (err: unknown) { toast?.error?.(err instanceof Error ? err.message : 'Unable to create invoice.') } finally { setBusy(false) }
  }
  const charges: Row[] = Array.isArray(invoice?.chargesJson) ? invoice?.chargesJson : []
  async function saveCharges(next: Row[]) {
    setBusy(true)
    try {
      const r = await fetch(`/api/invoices/${invoice?.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ charges: next }) })
      const d = (await r?.json?.().catch?.(() => ({}))) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to save charges.')
      setInvoice(d?.invoice ?? null)
      await reload?.()
    } catch (err: unknown) { toast?.error?.(err instanceof Error ? err.message : 'Unable to save charges.') } finally { setBusy(false) }
  }
  async function saveMeta() {
    setBusy(true)
    try {
      const r = await fetch(`/api/invoices/${invoice?.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vatPct: vatInput === '' ? 0 : Number(vatInput) || 0, paymentTerms: termsInput, dueDate: dueInput }) })
      const d = (await r?.json?.().catch?.(() => ({}))) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to save billing settings.')
      toast?.success?.('Billing settings saved.')
      setInvoice(d?.invoice ?? null)
      await reload?.()
    } catch (err: unknown) { toast?.error?.(err instanceof Error ? err.message : 'Unable to save billing settings.') } finally { setBusy(false) }
  }
  async function addCharge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!desc.trim()) { toast?.error?.('Enter a charge description.'); return }
    const next = [...charges, { description: desc.trim(), amount: Number(amount || 0) || 0 }]
    await saveCharges(next)
    setDesc(''); setAmount('')
  }
  async function removeCharge(i: number) {
    const next = charges.filter((_, idx) => idx !== i)
    await saveCharges(next)
  }
  async function finalize() {
    if (!confirm('Finalize this invoice? It can no longer be edited afterwards.')) return
    setBusy(true)
    try {
      const r = await fetch(`/api/invoices/${invoice?.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'finalize' }) })
      const d = (await r?.json?.().catch?.(() => ({}))) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to finalize invoice.')
      toast?.success?.('Invoice finalized.')
      setInvoice(d?.invoice ?? null)
      await reload?.()
    } catch (err: unknown) { toast?.error?.(err instanceof Error ? err.message : 'Unable to finalize invoice.') } finally { setBusy(false) }
  }

  if (loading) return <p className="mt-5 text-sm text-slate-500">Loading…</p>
  if (!invoice) {
    return (
      <div className="mt-5 rounded-xl border border-slate-100 p-6 text-center">
        <CircleDollarSign className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-600">No invoice yet for this shipment.</p>
        <p className="mt-1 text-xs text-slate-400">{eligible ? 'Create a draft invoice inheriting the accepted selling price.' : eligibility.reason}</p>
        <button disabled={busy || !eligible} onClick={createInvoice} className="btn-primary mx-auto mt-4 disabled:opacity-50"><PlusCircle className="h-4 w-4" /> Create draft invoice</button>
      </div>
    )
  }
  const ccy = invoice?.currency ?? 'EUR'
  const finalized = invoice?.status === 'FINALIZED'
  return (
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-slate-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-sm font-bold text-[#0A1628]">{invoice?.reference ?? ''}</p>
          <Badge value={invoice?.status ?? 'DRAFT'} />
        </div>
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-2"><span className="text-slate-500">Customer</span><span className="font-medium text-slate-700">{invoice?.customerName ?? '—'}</span></div>
          <div className="flex justify-between gap-2"><span className="text-slate-500">Service</span><span className="font-medium text-slate-700">{invoice?.serviceName ?? '—'}</span></div>
          <div className="flex justify-between gap-2"><span className="text-slate-500">Accepted selling price</span><span className="font-medium text-slate-700">{money(invoice?.sellingPrice, ccy)}</span></div>
          {charges.map((c: Row, i: number) => (
            <div key={i} className="flex items-center justify-between gap-2"><span className="text-slate-500">{c?.description}</span><span className="flex items-center gap-2 font-medium text-slate-700">{money(c?.amount, ccy)}{!finalized ? <button onClick={() => removeCharge(i)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button> : null}</span></div>
          ))}
          {Number(invoice?.vatPct) > 0 ? (
            <>
              <div className="mt-2 flex justify-between gap-2 border-t border-slate-100 pt-2"><span className="text-slate-500">Net subtotal</span><span className="font-medium text-slate-700">{money(invoice?.subtotal, ccy)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">VAT ({Number(invoice?.vatPct)}%)</span><span className="font-medium text-slate-700">{money(invoice?.vatAmount, ccy)}</span></div>
            </>
          ) : null}
          <div className="mt-2 flex justify-between gap-2 border-t border-slate-100 pt-2 text-base font-bold text-[#0A1628]"><span>Total</span><span>{money(invoice?.total, ccy)}</span></div>
          {invoice?.paymentTerms || invoice?.dueDate ? (
            <div className="flex justify-between gap-2 text-xs text-slate-500"><span>{invoice?.paymentTerms ? `Terms: ${invoice.paymentTerms}` : ''}</span><span>{invoice?.dueDate ? `Due ${dt(invoice.dueDate)}` : ''}</span></div>
          ) : null}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Selling-side figures only — internal carrier cost and margin are never shown.{finalized && invoice?.finalizedAt ? ` Finalized ${dt(invoice?.finalizedAt)}.` : ''}</p>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="label mb-2">Invoice document</p>
          <InvoiceActions invoiceId={invoice?.id ?? ''} />
          <p className="mt-2 text-[11px] text-slate-400">Preview, print or download the customer-facing invoice. Internal cost and margin are never shown.</p>
        </div>
      </div>
      <div>
        {finalized ? (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-green-800"><CheckCircle2 className="h-4 w-4" /> Invoice finalized</p>
            <p className="mt-1 text-xs text-green-700">This invoice is now visible to the customer and can no longer be edited.</p>
          </div>
        ) : (
          <>
            <h4 className="flex items-center gap-2 font-semibold text-[#0A1628]"><PlusCircle className="h-4 w-4" /> Add charge</h4>
            <form onSubmit={addCharge} className="mt-3">
              <label className="block"><span className="label">Description</span><input value={desc} onChange={(e) => setDesc(e.target.value)} className="field" placeholder="e.g. Remote area surcharge" /></label>
              <label className="mt-3 block"><span className="label">Amount ({ccy})</span><input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" className="field" /></label>
              <button disabled={busy} className="btn-secondary mt-4 w-full disabled:opacity-50">Add charge</button>
            </form>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="flex items-center gap-2 font-semibold text-[#0A1628]"><CircleDollarSign className="h-4 w-4" /> VAT &amp; payment terms</h4>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block"><span className="label">VAT rate (%)</span><input value={vatInput} onChange={(e) => setVatInput(e.target.value)} type="number" step="0.01" min="0" className="field" placeholder="0" /></label>
                <label className="block"><span className="label">Payment terms</span><input value={termsInput} onChange={(e) => setTermsInput(e.target.value)} className="field" placeholder="e.g. Net 15" /></label>
              </div>
              <label className="mt-3 block"><span className="label">Due date</span><input value={dueInput} onChange={(e) => setDueInput(e.target.value)} type="date" className="field" /></label>
              <button disabled={busy} onClick={saveMeta} className="btn-secondary mt-4 w-full disabled:opacity-50"><Save className="h-4 w-4" /> Save billing settings</button>
              <p className="mt-2 text-[11px] text-slate-400">VAT applies where applicable; leave 0 for no VAT. Terms/due date appear on the invoice only when set.</p>
            </div>
            <button disabled={busy} onClick={finalize} className="btn-primary mt-5 w-full disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Finalize invoice</button>
          </>
        )}
      </div>
    </div>
  )
}
