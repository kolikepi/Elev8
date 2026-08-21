'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, MapPin, PackageSearch, Search } from 'lucide-react'

interface TrackEvent { statusLabel?: string; status?: string; location?: string; description?: string; timestamp?: string | null }
interface TrackResult { trackingNumber?: string; reference?: string; carrier?: string; statusLabel?: string; status?: string; origin?: string; destination?: string; estimatedDelivery?: string | null; events?: TrackEvent[] }

export function HomeTracking() {
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [result, setResult] = useState<TrackResult | null>(null)

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault?.()
    if (!term?.trim?.()) return
    setLoading(true); setSearched(true)
    try {
      const response = await fetch(`/api/tracking?query=${encodeURIComponent(term.trim())}`)
      const data = await response?.json?.().catch?.(() => ({})) ?? {}
      setResult(response?.ok ? (data?.shipment ?? null) : null)
    } catch (error: unknown) { console.error(error); setResult(null) } finally { setLoading(false) }
  }

  const latest = result?.events?.[0]

  return (
    <div className="w-full">
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Tracking or reference number</span>
          <PackageSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input value={term} onChange={(e) => setTerm(e?.target?.value ?? '')} className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-600/15" placeholder="FWD-2026-________" aria-label="Shipment reference or tracking number" />
        </label>
        <button type="submit" disabled={loading} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-7 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#1D4ED8] disabled:opacity-70 sm:w-auto">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Track</button>
      </form>

      {result ? (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-[var(--shadow-md)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1D4ED8]">{result?.statusLabel || (result?.status ?? '').split('_').join(' ')}</span>
              <p className="mt-2 text-lg font-bold text-[#0A1628]">{result?.reference || result?.trackingNumber}</p>
              {result?.carrier ? <p className="text-sm text-slate-500">{result.carrier}</p> : null}
            </div>
            <CheckCircle2 className="h-9 w-9 text-[#2563EB]" />
          </div>
          {(result?.origin || result?.destination) ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Origin</span><span className="font-semibold text-[#0A1628]">{result?.origin || '—'}</span></div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Destination</span><span className="font-semibold text-[#0A1628]">{result?.destination || '—'}</span></div>
            </div>
          ) : null}
          {latest ? (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-[#2563EB]" /> Latest update: <span className="font-medium text-[#0A1628]">{latest?.statusLabel || (latest?.status ?? '').split('_').join(' ')}</span>{latest?.location ? ` · ${latest.location}` : ''}</p>
          ) : null}
          <Link href="/tracking" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">View full timeline <ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : searched && !loading ? (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-[var(--shadow-sm)]">
          <PackageSearch className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-[#0A1628]">Shipment not found</p>
          <p className="mt-1 text-sm text-slate-500">Check your ForwardOne reference or tracking number and try again.</p>
        </div>
      ) : null}
    </div>
  )
}
