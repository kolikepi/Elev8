import Link from 'next/link'
import {
  ArrowRight, BadgeCheck, CheckCircle2, ClipboardList, Compass, FileCheck2, FileText,
  Globe2, Handshake, Headphones, Layers, LayoutDashboard, LogIn, Mail, MapPin, PackageCheck, Phone,
  Plane, Radar, Receipt, Route, ScrollText, Ship, Truck, Users,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { HomeTracking } from '@/components/home-tracking'
import { HeroNetwork } from '@/components/hero-network'
import { QuickQuote } from '@/components/quick-quote'

const values = [
  { icon: Globe2, title: 'Global Coverage', text: 'Move shipments across Europe and worldwide with international courier and freight options in one place.' },
  { icon: Layers, title: 'Multiple Options', text: 'Compare express, economy and road freight services so you can choose the right balance of speed and cost.' },
  { icon: LayoutDashboard, title: 'One Platform', text: 'Quote, book, track and manage documents and invoices from a single business workspace.' },
  { icon: Headphones, title: 'Business Support', text: 'Work with a dedicated logistics team that reviews every shipment and supports you end to end.' },
]

const services = [
  { icon: Plane, name: 'Express', text: 'Fast, time-sensitive international delivery for urgent parcels and documents.' },
  { icon: Truck, name: 'Express Economy', text: 'A cost-effective express option when timing is flexible but reliability still matters.' },
  { icon: Route, name: 'Road Freight', text: 'Groupage and full-load road transport for pallets and heavier shipments across Europe.' },
  { icon: FileCheck2, name: 'Customs Support', text: 'Practical assistance with customs documentation and compliance for smooth border crossings.' },
]

const why = [
  { icon: Handshake, title: 'One Point of Contact', text: 'A single, dependable partner coordinating your shipments from request to delivery.' },
  { icon: Layers, title: 'Multiple Shipping Options', text: 'Choose from a range of services and carriers matched to each shipment.' },
  { icon: BadgeCheck, title: 'Transparent Quotations', text: 'Clear, reviewed pricing with the service options laid out side by side.' },
  { icon: Radar, title: 'Shipment Visibility', text: 'Follow every milestone with clear tracking from pickup to delivery.' },
  { icon: Users, title: 'Built for Business', text: 'A workspace designed around how companies actually ship and manage logistics.' },
]

const steps = [
  { n: '01', icon: ClipboardList, title: 'Request', text: 'Tell us what you are shipping — route, contents, weight and pickup details.' },
  { n: '02', icon: Compass, title: 'Compare', text: 'Receive reviewed service options so you can weigh speed against cost.' },
  { n: '03', icon: CheckCircle2, title: 'Select', text: 'Choose the option that fits and confirm your booking in a few clicks.' },
  { n: '04', icon: Radar, title: 'Ship & Track', text: 'We coordinate collection and you follow every milestone in real time.' },
  { n: '05', icon: PackageCheck, title: 'Delivered', text: 'Your shipment arrives, with documents and invoices kept in one place.' },
]

const platform = [
  { icon: ClipboardList, label: 'Quote Requests' },
  { icon: Layers, label: 'Multiple Service Offers' },
  { icon: BadgeCheck, label: 'Bookings' },
  { icon: Truck, label: 'Shipments' },
  { icon: Radar, label: 'Tracking' },
  { icon: FileText, label: 'Documents' },
  { icon: Receipt, label: 'Invoices' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#070E1C]">
        <div className="pointer-events-none absolute inset-0 hero-grid-dark" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-[#2563EB]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[#1E3A8A]/25 blur-3xl" />
        <div className="container-app relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-blue-200 backdrop-blur"><Globe2 className="h-3.5 w-3.5" /> International courier &amp; freight, coordinated</div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">Smart logistics.<br /><span className="bg-gradient-to-r from-[#60A5FA] to-[#2563EB] bg-clip-text text-transparent">One platform.</span> Global reach.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Request quotes, compare service options, book shipments and track every milestone — all from a single business logistics platform built for reliable international shipping.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/quote/start" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#1D4ED8]">Get a Quote <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/tracking" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"><Radar className="h-4 w-4" /> Track Shipment</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#60A5FA]" /> Reviewed quotations</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#60A5FA]" /> One shipment workspace</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#60A5FA]" /> Customs-ready</span>
            </div>
          </div>
          <div className="relative z-10"><HeroNetwork /></div>
        </div>
      </section>

      {/* TRACKING BOX */}
      <section id="track" className="relative z-20 -mt-10">
        <div className="container-app">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 shadow-[var(--shadow-lg)] sm:p-8">
            <div className="mb-4 flex items-center gap-2"><Radar className="h-5 w-5 text-[#2563EB]" /><h2 className="text-lg font-bold text-[#0A1628]">Track your shipment</h2></div>
            <HomeTracking />
          </div>
        </div>
      </section>

      {/* QUICK QUOTE ENTRY */}
      <section className="pt-14 sm:pt-16">
        <div className="container-app">
          <div className="mx-auto max-w-5xl rounded-2xl border border-slate-100 bg-white p-6 shadow-[var(--shadow-lg)] sm:p-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#2563EB]" /><h2 className="text-lg font-bold text-[#0A1628]">Start a quote in seconds</h2></div>
                <p className="mt-1 text-sm text-slate-500">Tell us the basics and continue your request — no account needed.</p>
              </div>
              <span className="text-xs font-medium text-slate-400">No price is calculated automatically — a ForwardOne operator reviews and confirms every quotation.</span>
            </div>
            <QuickQuote />
          </div>
        </div>
      </section>

      {/* VALUE / TRUST */}
      <section className="py-20 sm:py-24">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center"><p className="section-kicker-blue">Why teams choose us</p><h2 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">A smarter way to manage shipping</h2></div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => { const Icon = v.icon; return (
              <div key={v.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-bold text-[#0A1628]">{v.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{v.text}</p>
              </div>) })}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-slate-50 py-20 sm:py-24">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center"><p className="section-kicker-blue">Services</p><h2 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">The right service for every shipment</h2><p className="mt-4 text-slate-600">From urgent parcels to full truckloads, ForwardOne coordinates the complete journey — you stay with one trusted provider.</p></div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => { const Icon = s.icon; return (
              <article key={s.name} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A1628] text-[#60A5FA] transition group-hover:bg-[#2563EB] group-hover:text-white"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-bold text-[#0A1628]">{s.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{s.text}</p>
              </article>) })}
          </div>
          <div className="mt-10 text-center"><Link href="/quote/start" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#1D4ED8]">Get a Quote <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      {/* WHY FORWARDONE */}
      <section id="why" className="py-20 sm:py-24">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center"><p className="section-kicker-blue">Why ForwardOne</p><h2 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">Logistics that works the way you do</h2></div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {why.map((w) => { const Icon = w.icon; return (
              <div key={w.title} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-[var(--shadow-sm)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><Icon className="h-5 w-5" /></span>
                <div><h3 className="font-bold text-[#0A1628]">{w.title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-600">{w.text}</p></div>
              </div>) })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#070E1C] py-20 text-white sm:py-24">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center"><p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#60A5FA]">How it works</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From request to delivery in five steps</h2></div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((s) => { const Icon = s.icon; return (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <span className="absolute right-4 top-3 text-3xl font-black text-[#60A5FA]/70">{s.n}</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563EB]/15 text-[#60A5FA]"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{s.text}</p>
              </div>) })}
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section id="platform" className="py-20 sm:py-24">
        <div className="container-app grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="section-kicker-blue">The ForwardOne platform</p>
            <h2 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">Your logistics workspace</h2>
            <p className="mt-4 max-w-xl text-slate-600">Ship regularly? A ForwardOne business account keeps everything for a shipment in one place. Raise quote requests, compare the service offers we prepare for you, confirm bookings, then follow shipments and keep documents and invoices organised — without switching between tools or inboxes.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {platform.map((p) => { const Icon = p.icon; return (
                <div key={p.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-[var(--shadow-sm)]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]"><Icon className="h-5 w-5" /></span><span className="text-sm font-semibold text-[#0A1628]">{p.label}</span></div>) })}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="btn-navy">Create Account <ArrowRight className="h-4 w-4" /></Link><Link href="/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-[#0A1628] transition hover:bg-slate-50"><LogIn className="h-4 w-4" /> Login</Link></div>
            <p className="mt-3 text-xs text-slate-400">Registration is optional — you can always <Link href="/quote/start" className="font-semibold text-[#2563EB] hover:underline">get a quote</Link> as a guest, no account needed.</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-100 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3"><span className="h-3 w-3 rounded-full bg-slate-300" /><span className="h-3 w-3 rounded-full bg-slate-300" /><span className="h-3 w-3 rounded-full bg-slate-300" /><span className="ml-3 text-xs font-medium text-slate-400">ForwardOne · Workspace</span></div>
              <div className="grid gap-4 p-5">
                <div className="flex items-center justify-between rounded-xl bg-[#070E1C] p-4 text-white"><div><p className="text-xs text-slate-400">Active shipment</p><p className="font-bold">FWD-2026-00007</p></div><span className="rounded-full bg-[#2563EB]/20 px-3 py-1 text-xs font-semibold text-[#60A5FA]">In transit</span></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm"><ClipboardList className="mx-auto h-5 w-5 text-[#2563EB]" /><p className="mt-1.5 text-[11px] font-semibold text-slate-500">Quotes</p></div>
                  <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm"><Truck className="mx-auto h-5 w-5 text-[#2563EB]" /><p className="mt-1.5 text-[11px] font-semibold text-slate-500">Shipments</p></div>
                  <div className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm"><Receipt className="mx-auto h-5 w-5 text-[#2563EB]" /><p className="mt-1.5 text-[11px] font-semibold text-slate-500">Invoices</p></div>
                </div>
                <div className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between text-xs text-slate-400"><span>Pickup</span><span>Delivery</span></div><div className="relative mt-2 h-2 rounded-full bg-slate-100"><div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA]" /></div><div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#0A1628]"><MapPin className="h-3.5 w-3.5 text-[#2563EB]" /> Cleared customs · in transit</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-slate-50 py-20 sm:py-24">
        <div className="container-app grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-start gap-2 rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)]"><Plane className="h-7 w-7 text-[#2563EB]" /><span className="text-sm font-semibold text-[#0A1628]">Express &amp; economy</span></div>
            <div className="mt-6 flex flex-col items-start gap-2 rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)]"><Route className="h-7 w-7 text-[#2563EB]" /><span className="text-sm font-semibold text-[#0A1628]">Road freight</span></div>
            <div className="flex flex-col items-start gap-2 rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)]"><FileCheck2 className="h-7 w-7 text-[#2563EB]" /><span className="text-sm font-semibold text-[#0A1628]">Customs support</span></div>
            <div className="mt-6 flex flex-col items-start gap-2 rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)]"><Ship className="h-7 w-7 text-[#2563EB]" /><span className="text-sm font-semibold text-[#0A1628]">Global reach</span></div>
          </div>
          <div>
            <p className="section-kicker-blue">About ForwardOne</p>
            <h2 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">A modern freight forwarder, built around your business</h2>
            <p className="mt-4 text-slate-600">ForwardOne is a logistics partner that brings international courier and freight together on one platform. We coordinate the carriers, the paperwork and the milestones so you deal with a single, dependable provider — not a patchwork of couriers and portals.</p>
            <p className="mt-4 text-slate-600">Our focus is straightforward: give businesses clear service options, transparent quotations and real visibility over every shipment, backed by a team that reviews the details and supports you when it matters.</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20">
        <div className="container-app">
          <div className="relative overflow-hidden rounded-3xl bg-[#070E1C] p-8 text-white shadow-[var(--shadow-lg)] sm:p-14">
            <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#2563EB]/25 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to move your next shipment?</h2><p className="mt-4 max-w-xl text-slate-300">Get a reviewed quotation with clear service options, then book and track it all in one place.</p></div>
              <div className="flex flex-col gap-3 sm:flex-row"><Link href="/quote/start" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#1D4ED8]">Get a Quote <ArrowRight className="h-4 w-4" /></Link><Link href="/#contact" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10">Contact Us</Link></div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="border-t border-slate-100 py-20">
        <div className="container-app grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="section-kicker-blue">Contact</p>
            <h2 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">Let us help with your logistics</h2>
            <p className="mt-4 max-w-lg text-slate-600">Have a shipment in mind or a question about our services? Reach out and our team will get back to you.</p>
            <div className="mt-7 grid gap-4 text-sm">
              <span className="flex items-center gap-3 text-slate-700"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><MapPin className="h-5 w-5" /></span>Tirana, Albania</span>
              <a href="mailto:operations@forwardone.com" className="flex items-center gap-3 text-slate-700 transition hover:text-[#2563EB]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><Mail className="h-5 w-5" /></span><span suppressHydrationWarning>operations@forwardone.com</span></a>
              <a href="tel:+35540000000" className="flex items-center gap-3 text-slate-700 transition hover:text-[#2563EB]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]"><Phone className="h-5 w-5" /></span><span suppressHydrationWarning>+355 4 000 0000</span></a>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 shadow-[var(--shadow-sm)]">
            <ScrollText className="h-8 w-8 text-[#2563EB]" />
            <h3 className="mt-4 text-xl font-bold text-[#0A1628]">Start with a quote</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">The fastest way to get started is to request a quotation. Share your route and shipment details, and we will prepare reviewed service options for you.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/quote/start" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]">Get a Quote <ArrowRight className="h-4 w-4" /></Link><Link href="/tracking" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-[#0A1628] transition hover:bg-slate-50"><Radar className="h-4 w-4" /> Track Shipment</Link></div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
