'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, MapPin, Package, Scale } from 'lucide-react'

const TYPES = [
  { value: 'EXPRESS', label: 'Express' },
  { value: 'ROAD_FREIGHT', label: 'Road Freight' },
  { value: 'AIR_FREIGHT', label: 'Air Freight' },
]

// Lightweight "quick quote" entry. Collects intent only (route, service, weight) and hands off to the
// existing Get-a-Quote flow with those values pre-filled. It NEVER calculates or promises a price —
// every quotation is reviewed and confirmed manually by a ForwardOne operator.
export function QuickQuote() {
  const router = useRouter()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState('EXPRESS')
  const [weight, setWeight] = useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault?.()
    const params = new URLSearchParams()
    if (from.trim()) params.set('from', from.trim())
    if (to.trim()) params.set('to', to.trim())
    if (type) params.set('type', type)
    if (weight.trim()) params.set('weight', weight.trim())
    const qs = params.toString()
    router.push(qs ? `/quote/start?${qs}` : '/quote/start')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.1fr_1fr_0.7fr_auto] lg:items-end">
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><MapPin className="h-3.5 w-3.5 text-[#2563EB]" /> From</span>
        <input value={from} onChange={(e) => setFrom(e?.target?.value ?? '')} placeholder="Origin country / city" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-600/15" />
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><MapPin className="h-3.5 w-3.5 text-[#2563EB]" /> To</span>
        <input value={to} onChange={(e) => setTo(e?.target?.value ?? '')} placeholder="Destination country / city" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-600/15" />
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Package className="h-3.5 w-3.5 text-[#2563EB]" /> Shipment type</span>
        <select value={type} onChange={(e) => setType(e?.target?.value ?? 'EXPRESS')} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-600/15">
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Scale className="h-3.5 w-3.5 text-[#2563EB]" /> Weight (kg)</span>
        <input value={weight} onChange={(e) => setWeight(e?.target?.value ?? '')} type="number" min="0" step="0.1" inputMode="decimal" placeholder="e.g. 25" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-600/15" />
      </label>
      <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#1D4ED8]">Get a Quote <ArrowRight className="h-4 w-4" /></button>
    </form>
  )
}
