'use client'
import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Link2, Search, Loader2, CheckCircle2, Globe, Phone, Mail, Building2 } from 'lucide-react'
import { toast } from 'sonner'

type Row = Record<string, any>

export function GuestLinkPanel({ quote, reload }: { quote: Row; reload: () => Promise<void> }) {
  const [users, setUsers] = useState<Row[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || users.length) return
    void fetch('/api/admin/users').then((r) => r?.json?.().catch?.(() => ({}))).then((d) => setUsers(d?.users ?? [])).catch((e: unknown) => console.error(e))
  }, [open])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users.slice(0, 8)
    return users.filter((u: Row) => [u?.name, u?.email, u?.billingLegalName, u?.billingTradingName, u?.billingTaxId].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q))).slice(0, 8)
  }, [users, search])

  const linked = Boolean(quote?.linkedToCustomerAt)

  async function link(mode: 'existing' | 'create', userId?: string) {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/quotes/${quote?.id ?? ''}/link-customer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, userId }) })
      const data = (await response?.json?.().catch?.(() => ({}))) ?? {}
      if (!response?.ok) throw new Error(data?.error ?? 'Unable to link customer.')
      toast?.success?.(mode === 'create' ? 'Customer created and linked to this quote.' : 'Quote linked to the selected customer.')
      setOpen(false)
      await reload()
    } catch (error: unknown) {
      console.error(error)
      toast?.error?.(error instanceof Error ? (error?.message ?? 'Unable to link customer.') : 'Unable to link customer.')
    } finally { setBusy(false) }
  }

  if (!quote?.isGuest) return null

  return (
    <div className="mt-6 rounded-xl border-2 border-dashed border-green-200 bg-green-50/40 p-5">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-green-700" />
        <h3 className="text-sm font-bold text-[#0A1628]">Guest request — Public Website</h3>
        <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Guest</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">Submitted without an account. Original contact details are preserved for audit even after linking.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <GuestInfo icon={UserPlus} label="Full name" value={quote?.guestName} />
        <GuestInfo icon={Building2} label="Company" value={quote?.guestCompany} />
        <GuestInfo icon={Phone} label="Phone" value={quote?.guestPhone} />
        <GuestInfo icon={Mail} label="Email" value={quote?.guestEmail} />
      </div>

      {linked ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-white p-4 text-sm text-slate-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <span>Linked to customer <strong>{quote?.user?.name ?? quote?.user?.email ?? 'account'}</strong>{quote?.user?.email ? <> ({quote?.user?.email})</> : null} on {String(quote?.linkedToCustomerAt ?? '').slice(0, 10)}. The guest contact details above are kept for history.</span>
        </div>
      ) : (
        <div className="mt-4">
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="btn-primary"><Link2 className="h-4 w-4" /> Link to Customer Master</button>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-[#0A1628]">Link this guest quote</h4>
                <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Cancel</button>
              </div>
              <button type="button" disabled={busy} onClick={() => link('create')} className="btn-secondary mt-3 w-full justify-start">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create a new customer from guest details
              </button>
              <p className="mt-1 text-[11px] text-slate-400">Creates {quote?.guestCompany ? 'a business customer' : 'a customer'} from the contact info above (skips if an account with this email already exists).</p>

              <div className="mt-4">
                <p className="label">Or link to an existing customer</p>
                <label className="relative mt-1 block">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input className="field h-10 w-full pl-9" value={search} onChange={(e) => setSearch(e?.target?.value ?? '')} placeholder="Search by name, email, legal name or tax id" />
                </label>
                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-100">
                  {filtered.length ? filtered.map((u: Row) => (
                    <button key={u?.id ?? ''} type="button" disabled={busy} onClick={() => link('existing', u?.id)} className="flex w-full items-center justify-between gap-2 border-b border-slate-50 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-slate-50">
                      <span><span className="font-semibold text-[#0A1628]">{u?.name ?? ''}</span><span className="block text-xs text-slate-400">{u?.email ?? ''}{u?.billingLegalName ? ` · ${u?.billingLegalName}` : ''}</span></span>
                      <Link2 className="h-4 w-4 shrink-0 text-green-600" />
                    </button>
                  )) : <p className="px-3 py-4 text-center text-xs text-slate-400">No matching customers.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GuestInfo({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-white p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="truncate text-sm font-medium text-[#0A1628]">{value || '—'}</p></div>
    </div>
  )
}
