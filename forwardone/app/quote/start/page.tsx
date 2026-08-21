import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ArrowRight, LogIn, UserRound } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { PublicQuoteHeader } from '@/components/public-quote-header'

export const dynamic = 'force-dynamic'

// Public entry point for "Get a Quote". Logged-in users skip straight to the full authenticated form.
// Everyone else chooses between continuing as a guest (no account) or logging in / creating an account.
export default async function QuoteStartPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) redirect('/quote/new')
  // Carry any Quick Quote intent (from / to / type / weight) through to the guest form.
  const sp = new URLSearchParams()
  for (const key of ['from', 'to', 'type', 'weight']) { const v = searchParams?.[key]; if (typeof v === 'string' && v.trim()) sp.set(key, v.trim()) }
  const guestHref = sp.toString() ? `/quote/guest?${sp.toString()}` : '/quote/guest'
  return <main className="min-h-screen bg-slate-50"><PublicQuoteHeader />
    <div className="container-app py-12 sm:py-16">
      <div className="mx-auto max-w-3xl text-center"><p className="section-kicker">Get a quote</p><h1 className="text-3xl font-bold tracking-tight text-[#0A1628]">Request a shipping quotation</h1><p className="mt-3 text-sm text-slate-500">Tell us about your shipment and our team will review carrier options and send you a manually confirmed quotation. You can continue as a guest — no account required.</p></div>
      <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
        <Link href={guestHref} className="group rounded-2xl border-2 border-[#16A34A] bg-white p-7 text-left shadow-[var(--shadow-md)] transition hover:shadow-[var(--shadow-lg)]"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#16A34A] text-white"><UserRound className="h-6 w-6" /></span><h2 className="mt-5 text-lg font-bold text-[#0A1628]">Continue as guest</h2><p className="mt-2 text-sm leading-6 text-slate-500">Submit your quote request in a few steps. Just your contact details and shipment info — no sign-up needed.</p><span className="mt-5 inline-flex items-center gap-2 font-semibold text-[#16A34A]">Start guest request <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
        <Link href="/login?callbackUrl=/quote/new" className="group rounded-2xl border-2 border-slate-200 bg-white p-7 text-left shadow-[var(--shadow-sm)] transition hover:border-slate-300 hover:shadow-[var(--shadow-md)]"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A1628] text-white"><LogIn className="h-6 w-6" /></span><h2 className="mt-5 text-lg font-bold text-[#0A1628]">Login / create account</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in or register a business workspace to save quotes, track shipments and manage documents & invoices in one place.</p><span className="mt-5 inline-flex items-center gap-2 font-semibold text-[#0A1628]">Login or register <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
      </div>
    </div>
  </main>
}
