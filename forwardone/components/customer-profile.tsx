'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, FileText, Loader2, MapPin, Pencil, Plus, Save, Trash2, Truck, User as UserIcon, WalletCards, X } from 'lucide-react'
import { toast } from 'sonner'

type Row = any

const TABS = ['Overview', 'Addresses', 'Quotes', 'Shipments', 'Invoices', 'Pricing', 'Reports'] as const
type Tab = typeof TABS[number]

function fmtDate(v: unknown): string { if (!v) return '—'; const d = new Date(String(v)); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
function money(v: unknown, ccy = 'EUR'): string { const n = Number(v ?? 0) || 0; return `${ccy} ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-sm)]"><p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-[#0A1628]">{value}</p>{sub ? <p className="text-xs text-slate-400">{sub}</p> : null}</div>
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return <div><p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-sm font-medium text-[#0A1628]">{value || '—'}</p></div>
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <label className="field"><span className="text-[11px] uppercase tracking-wider text-slate-400">{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500" /></label>
}

export function CustomerProfile({ customerId }: { customerId: string }) {
  const [data, setData] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Overview')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/users/${customerId}`)
      const d = await r?.json?.().catch?.(() => ({})) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to load customer.')
      setData(d?.customer ?? null)
    } catch (e: unknown) { console.error(e); toast?.error?.(e instanceof Error ? e.message : 'Unable to load customer.') }
    finally { setLoading(false) }
  }, [customerId])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-green-600" /></div>
  if (!data) return <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-[var(--shadow-sm)]"><p>Customer not found.</p><Link href="/admin/customers" className="mt-3 inline-flex items-center gap-1 text-green-700"><ArrowLeft className="h-4 w-4" /> Back to Customers</Link></div>

  const m = data?.metrics ?? {}
  const displayName = data?.billingTradingName || data?.name || data?.email

  return <div className="grid gap-5">
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-green-700"><ArrowLeft className="h-4 w-4" /> Back to Customers</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Customer master</p>
          <h2 className="text-2xl font-bold text-[#0A1628]">{displayName}</h2>
          <p className="mt-1 text-sm text-slate-500">{data?.email}{data?.billingTaxId ? ` · NIPT/Tax ID: ${data.billingTaxId}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-badge ${data?.role === 'BUSINESS_CUSTOMER' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{data?.role === 'BUSINESS_CUSTOMER' ? 'Business customer' : 'Customer'}</span>
          <span className={`status-badge ${data?.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{data?.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>

    <div className="flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${tab === t ? 'border-b-2 border-green-600 text-green-700' : 'text-slate-500 hover:text-[#0A1628]'}`}>{t}</button>)}
    </div>

    {tab === 'Overview' ? <OverviewTab data={data} onSaved={load} /> : null}
    {tab === 'Addresses' ? <AddressesTab customerId={customerId} addresses={data?.addresses ?? []} onChanged={load} /> : null}
    {tab === 'Quotes' ? <QuotesTab quotes={data?.quotes ?? []} /> : null}
    {tab === 'Shipments' ? <ShipmentsTab shipments={data?.shipments ?? []} /> : null}
    {tab === 'Invoices' ? <InvoicesTab invoices={data?.invoices ?? []} /> : null}
    {tab === 'Pricing' ? <PricingTab customerId={customerId} /> : null}
    {tab === 'Reports' ? <ReportsTab m={m} /> : null}
  </div>
}

function OverviewTab({ data, onSaved }: { data: Row; onSaved: () => Promise<void> }) {
  const [edit, setEdit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<Row>({})
  useEffect(() => { setForm({
    name: data?.name ?? '', email: data?.email ?? '', role: data?.role ?? 'CUSTOMER', isActive: data?.isActive !== false,
    billingLegalName: data?.billingLegalName ?? '', billingTradingName: data?.billingTradingName ?? '', billingTaxId: data?.billingTaxId ?? '',
    contactPerson: data?.contactPerson ?? '', phone: data?.phone ?? '', billingPhone: data?.billingPhone ?? '',
    billingAddress: data?.billingAddress ?? '', billingCity: data?.billingCity ?? '', billingZip: data?.billingZip ?? '', billingCountry: data?.billingCountry ?? '',
  }) }, [data])

  async function save() {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/users/${data?.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r?.json?.().catch?.(() => ({})) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to save.')
      toast?.success?.('Customer profile saved.')
      setEdit(false); await onSaved()
    } catch (e: unknown) { console.error(e); toast?.error?.(e instanceof Error ? e.message : 'Unable to save.') }
    finally { setBusy(false) }
  }

  const m = data?.metrics ?? {}

  return <div className="grid gap-5">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Total quotes" value={m?.totalQuotes ?? 0} />
      <Stat label="Shipments" value={m?.totalShipments ?? 0} sub={`${m?.shipmentsDelivered ?? 0} delivered`} />
      <Stat label="Invoices" value={m?.totalInvoices ?? 0} sub={`${m?.finalizedInvoices ?? 0} finalized`} />
      <Stat label="Revenue" value={money(m?.revenue, m?.revenueCurrency)} sub="Finalized invoices" />
    </div>

    <section className="rounded-xl bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#0A1628]">Profile details</h3>
        {edit
          ? <div className="flex gap-2"><button onClick={() => setEdit(false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"><X className="h-4 w-4" /> Cancel</button><button disabled={busy} onClick={save} className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button></div>
          : <button onClick={() => setEdit(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-green-500 hover:text-green-700"><Pencil className="h-4 w-4" /> Edit</button>}
      </div>

      {edit
        ? <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Account name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <label className="field"><span className="text-[11px] uppercase tracking-wider text-slate-400">Customer type</span><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"><option value="CUSTOMER">Customer</option><option value="BUSINESS_CUSTOMER">Business customer</option></select></label>
            <label className="field"><span className="text-[11px] uppercase tracking-wider text-slate-400">Status</span><select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <Input label="Legal name" value={form.billingLegalName} onChange={(v) => setForm({ ...form, billingLegalName: v })} />
            <Input label="Trading / commercial name" value={form.billingTradingName} onChange={(v) => setForm({ ...form, billingTradingName: v })} />
            <Input label="NIPT / Tax ID" value={form.billingTaxId} onChange={(v) => setForm({ ...form, billingTaxId: v })} />
            <Input label="Contact person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Input label="Billing phone" value={form.billingPhone} onChange={(v) => setForm({ ...form, billingPhone: v })} />
            <Input label="Billing address" value={form.billingAddress} onChange={(v) => setForm({ ...form, billingAddress: v })} />
            <Input label="City" value={form.billingCity} onChange={(v) => setForm({ ...form, billingCity: v })} />
            <Input label="ZIP / postal code" value={form.billingZip} onChange={(v) => setForm({ ...form, billingZip: v })} />
            <Input label="Country" value={form.billingCountry} onChange={(v) => setForm({ ...form, billingCountry: v })} />
          </div>
        : <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Account name" value={data?.name} />
            <Field label="Email" value={data?.email} />
            <Field label="Organization" value={data?.organization?.name} />
            <Field label="Legal name" value={data?.billingLegalName} />
            <Field label="Trading / commercial name" value={data?.billingTradingName} />
            <Field label="NIPT / Tax ID" value={data?.billingTaxId} />
            <Field label="Contact person" value={data?.contactPerson} />
            <Field label="Phone" value={data?.phone} />
            <Field label="Billing phone" value={data?.billingPhone} />
            <Field label="Billing address" value={data?.billingAddress} />
            <Field label="City" value={data?.billingCity} />
            <Field label="ZIP / postal code" value={data?.billingZip} />
            <Field label="Country" value={data?.billingCountry} />
            <Field label="Registered on" value={fmtDate(data?.createdAt)} />
          </div>}
    </section>
  </div>
}

const emptyAddress = { label: '', name: '', company: '', addressLine1: '', addressLine2: '', city: '', state: '', zip: '', country: '', phone: '', email: '', kind: '', isFavorite: false }

function AddressesTab({ customerId, addresses, onChanged }: { customerId: string; addresses: Row[]; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!editing) return
    const isNew = !editing?.id
    setBusy(true)
    try {
      const url = isNew ? `/api/admin/users/${customerId}/addresses` : `/api/admin/users/${customerId}/addresses/${editing.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
      const d = await r?.json?.().catch?.(() => ({})) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to save the address.')
      toast?.success?.(isNew ? 'Address added.' : 'Address updated.')
      setEditing(null); await onChanged()
    } catch (e: unknown) { console.error(e); toast?.error?.(e instanceof Error ? e.message : 'Unable to save the address.') }
    finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this address?')) return
    try {
      const r = await fetch(`/api/admin/users/${customerId}/addresses/${id}`, { method: 'DELETE' })
      const d = await r?.json?.().catch?.(() => ({})) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to delete.')
      toast?.success?.('Address deleted.'); await onChanged()
    } catch (e: unknown) { console.error(e); toast?.error?.(e instanceof Error ? e.message : 'Unable to delete.') }
  }

  return <section className="grid gap-4">
    <div className="flex items-center justify-between">
      <div><p className="section-kicker">Address book</p><h3 className="text-lg font-bold text-[#0A1628]">Reusable sender, receiver &amp; billing addresses</h3></div>
      {!editing ? <button onClick={() => setEditing({ ...emptyAddress })} className="btn-primary inline-flex items-center gap-1 px-3 py-2 text-sm"><Plus className="h-4 w-4" /> Add address</button> : null}
    </div>

    {editing ? <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Label" value={editing.label} onChange={(v) => setEditing({ ...editing, label: v })} placeholder="e.g. Head office" />
        <label className="field"><span className="text-[11px] uppercase tracking-wider text-slate-400">Type</span><select value={editing.kind ?? ''} onChange={(e) => setEditing({ ...editing, kind: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"><option value="">Unspecified</option><option value="SENDER">Sender</option><option value="RECEIVER">Receiver</option><option value="BILLING">Billing</option></select></label>
        <Input label="Contact name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
        <Input label="Company" value={editing.company ?? ''} onChange={(v) => setEditing({ ...editing, company: v })} />
        <Input label="Address line 1" value={editing.addressLine1} onChange={(v) => setEditing({ ...editing, addressLine1: v })} />
        <Input label="Address line 2" value={editing.addressLine2 ?? ''} onChange={(v) => setEditing({ ...editing, addressLine2: v })} />
        <Input label="City" value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} />
        <Input label="State / region" value={editing.state ?? ''} onChange={(v) => setEditing({ ...editing, state: v })} />
        <Input label="ZIP / postal code" value={editing.zip ?? ''} onChange={(v) => setEditing({ ...editing, zip: v })} />
        <Input label="Country" value={editing.country} onChange={(v) => setEditing({ ...editing, country: v })} />
        <Input label="Phone" value={editing.phone ?? ''} onChange={(v) => setEditing({ ...editing, phone: v })} />
        <Input label="Email" value={editing.email ?? ''} onChange={(v) => setEditing({ ...editing, email: v })} type="email" />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!editing.isFavorite} onChange={(e) => setEditing({ ...editing, isFavorite: e.target.checked })} /> Mark as favorite</label>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"><X className="h-4 w-4" /> Cancel</button>
        <button disabled={busy} onClick={submit} className="btn-primary inline-flex items-center gap-1 px-3 py-2 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save address</button>
      </div>
    </div> : null}

    <div className="grid gap-3 sm:grid-cols-2">
      {addresses?.length ? addresses.map((a: Row) => <div key={a?.id} className="rounded-xl bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2"><p className="font-semibold text-[#0A1628]">{a?.label}</p>{a?.kind ? <span className="status-badge bg-slate-100 text-slate-600">{String(a.kind).charAt(0) + String(a.kind).slice(1).toLowerCase()}</span> : null}{a?.isFavorite ? <span className="status-badge bg-amber-50 text-amber-700">Favorite</span> : null}</div>
            <p className="mt-1 text-sm text-slate-600">{a?.name}{a?.company ? ` · ${a.company}` : ''}</p>
            <p className="text-sm text-slate-500">{[a?.addressLine1, a?.addressLine2, a?.city, a?.state, a?.zip, a?.country].filter(Boolean).join(', ')}</p>
            <p className="text-xs text-slate-400">{[a?.phone, a?.email].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setEditing({ ...a })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-green-700"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove(a?.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>) : <div className="col-span-full rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-[var(--shadow-sm)]"><MapPin className="mx-auto mb-2 h-6 w-6 text-slate-300" /> No saved addresses yet.</div>}
    </div>
  </section>
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-[var(--shadow-sm)]"><div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center text-slate-300">{icon}</div>{text}</div>
}

function statusBadge(status: string): string {
  const s = String(status ?? '').toUpperCase()
  if (['ACCEPTED', 'BOOKED', 'DELIVERED', 'FINALIZED', 'FINANCIALLY_CLOSED'].includes(s)) return 'bg-green-50 text-green-700'
  if (['REJECTED', 'CANCELLED', 'EXCEPTION', 'CUSTOMS_HOLD', 'ON_HOLD'].includes(s)) return 'bg-red-50 text-red-600'
  if (['PENDING_REVIEW', 'QUOTED', 'DRAFT'].includes(s)) return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}
function pretty(s: string): string { return String(s ?? '').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) }

function QuotesTab({ quotes }: { quotes: Row[] }) {
  if (!quotes?.length) return <EmptyState icon={<FileText className="h-6 w-6" />} text="No quotes for this customer yet." />
  return <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-sm)]"><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Route</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{quotes.map((q: Row) => <tr key={q?.id}><td className="px-5 py-3 font-semibold text-[#0A1628]">{q?.reference}</td><td className="px-5 py-3 text-slate-600">{[q?.originCountry, q?.destCountry].filter(Boolean).join(' → ') || '—'}</td><td className="px-5 py-3 text-slate-600">{pretty(q?.serviceType)}</td><td className="px-5 py-3"><span className={`status-badge ${statusBadge(q?.status)}`}>{pretty(q?.status)}</span></td><td className="px-5 py-3 text-slate-500">{fmtDate(q?.createdAt)}</td><td className="px-5 py-3 text-right"><Link href={`/admin/quotes/${q?.id}`} className="text-green-700 hover:underline">Open</Link></td></tr>)}</tbody></table></div></div>
}

function ShipmentsTab({ shipments }: { shipments: Row[] }) {
  if (!shipments?.length) return <EmptyState icon={<Truck className="h-6 w-6" />} text="No shipments for this customer yet." />
  return <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-sm)]"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Tracking</th><th className="px-5 py-3">Route</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{shipments.map((s: Row) => <tr key={s?.id}><td className="px-5 py-3 font-semibold text-[#0A1628]">{s?.reference || '—'}</td><td className="px-5 py-3 text-slate-600">{s?.trackingNumber}</td><td className="px-5 py-3 text-slate-600">{[s?.origin, s?.destination].filter(Boolean).join(' → ')}</td><td className="px-5 py-3 text-slate-600">{s?.customerServiceName || '—'}</td><td className="px-5 py-3"><span className={`status-badge ${statusBadge(s?.status)}`}>{pretty(s?.status)}</span></td><td className="px-5 py-3 text-slate-500">{fmtDate(s?.createdAt)}</td><td className="px-5 py-3 text-right"><Link href={`/admin/shipments/${s?.id}`} className="text-green-700 hover:underline">Open</Link></td></tr>)}</tbody></table></div></div>
}

function InvoicesTab({ invoices }: { invoices: Row[] }) {
  if (!invoices?.length) return <EmptyState icon={<WalletCards className="h-6 w-6" />} text="No invoices for this customer yet." />
  return <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-sm)]"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.map((i: Row) => <tr key={i?.id}><td className="px-5 py-3 font-semibold text-[#0A1628]">{i?.reference}</td><td className="px-5 py-3 text-slate-600">{i?.serviceName || '—'}</td><td className="px-5 py-3 text-slate-600">{money(i?.total, i?.currency)}</td><td className="px-5 py-3"><span className={`status-badge ${statusBadge(i?.status)}`}>{pretty(i?.status)}</span></td><td className="px-5 py-3 text-slate-500">{fmtDate(i?.createdAt)}</td><td className="px-5 py-3 text-right"><Link href={`/invoices/${i?.id}/view`} className="text-green-700 hover:underline">View</Link></td></tr>)}</tbody></table></div></div>
}

function PricingTab({ customerId }: { customerId: string }) {
  const [profile, setProfile] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<Row>({ preferredCarrier: '', preferredService: '', preferredCurrency: 'EUR', discountPct: 0, creditDays: 0, creditLimit: 0, paymentTerms: '', specialNotes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/pricing-profiles?userId=${customerId}`)
      const d = await r?.json?.().catch?.(() => ({})) ?? {}
      const p = d?.profile ?? null
      setProfile(p)
      if (p) setForm({ preferredCarrier: p?.preferredCarrier ?? '', preferredService: p?.preferredService ?? '', preferredCurrency: p?.preferredCurrency ?? 'EUR', discountPct: p?.discountPct ?? 0, creditDays: p?.creditDays ?? 0, creditLimit: p?.creditLimit ?? 0, paymentTerms: p?.paymentTerms ?? '', specialNotes: p?.specialNotes ?? '' })
    } catch (e: unknown) { console.error(e) }
    finally { setLoading(false) }
  }, [customerId])
  useEffect(() => { void load() }, [load])

  async function save() {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/pricing-profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: customerId, ...form }) })
      const d = await r?.json?.().catch?.(() => ({})) ?? {}
      if (!r?.ok) throw new Error(d?.error ?? 'Unable to save.')
      toast?.success?.('Pricing profile saved.'); await load()
    } catch (e: unknown) { console.error(e); toast?.error?.(e instanceof Error ? e.message : 'Unable to save.') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div>

  return <section className="rounded-xl bg-white p-5 shadow-[var(--shadow-sm)]">
    <div className="flex items-center justify-between"><div><p className="section-kicker">Customer-specific pricing</p><h3 className="text-lg font-bold text-[#0A1628]">Pricing profile</h3><p className="mt-1 text-sm text-slate-500">Preferred carriers, negotiated discount, credit and payment terms. Shared with the Customer Pricing module — the same profile, one source.</p></div>{profile ? <span className="status-badge bg-green-50 text-green-700">Profile set</span> : <span className="status-badge bg-slate-100 text-slate-500">No profile yet</span>}</div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input label="Preferred carrier" value={form.preferredCarrier} onChange={(v) => setForm({ ...form, preferredCarrier: v })} />
      <Input label="Preferred service" value={form.preferredService} onChange={(v) => setForm({ ...form, preferredService: v })} />
      <Input label="Currency" value={form.preferredCurrency} onChange={(v) => setForm({ ...form, preferredCurrency: v })} />
      <Input label="Discount %" value={String(form.discountPct)} onChange={(v) => setForm({ ...form, discountPct: v })} type="number" />
      <Input label="Credit days" value={String(form.creditDays)} onChange={(v) => setForm({ ...form, creditDays: v })} type="number" />
      <Input label="Credit limit" value={String(form.creditLimit)} onChange={(v) => setForm({ ...form, creditLimit: v })} type="number" />
      <Input label="Payment terms" value={form.paymentTerms} onChange={(v) => setForm({ ...form, paymentTerms: v })} />
      <label className="field sm:col-span-2"><span className="text-[11px] uppercase tracking-wider text-slate-400">Special notes</span><textarea value={form.specialNotes} onChange={(e) => setForm({ ...form, specialNotes: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500" /></label>
    </div>
    <div className="mt-4 flex items-center gap-3"><button disabled={busy} onClick={save} className="btn-primary inline-flex items-center gap-1 px-4 py-2 text-sm">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save pricing profile</button><Link href="/admin/pricing-profiles" className="text-sm text-slate-500 hover:text-green-700">Open Customer Pricing module</Link></div>
  </section>
}

function ReportsTab({ m }: { m: Row }) {
  return <div className="grid gap-5">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Total quotes" value={m?.totalQuotes ?? 0} />
      <Stat label="Accepted" value={m?.quotesAccepted ?? 0} />
      <Stat label="Rejected" value={m?.quotesRejected ?? 0} />
      <Stat label="Pending" value={m?.quotesPending ?? 0} />
      <Stat label="Total shipments" value={m?.totalShipments ?? 0} />
      <Stat label="Delivered" value={m?.shipmentsDelivered ?? 0} />
      <Stat label="Invoices" value={m?.totalInvoices ?? 0} sub={`${m?.finalizedInvoices ?? 0} finalized`} />
      <Stat label="Revenue" value={money(m?.revenue, m?.revenueCurrency)} sub="Finalized invoices only" />
    </div>
    <p className="text-xs text-slate-400">Figures are computed from this customer’s existing quotes, shipments and finalized invoices. Revenue counts finalized invoices only; draft invoices and unpriced records are excluded.</p>
  </div>
}
