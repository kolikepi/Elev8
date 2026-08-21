'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AlertTriangle, ArrowLeft, ArrowRight, Bot, Boxes, CheckCircle2, ClipboardCheck, FileText, Loader2, PackageSearch, Pencil, Save, Send, Sparkles, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { mapExtractedToForm, quotationMissing } from '@/lib/ai-quote'
import { customerServiceLabel } from '@/lib/customer-service-label'

type Msg = { role: 'user' | 'assistant'; content: string }
type Extracted = Record<string, any>
type DraftRow = { id: string; reference: string; serviceCategory?: string; updatedAt?: string; aiConversationJson?: any; draftJson?: any }

const WELCOME = 'Hi! I’m your ForwardOne shipment assistant. Describe what you’d like to ship in your own words — for example: “I need to send 3 boxes, about 40 kg, from Tirana to Milan for my business.” I’ll pull out the details and get your request ready. I never generate prices — those are always confirmed manually by our team.'
const PROMPTS = ['Send 2 parcels (15 kg) from Tirana to Munich', 'Ship a 300 kg pallet from Durres to Milan', 'Urgent documents from Tirana to London', 'Import 5 boxes of electronics from Germany']

const title = (v: string) => String(v ?? '').split('_').join(' ').replace(/\b\w/g, (c) => c.toUpperCase())

export function SmartQuoteBuilder({ initialDraftId = '' }: { initialDraftId?: string }) {
  const router = useRouter()
  const { data: session } = useSession() || {}
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState(''); const [busy, setBusy] = useState(false)
  const [extracted, setExtracted] = useState<Extracted>({}); const [recommendations, setRecommendations] = useState<any[]>([]); const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<'chat' | 'review'>('chat')
  const [draftId, setDraftId] = useState(initialDraftId ?? ''); const [savingDraft, setSavingDraft] = useState(false)
  const [submitting, setSubmitting] = useState(false); const [aiFailed, setAiFailed] = useState(false)
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const submissionToken = useRef<string>('')
  const scroller = useRef<HTMLDivElement | null>(null)
  useEffect(() => { scroller?.current?.scrollTo?.({ top: scroller?.current?.scrollHeight ?? 0, behavior: 'smooth' }) }, [messages, busy])

  // Load the customer's resumable AI drafts (only those saved from the assistant carry aiConversationJson).
  async function loadDrafts() {
    try {
      const response = await fetch('/api/quotes/draft'); const data = await response?.json?.().catch?.(() => ({})) ?? {}
      const list = (Array.isArray(data?.drafts) ? data?.drafts : []).filter((d: any) => d?.aiConversationJson && Array.isArray(d?.aiConversationJson?.messages) && d?.aiConversationJson?.messages?.length)
      setDrafts(list as DraftRow[])
    } catch (error: unknown) { console.error(error) }
  }
  useEffect(() => { void loadDrafts() }, [])

  // Resume a specific AI draft opened via ?draft=<id>.
  useEffect(() => {
    const id = initialDraftId ?? ''; if (!id) return
    void fetch('/api/quotes/draft').then((r) => r?.json?.().catch?.(() => ({}))).then((d) => {
      const found = (d?.drafts ?? []).find?.((x: any) => x?.id === id); const conv = found?.aiConversationJson
      if (conv && Array.isArray(conv?.messages) && conv?.messages?.length) {
        setMessages(conv?.messages as Msg[]); setExtracted(conv?.extracted ?? {}); setReady(Boolean(conv?.ready)); setDraftId(id)
        toast?.success?.('Draft resumed — continue where you left off.')
      }
    }).catch((e: unknown) => console.error(e))
  }, [initialDraftId])

  async function send(text: string) {
    const content = text?.trim?.() ?? ''
    if (!content || busy) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next); setInput(''); setBusy(true); setAiFailed(false)
    try {
      const response = await fetch('/api/ai/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) })
      const data = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(data?.error ?? 'The assistant is unavailable.')
      setMessages((current) => [...current, { role: 'assistant', content: String(data?.reply ?? 'Could you tell me a little more about your shipment?') }])
      setExtracted((current) => ({ ...current, ...(data?.extracted ?? {}) }))
      setRecommendations(Array.isArray(data?.recommendations) ? data?.recommendations : [])
      setReady(Boolean(data?.readyToQuote))
    } catch (error: unknown) { console.error(error); setAiFailed(true); toast?.error?.(error instanceof Error ? error?.message ?? 'The assistant is unavailable.' : 'The assistant is unavailable.'); setMessages((current) => [...current, { role: 'assistant', content: 'Sorry — I had trouble processing that. Your details so far are safe. You can try again, or continue in the standard form below without losing anything.' }]) } finally { setBusy(false) }
  }

  // Persist the AI draft (form + full conversation) to the database so it survives refresh, navigation,
  // device changes and session refresh. Returns the draft id (existing or newly created).
  async function persistDraft(silent = false): Promise<string> {
    const form = mapExtractedToForm(extracted)
    const payload = { id: draftId || undefined, form, aiConversation: { messages, extracted, ready } }
    const response = await fetch('/api/quotes/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response?.json?.().catch?.(() => ({})) ?? {}
    if (!response?.ok) throw new Error(data?.error ?? 'Unable to save draft.')
    const id = String(data?.draft?.id ?? draftId ?? '')
    if (id) setDraftId(id)
    if (!silent) { void loadDrafts() }
    return id
  }

  async function saveDraft() {
    setSavingDraft(true)
    try { await persistDraft(); toast?.success?.('Draft saved — resume it anytime from this assistant.') }
    catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Unable to save draft.' : 'Unable to save draft.') }
    finally { setSavingDraft(false) }
  }

  // Open the standard quote form pre-filled with everything collected. DB-backed draft is the primary
  // channel (survives refresh); sessionStorage is only a best-effort fallback if the save fails.
  async function editInStandardForm() {
    try { const id = await persistDraft(true); if (id) { router?.push?.(`/quote/new?draft=${id}`); return } } catch (error: unknown) { console.error(error) }
    try { window?.sessionStorage?.setItem?.('fwd_ai_prefill', JSON.stringify(extracted ?? {})) } catch (error: unknown) { console.error(error) }
    toast?.message?.('Opening the standard form with your details.')
    router?.push?.('/quote/new?from=assistant')
  }

  // Direct submission from the Review screen. Idempotent: one token per Review session guards against
  // double-click / refresh / retry creating duplicate quotes.
  async function submitDirect() {
    if (submitting) return
    const form = mapExtractedToForm(extracted)
    const missing = quotationMissing(form)
    if (missing.length) { toast?.error?.(`Please add: ${missing.join(', ')}.`); return }
    if (!submissionToken.current) submissionToken.current = (globalThis?.crypto?.randomUUID?.() ?? `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    setSubmitting(true)
    try {
      const payload = JSON.stringify({ ...form, draftId: draftId || undefined, submissionToken: submissionToken.current })
      let response: Response | null = null
      for (let attempt = 0; attempt < 2; attempt++) { try { response = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }); break } catch (netErr) { if (attempt === 1) throw new Error('Network error — please check your connection and try again.'); await new Promise((r) => setTimeout(r, 1500)) } }
      if (!response) throw new Error('Network error — please try again.')
      const result = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(result?.error ?? 'Unable to submit your request.')
      toast?.success?.(`Request ${result?.quote?.reference ?? ''} submitted — our team will prepare your quotation.`)
      const base = session?.user?.role === 'BUSINESS_CUSTOMER' ? '/business' : '/customer'
      router?.push?.(`${base}/quotes/${result?.quote?.id ?? ''}`)
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Unable to submit your request.' : 'Unable to submit your request.'); setSubmitting(false) }
  }

  async function resumeDraft(d: DraftRow) {
    const conv = d?.aiConversationJson
    if (conv && Array.isArray(conv?.messages) && conv?.messages?.length) {
      setMessages(conv?.messages as Msg[]); setExtracted(conv?.extracted ?? {}); setReady(Boolean(conv?.ready)); setDraftId(d?.id ?? ''); setMode('chat'); setAiFailed(false)
      toast?.success?.('Draft resumed.')
    }
  }
  async function deleteDraft(id: string) {
    try { const response = await fetch(`/api/quotes/draft?id=${id}`, { method: 'DELETE' }); if (!response?.ok) throw new Error('Unable to delete draft.'); if (id === draftId) setDraftId(''); void loadDrafts(); toast?.success?.('Draft deleted.') }
    catch (error: unknown) { console.error(error); toast?.error?.('Unable to delete draft.') }
  }

  const form = useMemo(() => mapExtractedToForm(extracted), [extracted])
  const missingMandatory = useMemo(() => quotationMissing(form), [form])

  if (mode === 'review') return <ReviewQuote form={form} extracted={extracted} recommendations={recommendations} missing={missingMandatory} submitting={submitting} onBack={() => setMode('chat')} onEdit={editInStandardForm} onSubmit={submitDirect} />

  const fields = fieldList(extracted)
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
    <section className="flex h-[640px] flex-col overflow-hidden rounded-xl bg-white shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50"><Sparkles className="h-5 w-5 text-green-600" /></span><div><h2 className="font-bold text-[#0A1628]">Smart Quote Builder</h2><p className="text-xs text-slate-500">Conversational shipment intake · no prices generated</p></div></div>
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages?.map?.((m, index) => <div key={index} className={`flex gap-3 ${m?.role === 'user' ? 'flex-row-reverse' : ''}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m?.role === 'user' ? 'bg-[#0A1628] text-white' : 'bg-green-100 text-green-700'}`}>{m?.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</span><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${m?.role === 'user' ? 'bg-[#0A1628] text-white' : 'bg-slate-100 text-slate-700'}`}>{m?.content ?? ''}</div></div>) ?? null}
        {busy ? <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"><Bot className="h-4 w-4" /></span><div className="rounded-2xl bg-slate-100 px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div></div> : null}
        {aiFailed ? <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Assistant interrupted</div><p className="mt-1 leading-5">Your details are saved. Retry your message, or continue in the standard form — it will be pre-filled with everything gathered so far.</p><button onClick={editInStandardForm} className="btn-secondary mt-2 h-8 text-xs">Continue in standard form <ArrowRight className="h-3.5 w-3.5" /></button></div> : null}
      </div>
      {messages?.length <= 1 && drafts?.length ? <div className="border-t border-slate-100 px-5 py-3"><p className="mb-2 text-xs font-semibold text-slate-500">Resume a saved draft</p><div className="grid gap-2">{drafts?.map?.((d) => <div key={d?.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><button onClick={() => resumeDraft(d)} className="flex-1 text-left"><span className="font-semibold text-[#0A1628]">{d?.serviceCategory ? title(String(d?.serviceCategory)) : 'Shipment'}</span><span className="ml-2 text-xs text-slate-400">{d?.reference}</span></button><button onClick={() => deleteDraft(d?.id ?? '')} className="text-slate-400 transition hover:text-red-600" aria-label="Delete draft"><Trash2 className="h-4 w-4" /></button></div>) ?? null}</div></div> : null}
      {messages?.length <= 1 ? <div className="flex flex-wrap gap-2 px-5 pb-3">{PROMPTS?.map?.((p) => <button key={p} onClick={() => send(p)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-green-500 hover:text-green-700">{p}</button>) ?? null}</div> : null}
      <form onSubmit={(e) => { e?.preventDefault?.(); void send(input) }} className="flex items-center gap-2 border-t border-slate-100 p-4"><input value={input} onChange={(e) => setInput(e?.target?.value ?? '')} placeholder="Describe your shipment…" className="field h-11" disabled={busy} /><button type="submit" disabled={busy || !input?.trim?.()} className="btn-primary h-11 px-4 disabled:opacity-50"><Send className="h-4 w-4" /></button></form>
    </section>
    <aside className="grid content-start gap-5">
      <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2"><PackageSearch className="h-5 w-5 text-green-600" /><h3 className="font-bold text-[#0A1628]">Extracted details</h3></div><div className="mt-4 grid gap-2.5">{fields?.length ? fields.map((f) => <div key={f?.label} className="flex items-start justify-between gap-3 text-sm"><span className="text-slate-500">{f?.label}</span><span className="text-right font-semibold text-[#0A1628]">{f?.value}</span></div>) : <p className="text-sm text-slate-400">Details will appear here as you chat.</p>}</div>{extracted?.dangerousGoods ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4" /> Dangerous goods — extra documentation required.</div> : null}</div>
      {Array.isArray(extracted?.pieceRows) && extracted?.pieceRows?.length ? <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2"><Boxes className="h-5 w-5 text-green-600" /><h3 className="font-bold text-[#0A1628]">Packages</h3></div><div className="mt-3 grid gap-2">{extracted?.pieceRows?.map?.((p: any, i: number) => <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex items-center justify-between"><span className="font-semibold text-[#0A1628]">{p?.quantity ?? 1} × {title(String(p?.packageType ?? 'BOX'))}</span>{p?.weight ? <span className="text-xs font-medium text-green-700">{p?.weight} kg each</span> : null}</div>{(p?.length || p?.width || p?.height) ? <p className="mt-0.5 text-xs text-slate-500">{[p?.length, p?.width, p?.height].map((d: any) => d || '?').join(' × ')} cm</p> : null}{p?.description ? <p className="mt-0.5 text-xs text-slate-400">{p?.description}</p> : null}</div>) ?? null}</div></div> : null}
      {Array.isArray(extracted?.requiredDocuments) && extracted?.requiredDocuments?.length ? <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-green-600" /><h3 className="font-bold text-[#0A1628]">Required documents</h3></div><ul className="mt-3 grid gap-2">{extracted?.requiredDocuments?.map?.((d: string) => <li key={d} className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 className="h-4 w-4 text-green-500" />{d}</li>) ?? null}</ul></div> : null}
      {recommendations?.length ? <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-green-600" /><h3 className="font-bold text-[#0A1628]">Recommended service</h3></div><div className="mt-3 grid gap-3">{recommendations?.map?.((r: any) => <div key={r?.name} className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-bold text-[#0A1628]">{customerServiceLabel(r?.carrier, r?.name)}</p><p className="mt-1 text-xs leading-5 text-slate-500">{r?.reason}</p></div>) ?? null}</div></div> : null}
      {!ready && (fields?.length > 0 || missingMandatory?.length > 0) && missingMandatory?.length ? <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Still needed to continue</div><ul className="mt-1.5 grid gap-1">{missingMandatory?.map?.((m) => <li key={m} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{title(m)}</li>) ?? null}</ul><p className="mt-1.5 leading-5">Tell the assistant these details, or use “Edit Shipment Details” to add them in the form.</p></div> : null}
      <div className="grid gap-2">
        <button onClick={() => setMode('review')} disabled={!ready} className="btn-primary w-full disabled:opacity-50">{ready ? 'Continue to Review Quote' : 'Add more details to continue'} <ArrowRight className="h-4 w-4" /></button>
        <button onClick={editInStandardForm} disabled={!extracted?.serviceCategory && !extracted?.weightKg && !extracted?.pieces} className="btn-secondary w-full disabled:opacity-50"><Pencil className="h-4 w-4" /> Edit Shipment Details</button>
        <button onClick={saveDraft} disabled={savingDraft} className="btn-secondary w-full disabled:opacity-50">{savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft</button>
      </div>
      <p className="text-center text-xs leading-5 text-slate-400">You’ll be able to review and edit everything before submitting for manual review.</p>
    </aside>
  </div>
}

// ---- Review Quote screen -------------------------------------------------------------------------
function ReviewQuote({ form, extracted, recommendations, missing, submitting, onBack, onEdit, onSubmit }: { form: Record<string, any>; extracted: Extracted; recommendations: any[]; missing: string[]; submitting: boolean; onBack: () => void; onEdit: () => void; onSubmit: () => void }) {
  const road = String(form?.serviceCategory ?? '').toUpperCase() === 'ROAD_FREIGHT'
  const rows = Array.isArray(form?.pieceRows) ? form?.pieceRows : []
  const totalPieces = rows.reduce((s: number, r: any) => s + (Number(r?.quantity) || 0), 0)
  const mandatory: Array<{ label: string; value: string }> = []
  const optional: Array<{ label: string; value: string }> = []
  const push = (arr: Array<{ label: string; value: string }>, label: string, value: unknown) => { const v = value === null || value === undefined ? '' : String(value); if (v.trim() !== '') arr.push({ label, value: v }) }
  push(mandatory, 'Service category', form?.serviceCategory ? title(String(form?.serviceCategory)) : '')
  push(mandatory, 'Direction', form?.direction ? title(String(form?.direction)) : '')
  push(mandatory, 'Origin', [form?.sender?.city, form?.sender?.country].filter(Boolean).join(', '))
  push(mandatory, 'Destination', [form?.receiver?.city, form?.receiver?.country].filter(Boolean).join(', '))
  push(mandatory, 'Receiver name', form?.receiver?.name)
  push(mandatory, 'Contents', form?.contentsType ? title(String(form?.contentsType)) : '')
  push(mandatory, 'Total pieces', totalPieces || form?.pieces)
  push(mandatory, 'Total weight', form?.weightKg ? `${form?.weightKg} kg` : '')
  if (road) { push(mandatory, 'Loading contact', form?.sender?.name); push(mandatory, 'Loading address', [form?.sender?.address, form?.sender?.city, form?.sender?.country].filter(Boolean).join(', ')); push(mandatory, 'Delivery address', [form?.receiver?.address, form?.receiver?.city, form?.receiver?.country].filter(Boolean).join(', ')) }

  push(optional, 'Origin postal code', form?.sender?.postalCode)
  push(optional, 'Destination postal code', form?.receiver?.postalCode)
  push(optional, 'Ready / pickup date', form?.pickupDate)
  push(optional, 'Goods description', form?.goodsDescription)
  if (form?.isCommercial) { push(optional, 'Declared value', form?.commercialValue ? `${form?.commercialValue} ${form?.currency ?? 'EUR'}` : ''); push(optional, 'Trade term', form?.incoterms) }
  push(optional, 'Shipment purpose', form?.isCommercial ? 'Commercial' : (extracted?.shipmentPurpose ? title(String(extracted?.shipmentPurpose)) : ''))
  push(optional, 'Sender company', form?.sender?.company); push(optional, 'Sender phone', form?.sender?.phone); push(optional, 'Sender email', form?.sender?.email)
  push(optional, 'Receiver company', form?.receiver?.company); push(optional, 'Receiver phone', form?.receiver?.phone); push(optional, 'Receiver email', form?.receiver?.email)
  push(optional, 'Preferred service (optional)', form?.customerCarrierPreference ? customerServiceLabel(form?.customerCarrierPreference) : '')
  if (form?.dangerousGoods) { push(optional, 'Dangerous goods', 'Yes'); push(optional, 'UN number', form?.unNumber); push(optional, 'DG class', form?.dangerousGoodsClass) }
  push(optional, 'Special instructions', form?.specialInstructions)

  const docs = Array.isArray(extracted?.requiredDocuments) ? extracted?.requiredDocuments : []
  return <div className="mx-auto max-w-3xl">
    <button onClick={onBack} className="btn-secondary mb-5 h-9 text-sm"><ArrowLeft className="h-4 w-4" /> Back to assistant</button>
    <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-md)] sm:p-8">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50"><ClipboardCheck className="h-5 w-5 text-green-600" /></span><div><p className="section-kicker">Review your request</p><h2 className="text-2xl font-bold tracking-tight text-[#0A1628]">Review Quote</h2></div></div>
      <p className="mt-2 text-sm text-slate-500">Check everything below before submitting. No price is shown — a ForwardOne specialist prepares every quotation manually after reviewing your request.</p>

      {missing?.length ? <div className="mt-5 flex gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">A few mandatory details are still needed</p><p className="mt-0.5 leading-5">Please add: {missing.join(', ')}. Use “Edit Quote” to complete them.</p></div></div> : null}

      <section className="mt-6"><h3 className="text-xs font-bold uppercase tracking-wide text-green-700">Mandatory quotation info</h3><div className="mt-3 grid gap-2.5 sm:grid-cols-2">{mandatory?.map?.((f) => <div key={f?.label} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><p className="text-xs text-slate-500">{f?.label}</p><p className="font-semibold text-[#0A1628]">{f?.value}</p></div>) ?? null}</div></section>

      {rows?.length ? <section className="mt-6"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Packages</h3><div className="mt-3 grid gap-2">{rows?.map?.((p: any, i: number) => <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-[#0A1628]">{p?.quantity ?? 1} × {title(String(p?.packageType ?? 'BOX'))}</span><span className="text-xs text-slate-500">{[p?.length, p?.width, p?.height].every((d: any) => !d) ? 'dimensions to confirm' : [p?.length, p?.width, p?.height].map((d: any) => d || '?').join(' × ') + ' cm'}{p?.weight ? ` · ${p?.weight} kg ea` : ''}</span></div>) ?? null}</div></section> : null}

      {optional?.length ? <section className="mt-6"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Optional info</h3><div className="mt-3 grid gap-2.5 sm:grid-cols-2">{optional?.map?.((f) => <div key={f?.label} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><p className="text-xs text-slate-500">{f?.label}</p><p className="font-semibold text-[#0A1628]">{f?.value}</p></div>) ?? null}</div></section> : null}

      {recommendations?.length ? <section className="mt-6"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Suggested service <span className="font-normal normal-case text-slate-400">(final choice confirmed by ForwardOne)</span></h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{recommendations?.map?.((r: any) => <div key={r?.name} className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-bold text-[#0A1628]">{customerServiceLabel(r?.carrier, r?.name)}</p></div>) ?? null}</div></section> : null}

      <section className="mt-6 rounded-lg border border-dashed border-slate-200 p-4"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><FileText className="h-4 w-4" /> Required only after you accept the quotation</h3><ul className="mt-2 grid gap-1.5 text-sm text-slate-600">{docs?.length ? docs?.map?.((d: string) => <li key={d} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" />{d}</li>) : <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" />Customs & shipping documents</li>}<li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" />Final carrier &amp; service selected by ForwardOne</li><li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" />Pickup scheduling &amp; collection details</li></ul></section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <button onClick={onEdit} className="btn-secondary"><Pencil className="h-4 w-4" /> Edit Quote</button>
        <button onClick={onSubmit} disabled={submitting || Boolean(missing?.length)} className="btn-primary disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Submit Quote Request</button>
      </div>
    </div>
  </div>
}

function fieldList(e: Extracted): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = []
  const push = (label: string, value: unknown) => { if (value !== null && value !== undefined && String(value).trim() !== '') out.push({ label, value: String(value) }) }
  push('Service', e?.serviceCategory ? title(String(e?.serviceCategory)) : null)
  push('Direction', e?.direction ? title(String(e?.direction)) : null)
  if (e?.originCity || e?.originCountry) push('Origin', [e?.originCity, e?.originCountry].filter(Boolean).join(', '))
  if (e?.destCity || e?.destCountry) push('Destination', [e?.destCity, e?.destCountry].filter(Boolean).join(', '))
  push('Contents', e?.contentsType ? title(String(e?.contentsType)) : null)
  push('Pieces', e?.pieces)
  push('Weight', e?.weightKg ? `${e?.weightKg} kg` : null)
  push('Purpose', e?.shipmentPurpose ? title(String(e?.shipmentPurpose)) : null)
  push('Declared value', e?.commercialValue ? `€${e?.commercialValue}` : null)
  push('Goods', e?.goodsDescription)
  push('Receiver', e?.receiverName)
  return out
}
