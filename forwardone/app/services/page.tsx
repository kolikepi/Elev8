import Link from 'next/link'
import { ArrowRight, FileCheck2, Globe2, Layers, Plane, Route, Truck } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata = { title: 'Services' }

export default function ServicesPage() {
  const items = [
    { icon: Plane, title: 'Express', text: 'Fast, time-sensitive international delivery for urgent parcels and documents worldwide.' },
    { icon: Truck, title: 'Express Economy', text: 'A cost-effective express option for when timing is flexible but reliability still matters.' },
    { icon: Route, title: 'Road Freight', text: 'Groupage and full-load road transport for pallets, boxes and heavier shipments across Europe.' },
    { icon: Layers, title: 'Groupage & Pallets', text: 'Shared-load transport that keeps costs down for shipments that do not need a full truck.' },
    { icon: FileCheck2, title: 'Customs Support', text: 'Practical assistance with customs documentation and compliance for smooth border crossings.', id: 'customs' },
    { icon: Globe2, title: 'Global Reach', text: 'One coordinated partner for shipments across Europe and to destinations worldwide.' },
  ]
  return (
    <main className="min-h-screen bg-white">
      <SiteHeader />
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container-app">
          <p className="section-kicker-blue">ForwardOne services</p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-[#0A1628]">Courier, freight and customs coordination in one place.</h1>
          <p className="mt-4 max-w-2xl text-slate-600">Choose the right transport mode, then let our logistics team review every operational detail. You stay with a single, trusted provider from quote to delivery.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => { const Icon = item.icon; return (
              <article id={item.id} key={item.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><Icon className="h-6 w-6" /></span>
                <h2 className="mt-4 text-lg font-bold text-[#0A1628]">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>) })}
          </div>
          <div className="mt-10"><Link href="/quote/start" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#1D4ED8]">Get a Quote <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
