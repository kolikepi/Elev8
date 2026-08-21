'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarDays, MapPin, Package, Scale } from 'lucide-react'
import type { FormEvent } from 'react'

export function HeroQuoteForm() {
  const router = useRouter()
  function submit(event: FormEvent<HTMLFormElement>) {
    event?.preventDefault?.()
    const form = new FormData(event?.currentTarget)
    const query = new URLSearchParams()
    for (const [key, value] of Array.from(form?.entries?.() ?? [])) query.set(key ?? '', String(value ?? ''))
    router?.push?.(`/quote/new?${query?.toString?.() ?? ''}`)
  }
  return (
    <form onSubmit={submit} className="glass-card relative z-10 grid gap-4 rounded-2xl p-5 sm:p-6" aria-label="Quick quote form">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50"><Package className="h-5 w-5 text-[#16A34A]" /></span><div><h2 className="font-bold text-[#0A1628]">Start your quote</h2><p className="text-xs text-slate-500">Takes less than 3 minutes</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">Origin city / country</span><span className="relative block"><MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="origin" className="field pl-9" placeholder="Tirana, Albania" required /></span></label>
        <label><span className="label">Destination</span><span className="relative block"><MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="destination" className="field pl-9" placeholder="Milan, Italy" required /></span></label>
      </div>
      <label><span className="label">Shipment type</span><select name="contents" className="field" defaultValue="PARCEL"><option value="DOCUMENTS">Documents</option><option value="PARCEL">Parcel</option><option value="BOXES">Boxes</option><option value="PALLET">Pallet / Freight</option></select></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label><span className="label">Weight (kg)</span><span className="relative block"><Scale className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="weight" type="number" min="0.1" step="0.1" className="field pl-9" placeholder="12.5" required /></span></label>
        <label><span className="label">Pieces</span><input name="pieces" type="number" min="1" className="field" defaultValue="1" required /></label>
        <label><span className="label">Pickup date</span><span className="relative block"><CalendarDays className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="pickupDate" type="date" className="field pl-9" required /></span></label>
      </div>
      <button type="submit" className="btn-primary w-full">Continue to full quote <ArrowRight className="h-4 w-4" /></button>
      <p className="text-center text-[11px] text-slate-400">No payment required. Every price is manually reviewed by our logistics team.</p>
    </form>
  )
}
