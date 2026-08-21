import Link from 'next/link'
import { Boxes, Mail, MapPin, Phone } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#070E1C] text-white">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#2563EB]/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#1E3A8A]/20 blur-3xl" />
      <div className="container-app relative grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-2.5 text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A]"><Boxes className="h-5 w-5 text-white" /></span>
            Forward<span className="-ml-2.5 text-[#60A5FA]">One</span>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-400">Smart logistics on one platform. Request quotes, compare service options, book shipments and track every milestone — all in a single business workspace.</p>
          <div className="mt-5 grid gap-2.5 text-sm text-slate-400">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#60A5FA]" />Tirana, Albania</span>
            <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#60A5FA]" /><span suppressHydrationWarning>operations@forwardone.com</span></span>
            <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#60A5FA]" /><span suppressHydrationWarning>+355 4 000 0000</span></span>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Navigation</h3>
          <div className="grid gap-3 text-sm text-slate-400">
            <Link href="/#services" className="transition hover:text-white">Services</Link>
            <Link href="/#why" className="transition hover:text-white">Why ForwardOne</Link>
            <Link href="/#how-it-works" className="transition hover:text-white">How It Works</Link>
            <Link href="/#about" className="transition hover:text-white">About Us</Link>
            <Link href="/#contact" className="transition hover:text-white">Contact</Link>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Customer</h3>
          <div className="grid gap-3 text-sm text-slate-400">
            <Link href="/login" className="transition hover:text-white">Login</Link>
            <Link href="/quote/start" className="transition hover:text-white">Get a Quote</Link>
            <Link href="/tracking" className="transition hover:text-white">Track Shipment</Link>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Legal</h3>
          <div className="grid gap-3 text-sm text-slate-400">
            <Link href="/privacy" className="transition hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 ForwardOne. All rights reserved.</span>
          <span>Smart logistics. One platform. Global reach.</span>
        </div>
      </div>
    </footer>
  )
}
