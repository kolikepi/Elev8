'use client'

import { useEffect, useState } from 'react'
import { Building2, Loader2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type Row = any

const FIELDS: { key: string; label: string; hint?: string; area?: boolean }[] = [
  { key: 'legalName', label: 'Legal company name' },
  { key: 'taxId', label: 'NIPT / Tax ID' },
  { key: 'registeredAddress', label: 'Registered address', area: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'bankName', label: 'Bank name' },
  { key: 'bankAccount', label: 'Bank account number' },
  { key: 'iban', label: 'IBAN' },
  { key: 'swift', label: 'SWIFT / BIC' },
  { key: 'currency', label: 'Default currency', hint: 'e.g. EUR, USD, GBP, ALL' },
  { key: 'vatNumber', label: 'VAT number' },
  { key: 'vatInfo', label: 'VAT note (shown on invoice)', hint: 'Informational text only — does not change totals', area: true },
  { key: 'defaultVatPct', label: 'Default VAT rate (%)', hint: 'Applied to new invoices. Leave 0 if no VAT.' },
  { key: 'paymentTermsDays', label: 'Payment terms (days)', hint: 'e.g. 30 for Net 30. Leave 0 for no due date.' },
  { key: 'logoUrl', label: 'Company logo URL' },
  { key: 'footerNote', label: 'Invoice footer note', area: true },
]

export function CompanyProfileAdmin() {
  const [values, setValues] = useState<Row>({})
  const [missing, setMissing] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/company-profile')
      const d = await r.json().catch(() => ({}))
      setValues(d?.row ?? d?.profile ?? {})
      setMissing(d?.missing ?? [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function save() {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/company-profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error ?? 'Unable to save.')
      setMissing(d?.missing ?? [])
      toast?.success?.('Company & billing profile saved.')
    } catch (e: unknown) { console.error(e); toast?.error?.(e instanceof Error ? e.message : 'Unable to save.') } finally { setBusy(false) }
  }

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-green-600"/></div>

  return <div className="mx-auto max-w-3xl">
    <section className="rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-green-600"/><h2 className="font-bold text-[#0A1628]">Company &amp; billing profile</h2></div>
      <p className="mt-1 text-sm text-slate-500">These details appear on every invoice (browser preview, print and PDF). Fill in your real legal, contact and bank details for a valid invoice. Internal cost, margin and carrier data are never shown to customers.</p>
      {missing.length > 0
        ? <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span><strong>Still to configure for a fully legal invoice:</strong> {missing.join(', ')}.</span></div>
        : <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/><span>All required invoice fields are configured.</span></div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => <label key={f.key} className={f.area ? 'sm:col-span-2 block' : 'block'}>
          <span className="label">{f.label}</span>
          {f.area
            ? <textarea className="field min-h-20 py-2" value={values?.[f.key] ?? ''} onChange={(e) => setValues((v: Row) => ({ ...v, [f.key]: e?.target?.value ?? '' }))} />
            : <input className="field" value={values?.[f.key] ?? ''} onChange={(e) => setValues((v: Row) => ({ ...v, [f.key]: e?.target?.value ?? '' }))} />}
          {f.hint ? <span className="mt-1 block text-[11px] text-slate-400">{f.hint}</span> : null}
        </label>)}
      </div>
      <button type="button" disabled={busy} onClick={save} className="btn-primary mt-6">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>} Save profile</button>
    </section>
  </div>
}
