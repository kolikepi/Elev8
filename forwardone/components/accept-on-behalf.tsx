'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

type Row = any
const SOURCES = [['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['PHONE', 'Phone']]

function money(value: unknown) { const n = Number(value ?? 0); return Number.isFinite(n) ? n.toFixed(2) : '0.00' }
function curSym(currency?: string) { return currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'ALL' ? 'L' : '€' }

// Admin accepts a quotation ON BEHALF OF the customer after they confirmed an offer externally
// (WhatsApp / email / phone). Reuses the exact same acceptance path as the customer decision, and adds an
// audit trail (who confirmed, when, source, reference/note). Shown only while the current quotation head is
// SENT/APPROVED and not yet accepted; once accepted it renders a read-only audit block.
export function AcceptOnBehalf({ quote, reload }: { quote: Row; reload: () => Promise<void> | void }) {
  const currentStatus = String(quote?.adminQuotation?.status ?? '')
  const canAccept = ['SENT', 'APPROVED'].includes(currentStatus) && quote?.status !== 'ACCEPTED' && quote?.status !== 'BOOKED'
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('WHATSAPP')
  const [optionId, setOptionId] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const options = useMemo(() => (Array.isArray(quote?.quoteOptions) ? quote?.quoteOptions : []) as Row[], [quote?.quoteOptions])
  const currency = quote?.adminQuotation?.currency ?? 'EUR'

  async function accept() {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/quotes/${quote?.id ?? ''}/accept-on-behalf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, optionId: optionId || undefined, reference, note }) })
      const data = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(data?.error ?? 'Unable to accept on behalf of the customer.')
      toast?.success?.('Quotation accepted on behalf of the customer. You can now book the shipment.')
      setOpen(false)
      await reload()
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Unable to accept.' : 'Unable to accept.') } finally { setBusy(false) }
  }

  if (quote?.acceptedOnBehalf) {
    return <div className="mt-6 rounded-xl border border-green-200 bg-green-50/60 p-5">
      <h3 className="flex items-center gap-2 font-bold text-[#0A1628]"><ShieldCheck className="h-4 w-4 text-green-600" /> Accepted on behalf of the customer</h3>
      <p className="mt-1 text-xs text-slate-500">This quotation was confirmed by the customer externally and accepted on their behalf. Audit trail below.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Info l="Confirmed via" v={String(quote?.acceptanceSource ?? '—').replace('_', ' ')} />
        <Info l="Accepted at" v={quote?.acceptedOnBehalfAt ? new Date(quote?.acceptedOnBehalfAt).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC' : '—'} />
        <Info l="Confirmation reference" v={quote?.acceptanceReference || '—'} />
        <Info l="Accepted by (admin)" v={quote?.acceptedByAdmin?.name || quote?.acceptedByAdmin?.email || quote?.acceptedByAdminId || '—'} />
        {quote?.acceptanceNote ? <div className="sm:col-span-2"><Info l="Note" v={quote?.acceptanceNote} /></div> : null}
      </div>
    </div>
  }

  if (!canAccept) return null

  return <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)]">
    <h3 className="flex items-center gap-2 font-bold text-[#0A1628]"><CheckCircle2 className="h-4 w-4 text-green-600" /> Accept on behalf of customer</h3>
    <p className="mt-1 text-xs text-slate-500">Use this only when the customer has confirmed a specific offer externally (WhatsApp, email or phone). This records who confirmed it, when and how, then unlocks booking — exactly like a customer acceptance.</p>
    {!open ? <button type="button" onClick={() => setOpen(true)} className="btn-primary mt-4"><CheckCircle2 className="h-4 w-4" /> Record customer acceptance</button> : <div className="mt-4 grid gap-4">
      {(options?.length ?? 0) > 0 ? <label><span className="label">Which offer did the customer accept?</span><select className="field" value={optionId} onChange={(e) => setOptionId(e?.target?.value ?? '')}><option value="">Primary offer ({curSym(currency)}{money(quote?.adminQuotation?.finalPrice)})</option>{options.map((o: Row) => <option key={o?.id ?? ''} value={o?.id ?? ''}>{[o?.serviceName, o?.transitTime].filter(Boolean).join(' · ') || 'Offer'} — {curSym(o?.currency ?? currency)}{money(o?.sellingPrice)}</option>)}</select></label> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Confirmation source *</span><select className="field" value={source} onChange={(e) => setSource(e?.target?.value ?? 'WHATSAPP')}>{SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label><span className="label">Confirmation reference <span className="font-normal text-slate-400">(optional)</span></span><input className="field" value={reference} onChange={(e) => setReference(e?.target?.value ?? '')} placeholder="e.g. WhatsApp msg, email subject" /></label>
      </div>
      <label><span className="label">Note <span className="font-normal text-slate-400">(optional)</span></span><textarea className="field min-h-20 py-3" value={note} onChange={(e) => setNote(e?.target?.value ?? '')} placeholder="Any detail about how the customer confirmed..." /></label>
      <div className="flex gap-3"><button type="button" disabled={busy} onClick={accept} className="btn-primary disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm acceptance</button><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button></div>
    </div>}
  </div>
}

function Info({ l, v }: { l: string; v: string }) { return <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</span><p className="mt-0.5 text-sm font-semibold text-[#0A1628]">{v}</p></div> }
