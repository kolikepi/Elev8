import Link from 'next/link'
import { CheckCircle2, ArrowRight, Home } from 'lucide-react'
import { PublicQuoteHeader } from '@/components/public-quote-header'

export const dynamic = 'force-dynamic'

export default function GuestQuoteSuccessPage({
  searchParams,
}: {
  searchParams: { ref?: string; email?: string }
}) {
  const reference = (searchParams?.ref ?? '').trim()
  const email = (searchParams?.email ?? '').trim()
  const signupHref = email ? `/signup?email=${encodeURIComponent(email)}` : '/signup'

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicQuoteHeader />
      <div className="container-app flex justify-center py-12 sm:py-20">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border bg-white p-8 text-center shadow-[var(--shadow-lg)] sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#0A1628] sm:text-3xl">
              Quote request submitted successfully
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              Thank you. A ForwardOne operator will review your request and prepare your
              quotation. {email ? <>We&apos;ll send updates to <span className="font-semibold text-slate-700">{email}</span>.</> : null}
            </p>

            {reference ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="section-kicker">Your reference number</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-[#0A1628]">
                  {reference}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Please keep this reference for any follow-up about your request.
                </p>
              </div>
            ) : null}

            <div className="mt-8 rounded-xl bg-[#0A1628] p-5 text-left">
              <p className="text-sm font-semibold text-white">Save &amp; manage your quote</p>
              <p className="mt-1 text-xs text-slate-300">
                Create a free account to track this request, receive your offers, and manage
                bookings in one place. This is optional — your request is already submitted.
              </p>
              <Link
                href={signupHref}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-500"
              >
                Create account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0A1628]"
              >
                <Home className="h-4 w-4" /> Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
