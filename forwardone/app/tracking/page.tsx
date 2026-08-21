import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { TrackingSearch } from '@/components/tracking-search'

export const metadata = { title: 'Track a Shipment' }

export default function TrackingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <SiteHeader />
      <section className="container-app py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-9 text-center">
            <p className="section-kicker-blue">Shipment visibility</p>
            <h1 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">Track every milestone</h1>
            <p className="mt-3 text-slate-600">Enter a ForwardOne shipment reference (e.g. FWD-2026-00001) or tracking number to see the latest status.</p>
          </div>
          <TrackingSearch />
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
