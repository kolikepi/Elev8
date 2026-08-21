import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { authOptions, dashboardForRole } from '@/lib/auth'
import { ChangePasswordForm } from '@/components/change-password-form'

export const dynamic = 'force-dynamic'
export default async function SecurityPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login?callbackUrl=/account/security')
  const home = dashboardForRole(session?.user?.role ?? 'CUSTOMER')
  return <main className="mx-auto max-w-lg px-4 py-10 sm:py-16">
    <Link href={home} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#0A1628]"><ArrowLeft className="h-4 w-4" />Back to workspace</Link>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1628] text-white"><ShieldCheck className="h-5 w-5" /></span>
        <div><h1 className="text-lg font-semibold text-[#0A1628]">Account security</h1><p className="text-sm text-slate-500">Signed in as {session?.user?.email ?? ''}</p></div>
      </div>
      <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">For security, change any default or shared password to a strong, private one before using the platform.</p>
      <ChangePasswordForm />
    </div>
  </main>
}
