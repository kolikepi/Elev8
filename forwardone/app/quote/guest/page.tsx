import Link from 'next/link'
import { PublicQuoteHeader } from '@/components/public-quote-header'
import { GuestQuoteForm } from '@/components/guest-quote-form'

export const dynamic = 'force-dynamic'

export default function GuestQuotePage() {
  return <main className="min-h-screen bg-slate-50"><PublicQuoteHeader />
    <div className="container-app py-8 sm:py-12">
      <div className="mb-8"><p className="section-kicker">Guest quote request</p><h1 className="text-3xl font-bold tracking-tight text-[#0A1628]">Request your quotation</h1><p className="mt-2 text-sm text-slate-500">No account needed. Complete the steps below and a ForwardOne operator will review and confirm your quotation. Prefer an account? <Link href="/login?callbackUrl=/quote/new" className="font-semibold text-green-700">Login or register</Link>.</p></div>
      <GuestQuoteForm />
    </div>
  </main>
}
