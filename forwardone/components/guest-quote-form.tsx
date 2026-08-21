'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ArrowRight, Boxes, Check, ChevronsUpDown, Loader2, Mail, MapPin, Package, Phone, Plane, ShieldCheck, Ship, Sparkles, Truck, UserRound, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { suggestServices } from '@/lib/service-suggestion'
import { PieceBuilder, emptyPiece } from '@/components/piece-builder'
import { calcShipment, resolveDivisor, type PieceInput } from '@/lib/piece-calc'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

type Party = { name: string; company: string; address: string; country: string; city: string; postalCode: string; phone: string; email: string }
type Contact = { fullName: string; companyName: string; phone: string; email: string }
type LocOpt = { id: string; name: string }
type CustSvc = { id: string; name: string; category: string; transitTime?: string }
type FormState = { serviceCategory: string; carrierServiceId: string; serviceName: string; direction: string; contentsType: string; sender: Party; receiver: Party; pickupDate: string; specialInstructions: string; goodsDescription: string; isCommercial: boolean; pieceRows: PieceInput[]; commercialValue: string; incoterms: string; dangerousGoods: boolean; unNumber: string; dangerousGoodsClass: string }

const emptyParty: Party = { name: '', company: '', address: '', country: '', city: '', postalCode: '', phone: '', email: '' }
const CATEGORIES = [
  { key: 'EXPRESS', label: 'Express Courier', icon: Zap, desc: 'Fast door-to-door parcels & documents.' },
  { key: 'ROAD_FREIGHT', label: 'Road Freight', icon: Truck, desc: 'Groupage, LTL, FTL & pallet across Europe.' },
  { key: 'AIR_FREIGHT', label: 'Air Freight', icon: Plane, desc: 'Fast airport-to-airport / door air cargo.' },
  { key: 'SEA_FREIGHT', label: 'Sea Freight', icon: Ship, desc: 'Container & LCL ocean freight.', comingSoon: true },
]
const STEPS = ['Contact', 'Service & route', 'Shipment', 'Review']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function GuestQuoteForm() {
  const router = useRouter()
  const [step, setStep] = useState(1); const [submitting, setSubmitting] = useState(false)
  const [customerServices, setCustomerServices] = useState<CustSvc[]>([])
  const [volumetricRules, setVolumetricRules] = useState<Array<Record<string, any>>>([]); const [restrictions, setRestrictions] = useState<Array<Record<string, any>>>([])
  const [countries, setCountries] = useState<LocOpt[]>([])
  const [contact, setContact] = useState<Contact>({ fullName: '', companyName: '', phone: '', email: '' })
  const [form, setForm] = useState<FormState>({ serviceCategory: '', carrierServiceId: '', serviceName: '', direction: 'EXPORT', contentsType: 'PARCEL', sender: { ...emptyParty }, receiver: { ...emptyParty }, pickupDate: '', specialInstructions: '', goodsDescription: '', isCommercial: false, pieceRows: [{ ...emptyPiece }], commercialValue: '', incoterms: 'DAP', dangerousGoods: false, unNumber: '', dangerousGoodsClass: '' })

  const divisor = useMemo(() => resolveDivisor(volumetricRules, { serviceCategory: form?.serviceCategory, carrier: '' }), [volumetricRules, form?.serviceCategory])
  const shipment = useMemo(() => calcShipment(form?.pieceRows ?? [], divisor), [form?.pieceRows, divisor])
  const suggestions = useMemo(() => suggestServices(form?.contentsType ?? '', Number(shipment?.totals?.actualWeight ?? 0), form?.serviceCategory ?? ''), [form?.contentsType, shipment?.totals?.actualWeight, form?.serviceCategory])
  const isRoad = form?.serviceCategory === 'ROAD_FREIGHT'; const isSea = form?.serviceCategory === 'SEA_FREIGHT'; const isExpressLike = form?.serviceCategory === 'EXPRESS' || form?.serviceCategory === 'AIR_FREIGHT'

  // Prefill from the homepage Quick Quote entry (from / to / type / weight). Free-text friendly:
  // country fields accept free text, service category is validated, weight seeds the first piece row.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window?.location?.search ?? '')
      const from = sp.get('from')?.trim() ?? ''; const to = sp.get('to')?.trim() ?? ''
      const type = sp.get('type')?.trim() ?? ''; const weight = sp.get('weight')?.trim() ?? ''
      const validTypes = ['EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT']
      if (!from && !to && !type && !weight) return
      setForm((c) => {
        const base = c ?? form; const next = { ...base }
        if (from) next.sender = { ...base.sender, country: from }
        if (to) next.receiver = { ...base.receiver, country: to }
        if (type && validTypes.includes(type)) next.serviceCategory = type
        if (weight && Number(weight) > 0) { const rows = base.pieceRows?.length ? [...base.pieceRows] : [{ ...emptyPiece }]; rows[0] = { ...rows[0], weight }; next.pieceRows = rows }
        return next
      })
    } catch { /* no-op */ }
  }, [])

  useEffect(() => { void fetch('/api/public/quote-meta').then((r) => r?.json?.().catch?.(() => ({}))).then((d) => { setCountries(((d?.countries ?? []) as Array<Record<string, any>>).map((c) => ({ id: String(c?.id ?? ''), name: String(c?.name ?? '') })).filter((c) => c?.name) as LocOpt[]); setCustomerServices((d?.customerServices ?? []) as CustSvc[]); setVolumetricRules((d?.volumetricRules ?? []) as Array<Record<string, any>>); setRestrictions((d?.restrictions ?? []) as Array<Record<string, any>>) }).catch((e: unknown) => console.error(e)) }, [])

  const update = (key: keyof FormState, value: FormState[keyof FormState]) => setForm((current) => ({ ...(current ?? form), [key]: value }))
  const updateParty = (side: 'sender' | 'receiver', key: keyof Party, value: string) => setForm((current) => ({ ...(current ?? form), [side]: { ...(current?.[side] ?? emptyParty), [key]: value ?? '' } }))
  const updatePieceRows = (next: PieceInput[]) => setForm((current) => ({ ...(current ?? form), pieceRows: Array.isArray(next) && next.length ? next : [{ ...emptyPiece }] }))
  function pickCategory(key: string) { if (key === form?.serviceCategory) return; setForm((c) => ({ ...(c ?? form), serviceCategory: key, carrierServiceId: '', serviceName: '' })) }
  function pickCustomerService(id: string) { const cs = customerServices?.find?.((c) => c?.id === id); setForm((c) => ({ ...(c ?? form), carrierServiceId: id, serviceName: cs?.name ?? '' })) }

  function canContinue() {
    if (step === 1) { const hasName = Boolean(contact?.fullName?.trim() || contact?.companyName?.trim()); return hasName && Boolean(contact?.phone?.trim()) && EMAIL_RE.test(contact?.email?.trim() ?? '') }
    if (step === 2) { if (!form?.serviceCategory) return false; if (isSea) return Boolean(form?.sender?.country && form?.receiver?.country); if (isRoad) return Boolean(form?.sender?.name && form?.sender?.address && form?.sender?.country && form?.sender?.city && form?.receiver?.name && form?.receiver?.address && form?.receiver?.country && form?.receiver?.city); return Boolean(form?.sender?.country && form?.receiver?.name && form?.receiver?.country && form?.receiver?.city) }
    if (step === 3) { if (!((shipment?.totals?.actualWeight ?? 0) > 0 && (shipment?.totals?.totalPieces ?? 0) > 0)) return false; return !form?.dangerousGoods || Boolean(form?.unNumber && form?.dangerousGoodsClass) }
    return true
  }
  function next() { if (!canContinue()) { toast?.error?.('Complete the required fields before continuing.'); return } setStep((value) => Math.min(4, value + 1)) }

  async function submit() {
    setSubmitting(true)
    try {
      const payload = JSON.stringify({
        contact: { fullName: contact?.fullName?.trim(), companyName: contact?.companyName?.trim(), phone: contact?.phone?.trim(), email: contact?.email?.trim() },
        serviceCategory: form?.serviceCategory, customerCarrierPreference: form?.serviceName || undefined, direction: form?.direction, contentsType: form?.contentsType,
        sender: form?.sender, receiver: form?.receiver, pickupDate: form?.pickupDate || undefined,
        goodsDescription: form?.goodsDescription, isCommercial: form?.isCommercial, commercialValue: form?.commercialValue, incoterms: form?.incoterms,
        dangerousGoods: form?.dangerousGoods, unNumber: form?.unNumber, dangerousGoodsClass: form?.dangerousGoodsClass, specialInstructions: form?.specialInstructions,
        pieceRows: form?.pieceRows, pieces: shipment?.totals?.totalPieces ?? 1, weightKg: String(shipment?.totals?.actualWeight ?? 0),
      })
      let response: Response | null = null
      for (let attempt = 0; attempt < 2; attempt++) { try { response = await fetch('/api/public/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }); break } catch { if (attempt === 1) throw new Error('Network error — please check your connection and try again.'); await new Promise((r) => setTimeout(r, 1500)) } }
      if (!response) throw new Error('Network error — please try again.')
      const result = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(result?.error ?? 'Unable to submit your request.')
      const ref = String(result?.reference ?? ''); const email = String(result?.email ?? contact?.email ?? '')
      router?.push?.(`/quote/guest/success?ref=${encodeURIComponent(ref)}&email=${encodeURIComponent(email)}`)
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Unable to submit your request.' : 'Unable to submit your request.') } finally { setSubmitting(false) }
  }

  const catCustomerServices = customerServices?.filter?.((c) => c?.category === form?.serviceCategory) ?? []

  return <div className="grid gap-6">
    <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2">{STEPS?.map?.((label, index) => { const n = index + 1; return <div key={label ?? ''} className="flex flex-1 items-center gap-2"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step >= n ? 'bg-[#16A34A] text-white' : 'bg-slate-100 text-slate-400'}`}>{step > n ? <Check className="h-4 w-4" /> : n}</span><span className={`hidden text-xs font-semibold sm:block ${step >= n ? 'text-[#0A1628]' : 'text-slate-400'}`}>{label ?? ''}</span>{n < 4 ? <span className="h-px flex-1 bg-slate-200" /> : null}</div> }) ?? null}</div></div>

    <section className="rounded-xl bg-white p-5 shadow-[var(--shadow-md)] sm:p-7">
      {step === 1 ? <div><StepTitle icon={UserRound} title="Your contact details" text="So our team can send you the reviewed quotation and follow up. No account needed." />
        <div className="grid gap-5 sm:grid-cols-2">
          <label><span className="label">Full name</span><input className="field" value={contact?.fullName ?? ''} onChange={(e) => setContact((c) => ({ ...c, fullName: e?.target?.value ?? '' }))} placeholder="e.g. Jane Doe" /></label>
          <label><span className="label">Company name</span><input className="field" value={contact?.companyName ?? ''} onChange={(e) => setContact((c) => ({ ...c, companyName: e?.target?.value ?? '' }))} placeholder="e.g. Acme Ltd" /></label>
          <label><span className="label flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-green-600" /> Phone number *</span><input className="field" value={contact?.phone ?? ''} onChange={(e) => setContact((c) => ({ ...c, phone: e?.target?.value ?? '' }))} placeholder="+355 ..." /></label>
          <label><span className="label flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-green-600" /> Email *</span><input className="field" type="email" value={contact?.email ?? ''} onChange={(e) => setContact((c) => ({ ...c, email: e?.target?.value ?? '' }))} placeholder="you@company.com" /></label>
        </div>
        <p className="mt-4 text-xs text-slate-500">Provide a <strong>full name and/or company name</strong>. Phone number and email are required so we can reach you with your quotation.</p>
      </div> : null}

      {step === 2 ? <div><StepTitle icon={Package} title="Service & route" text="Pick a transport service, then tell us where the shipment goes." />
        <div className="grid gap-3 sm:grid-cols-2">{CATEGORIES?.map?.((c) => { const Icon = c?.icon; const active = form?.serviceCategory === c?.key; return <button type="button" key={c?.key} onClick={() => pickCategory(c?.key ?? '')} className={`relative rounded-xl border-2 p-4 text-left transition ${active ? 'border-[#16A34A] bg-green-50/60 shadow-[var(--shadow-md)]' : 'border-slate-200 bg-white hover:border-slate-300'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? 'bg-[#16A34A] text-white' : 'bg-slate-100 text-[#0A1628]'}`}><Icon className="h-5 w-5" /></span><span className="mt-3 block font-bold text-[#0A1628]">{c?.label}</span><span className="mt-1 block text-xs text-slate-500">{c?.desc}</span>{c?.comingSoon ? <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Coming soon</span> : null}{active ? <Check className="absolute right-3 top-3 h-5 w-5 text-[#16A34A]" /> : null}</button> }) ?? null}</div>

        {form?.serviceCategory && !isSea ? <div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="label">Preferred service <span className="font-normal text-slate-400">(Optional)</span></span><select className="field" value={form?.carrierServiceId ?? ''} onChange={(e) => pickCustomerService(e?.target?.value ?? '')}><option value="">No preference — let ForwardOne choose the best service</option>{catCustomerServices?.map?.((c) => <option key={c?.id ?? ''} value={c?.id ?? ''}>{c?.name ?? ''}{c?.transitTime ? ` — ${c?.transitTime}` : ''}</option>) ?? null}</select></label><Choice label="Direction" value={form?.direction ?? ''} onChange={(value) => update('direction', value)} options={[['EXPORT', 'Export from Albania'], ['IMPORT', 'Import to Albania']]} /><label><span className="label">Preferred pickup date</span><input className="field" type="date" value={form?.pickupDate ?? ''} onChange={(e) => update('pickupDate', e?.target?.value ?? '')} /></label></div> : null}
        {isSea ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800"><div className="flex items-center gap-2 font-bold"><Ship className="h-5 w-5" /> Sea Freight — coming soon</div><p className="mt-2 leading-relaxed">Automated ocean freight quoting is not live yet, but you can register your enquiry with the essential route and cargo details and a ForwardOne specialist will follow up manually.</p></div> : null}

        {form?.serviceCategory ? <div className="mt-6"><StepTitle icon={MapPin} title={isRoad ? 'Loading & delivery' : 'Route & parties'} text={isRoad ? 'Road freight needs loading and delivery addresses & contacts.' : 'We only need the origin country and the receiver & destination to quote.'} />
          {isExpressLike ? <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-5"><h3 className="mb-1 flex items-center gap-2 font-bold text-[#0A1628]"><UserRound className="h-4 w-4 text-green-600" /> Origin / sender</h3><p className="mb-4 text-xs text-slate-500">Only the origin country is required to quote.</p><CountryField label="Origin country" required value={form?.sender?.country ?? ''} onChange={(v) => updateParty('sender', 'country', v)} options={countries} /><details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-green-700">Add pickup details (optional)</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><OptField label="Contact name" side="sender" k="name" form={form} on={updateParty} /><OptField label="Company" side="sender" k="company" form={form} on={updateParty} /><TextField label="City" value={form?.sender?.city ?? ''} onChange={(v) => updateParty('sender', 'city', v)} /><TextField label="Postal code" value={form?.sender?.postalCode ?? ''} onChange={(v) => updateParty('sender', 'postalCode', v)} /><OptField label="Street address" side="sender" k="address" form={form} on={updateParty} wide /></div></details></div>
            <div className="rounded-xl bg-slate-50 p-5"><h3 className="mb-1 flex items-center gap-2 font-bold text-[#0A1628]"><UserRound className="h-4 w-4 text-green-600" /> Receiver / destination</h3><p className="mb-4 text-xs text-slate-500">Receiver name and destination are required.</p><div className="grid gap-3 sm:grid-cols-2"><ReqField label="Receiver name" side="receiver" k="name" form={form} on={updateParty} /><OptField label="Company" side="receiver" k="company" form={form} on={updateParty} /><CountryField label="Destination country" required value={form?.receiver?.country ?? ''} onChange={(v) => updateParty('receiver', 'country', v)} options={countries} /><TextField label="Destination city" required value={form?.receiver?.city ?? ''} onChange={(v) => updateParty('receiver', 'city', v)} /><TextField label="Postal code" value={form?.receiver?.postalCode ?? ''} onChange={(v) => updateParty('receiver', 'postalCode', v)} /><OptField label="Phone" side="receiver" k="phone" form={form} on={updateParty} /></div></div>
          </div> : null}
          {isRoad ? <div className="grid gap-6 lg:grid-cols-2">{(['sender', 'receiver'] as const)?.map?.((side) => <div key={side} className="rounded-xl bg-slate-50 p-5"><h3 className="mb-4 flex items-center gap-2 font-bold text-[#0A1628]"><UserRound className="h-4 w-4 text-green-600" />{side === 'sender' ? 'Loading address' : 'Delivery address'}</h3><div className="grid gap-3 sm:grid-cols-2"><ReqField label="Contact name" side={side} k="name" form={form} on={updateParty} /><OptField label="Company" side={side} k="company" form={form} on={updateParty} /><ReqField label="Street address" side={side} k="address" form={form} on={updateParty} wide /><CountryField label="Country" required value={form?.[side]?.country ?? ''} onChange={(v) => updateParty(side, 'country', v)} options={countries} /><TextField label="City" required value={form?.[side]?.city ?? ''} onChange={(v) => updateParty(side, 'city', v)} /><TextField label="Postal code" value={form?.[side]?.postalCode ?? ''} onChange={(v) => updateParty(side, 'postalCode', v)} /><OptField label="Phone" side={side} k="phone" form={form} on={updateParty} /></div></div>) ?? null}</div> : null}
          {isSea ? <div className="grid gap-4 sm:grid-cols-2"><CountryField label="Origin country" required value={form?.sender?.country ?? ''} onChange={(v) => updateParty('sender', 'country', v)} options={countries} /><TextField label="Origin port / city" value={form?.sender?.city ?? ''} onChange={(v) => updateParty('sender', 'city', v)} /><CountryField label="Destination country" required value={form?.receiver?.country ?? ''} onChange={(v) => updateParty('receiver', 'country', v)} options={countries} /><TextField label="Destination port / city" value={form?.receiver?.city ?? ''} onChange={(v) => updateParty('receiver', 'city', v)} /><label className="sm:col-span-2"><span className="label">Receiver name</span><input className="field" value={form?.receiver?.name ?? ''} onChange={(e) => updateParty('receiver', 'name', e?.target?.value ?? '')} /></label></div> : null}
        </div> : null}
      </div> : null}

      {step === 3 ? <div><StepTitle icon={Boxes} title="Shipment details" text="Pieces, weight and dimensions drive the chargeable weight and manual pricing." />
        <div className="grid gap-5"><label className="sm:max-w-xs"><span className="label">Contents type</span><select className="field" value={form?.contentsType ?? ''} onChange={(e) => update('contentsType', e?.target?.value ?? '')}><option value="DOCUMENTS">Documents</option><option value="PARCEL">Parcel</option><option value="MULTIPLE_PARCELS">Multiple Parcels</option><option value="BOXES">Boxes</option><option value="PALLET">Pallet</option></select></label>
          <PieceBuilder pieces={form?.pieceRows ?? []} onChange={updatePieceRows} divisor={divisor} restrictions={restrictions} serviceCategory={form?.serviceCategory} carrier={''} destCountry={form?.receiver?.country} />
          <label><span className="label">Goods description</span><input className="field" value={form?.goodsDescription ?? ''} onChange={(e) => update('goodsDescription', e?.target?.value ?? '')} placeholder="e.g. spare parts, textile samples..." /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Commercial value (EUR)</span><input className="field" type="number" min="0" step="0.01" value={form?.commercialValue ?? ''} onChange={(e) => update('commercialValue', e?.target?.value ?? '')} /></label><label><span className="label">Incoterms</span><select className="field" value={form?.incoterms ?? 'DAP'} onChange={(e) => update('incoterms', e?.target?.value ?? '')}>{['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']?.map?.((value) => <option key={value ?? ''}>{value ?? ''}</option>) ?? null}</select></label></div>
          <CheckRow label="This is a commercial (dutiable) shipment" checked={form?.isCommercial} on={(v) => update('isCommercial', v)} />
          <label className="flex cursor-pointer items-center justify-between rounded-lg bg-amber-50 p-4"><span className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-600" /><span><span className="block text-sm font-bold text-amber-900">Dangerous goods</span><span className="block text-xs text-amber-700">Requires additional documentation and review</span></span></span><input type="checkbox" className="h-5 w-5 accent-green-600" checked={form?.dangerousGoods ?? false} onChange={(e) => update('dangerousGoods', Boolean(e?.target?.checked))} /></label>
          {form?.dangerousGoods ? <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">UN Number</span><input className="field" placeholder="e.g. UN3481" value={form?.unNumber ?? ''} onChange={(e) => update('unNumber', e?.target?.value ?? '')} /></label><label><span className="label">Dangerous Goods class</span><input className="field" placeholder="e.g. Class 9" value={form?.dangerousGoodsClass ?? ''} onChange={(e) => update('dangerousGoodsClass', e?.target?.value ?? '')} /></label></div> : null}
          <label><span className="label">Special instructions</span><textarea className="field min-h-24 py-3" value={form?.specialInstructions ?? ''} onChange={(e) => update('specialInstructions', e?.target?.value ?? '')} placeholder="Pickup access, handling or customs notes..." /></label></div></div> : null}

      {step === 4 ? <div><StepTitle icon={ShieldCheck} title="Review & submit" text="Check your details, then submit. A ForwardOne operator will review and send your quotation." /><div className="grid gap-5">
        <div className="rounded-xl bg-slate-50 p-5"><h3 className="mb-3 font-bold text-[#0A1628]">Contact</h3><div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><div><span className="text-slate-400">Name:</span> {contact?.fullName || '—'}</div><div><span className="text-slate-400">Company:</span> {contact?.companyName || '—'}</div><div><span className="text-slate-400">Phone:</span> {contact?.phone || '—'}</div><div><span className="text-slate-400">Email:</span> {contact?.email || '—'}</div></div></div>
        <div className="rounded-xl bg-green-50 p-5"><div className="flex items-center gap-2 text-green-800"><Sparkles className="h-5 w-5" /><h3 className="font-bold">Recommended services</h3></div><p className="mt-2 text-xs text-green-700">{form?.serviceName ? `Your preferred service: ${form?.serviceName}. This is a preference only — our team confirms the final service.` : 'Advisory suggestions — our logistics team will select the most suitable service for your shipment.'}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{suggestions?.map?.((item) => <div key={item?.name ?? ''} className="rounded-lg bg-white p-4 shadow-sm"><p className="text-sm font-bold text-[#0A1628]">{item?.name ?? ''}</p><p className="mt-1 text-xs text-slate-500">{item?.description ?? ''}</p></div>) ?? null}</div></div>
        <div className="grid gap-3 rounded-xl bg-[#0A1628] p-5 text-white sm:grid-cols-4"><Summary label="Service" value={form?.serviceName || CATEGORIES.find((c) => c?.key === form?.serviceCategory)?.label || '—'} /><Summary label="Route" value={`${form?.sender?.country || form?.sender?.city || '—'} → ${form?.receiver?.city || form?.receiver?.country || '—'}`} /><Summary label="Shipment" value={`${shipment?.totals?.totalPieces ?? 0} pc · ${shipment?.totals?.chargeableWeight ?? 0} kg chg`} /><Summary label="Trade term" value={form?.incoterms ?? '—'} /></div>
        <div className="flex gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-800"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>Your request will be submitted as <strong>PENDING REVIEW</strong>. No price is generated automatically — a ForwardOne operator reviews carrier options and confirms your quotation manually.</p></div></div></div> : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => step === 1 ? router?.push?.('/quote/start') : setStep((value) => Math.max(1, value - 1))} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>{step < 4 ? <button type="button" onClick={next} className="btn-primary">Continue <ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={submit} disabled={submitting} className="btn-primary disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Submit request</button>}</div>
    </section></div>
}

function StepTitle({ icon: Icon, title, text }: { icon: typeof Package; title: string; text: string }) { return <div className="mb-7 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-bold text-[#0A1628]">{title}</h2><p className="mt-1 text-sm text-slate-500">{text}</p></div></div> }
function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <div><span className="label">{label ?? ''}</span><div className="grid grid-cols-2 gap-2">{options?.map?.((option) => <button type="button" key={option?.[0] ?? ''} onClick={() => onChange?.(option?.[0] ?? '')} className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition ${value === option?.[0] ? 'bg-[#0A1628] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{option?.[1] ?? ''}</button>) ?? null}</div></div> }
function Summary({ label, value }: { label: string; value: string }) { return <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label ?? ''}</span><p className="mt-1 text-sm font-semibold">{value ?? ''}</p></div> }
function ReqField({ label, side, k, form, on, wide }: { label: string; side: 'sender' | 'receiver'; k: keyof Party; form: FormState; on: (s: 'sender' | 'receiver', k: keyof Party, v: string) => void; wide?: boolean }) { return <label className={wide || k === 'address' ? 'sm:col-span-2' : ''}><span className="label">{label} *</span><input className="field" value={form?.[side]?.[k] ?? ''} onChange={(e) => on(side, k, e?.target?.value ?? '')} /></label> }
function OptField({ label, side, k, form, on, wide }: { label: string; side: 'sender' | 'receiver'; k: keyof Party; form: FormState; on: (s: 'sender' | 'receiver', k: keyof Party, v: string) => void; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="label">{label}</span><input className="field" value={form?.[side]?.[k] ?? ''} onChange={(e) => on(side, k, e?.target?.value ?? '')} /></label> }
function TextField({ label, required, value, onChange, wide }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="label">{label}{required ? ' *' : ''}</span><input className="field" value={value ?? ''} onChange={(e) => onChange(e?.target?.value ?? '')} autoComplete="off" /></label> }
function CheckRow({ label, checked, on }: { label: string; checked?: boolean; on: (v: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-3 text-sm font-semibold text-[#0A1628] shadow-sm"><input type="checkbox" className="h-4 w-4 accent-green-600" checked={Boolean(checked)} onChange={(e) => on(Boolean(e?.target?.checked))} />{label}</label> }
function CountryField({ label, required, value, onChange, wide, options }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; wide?: boolean; options: LocOpt[] }) {
  const [open, setOpen] = useState(false)
  const known = (options ?? []).some((c) => (c?.name ?? '').toLowerCase() === (value ?? '').toLowerCase())
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="label">{label}{required ? ' *' : ''}</span>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" role="combobox" aria-expanded={open} className="field flex items-center justify-between text-left">
          <span className={value ? 'truncate' : 'truncate text-slate-400'}>{value || 'Select a country...'}{value && !known ? <span className="ml-1 text-[10px] text-amber-600">(free text)</span> : null}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No matching country in the master list.</CommandEmpty>
            <CommandGroup>{(options ?? []).map((c) => <CommandItem key={c?.id ?? ''} value={c?.name ?? ''} onSelect={() => { onChange(c?.name ?? ''); setOpen(false) }}><Check className={cn('mr-2 h-4 w-4', (value ?? '').toLowerCase() === (c?.name ?? '').toLowerCase() ? 'opacity-100' : 'opacity-0')} />{c?.name ?? ''}</CommandItem>)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </label>
}
