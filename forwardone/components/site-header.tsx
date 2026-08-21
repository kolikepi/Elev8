'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Boxes, LogIn, Menu, X } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/#services', label: 'Services' },
  { href: '/#why', label: 'Why ForwardOne' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#about', label: 'About Us' },
  { href: '/#contact', label: 'Contact' },
  { href: '/tracking', label: 'Track Shipment' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled((window?.scrollY ?? 0) > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className={`sticky top-0 z-50 border-b transition-all duration-300 ${scrolled ? 'border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_1px_20px_rgba(10,22,40,0.06)]' : 'border-transparent bg-white/70 backdrop-blur-md'}`}>
      <div className="container-app flex h-16 items-center justify-between gap-4 sm:h-[70px]">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-[#0A1628]" aria-label="ForwardOne home" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#0A1628] shadow-md"><Boxes className="h-5 w-5 text-blue-300" /></span>
          <span className="text-lg tracking-tight">Forward<span className="text-[#2563EB]">One</span></span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex" aria-label="Main navigation">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="relative transition-colors hover:text-[#0A1628] after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:bg-[#2563EB] after:transition-all after:duration-300 hover:after:w-full">{item.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex"><LogIn className="h-4 w-4" /> Login</Link>
          <Link href="/quote/start" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#1D4ED8] hover:shadow-blue-600/35 focus:outline-none focus:ring-4 focus:ring-blue-600/25"><span>Get a Quote</span><ArrowRight className="h-4 w-4" /></Link>
          <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#0A1628] transition hover:bg-slate-100 lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden border-t border-slate-100 bg-white transition-[max-height,opacity] duration-300 ${open ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav className="container-app flex flex-col gap-1 py-4" aria-label="Mobile navigation">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#0A1628]">{item.label}</Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-base font-semibold text-slate-700"><LogIn className="h-4 w-4" /> Login</Link>
          <Link href="/quote/start" onClick={() => setOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-3 py-3 text-base font-semibold text-white">Get a Quote <ArrowRight className="h-4 w-4" /></Link>
        </nav>
      </div>
    </header>
  )
}
