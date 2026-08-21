'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, Loader2, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { toast } from 'sonner'

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const search = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(search?.get?.('role') === 'business' ? 'BUSINESS_CUSTOMER' : 'CUSTOMER')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault?.(); setLoading(true)
    const form = new FormData(event?.currentTarget)
    const email = String(form?.get?.('email') ?? '').trim().toLowerCase()
    const password = String(form?.get?.('password') ?? '')
    try {
      if (mode === 'signup') {
        const response = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form?.get?.('name') ?? '', email, password, role, companyName: form?.get?.('companyName') ?? '' }) })
        const result = await response?.json?.().catch?.(() => ({})) ?? {}
        if (!response?.ok) throw new Error(result?.error ?? 'Unable to create your account.')
      }
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) throw new Error('The email or password is incorrect.')
      toast?.success?.(mode === 'signup' ? 'Your ForwardOne account is ready.' : 'Welcome back.')
      const callbackUrl = search?.get?.('callbackUrl') ?? '/dashboard'
      router?.replace?.(callbackUrl?.startsWith?.('/') ? callbackUrl : '/dashboard')
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Something went wrong.' : 'Something went wrong.') }
    finally { setLoading(false) }
  }
  return <form onSubmit={submit} className="grid gap-4">
    {mode === 'signup' ? <><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setRole('CUSTOMER')} className={`rounded-lg p-3 text-left text-sm transition ${role === 'CUSTOMER' ? 'bg-[#0A1628] text-white shadow-md' : 'bg-slate-100 text-slate-700'}`}><UserRound className="mb-2 h-5 w-5" /><span className="font-semibold">Customer</span><span className="mt-1 block text-[11px] opacity-70">Personal shipping</span></button><button type="button" onClick={() => setRole('BUSINESS_CUSTOMER')} className={`rounded-lg p-3 text-left text-sm transition ${role === 'BUSINESS_CUSTOMER' ? 'bg-[#0A1628] text-white shadow-md' : 'bg-slate-100 text-slate-700'}`}><Building2 className="mb-2 h-5 w-5" /><span className="font-semibold">Business</span><span className="mt-1 block text-[11px] opacity-70">Frequent shipping</span></button></div><label><span className="label">Full name</span><span className="relative block"><UserRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="name" className="field pl-9" required /></span></label>{role === 'BUSINESS_CUSTOMER' ? <label><span className="label">Company name</span><span className="relative block"><Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="companyName" className="field pl-9" required /></span></label> : null}</> : null}
    <label><span className="label">Email address</span><span className="relative block"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="email" type="email" defaultValue={search?.get?.('email') ?? ''} className="field pl-9" autoComplete="email" required /></span></label>
    <label><span className="label">Password</span><span className="relative block"><LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="password" type="password" minLength={8} className="field pl-9" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></span></label>
    <button disabled={loading} className="btn-primary mt-2 w-full disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{mode === 'login' ? 'Sign in to workspace' : 'Create ForwardOne account'}<ArrowRight className="h-4 w-4" /></button>
  </form>
}
