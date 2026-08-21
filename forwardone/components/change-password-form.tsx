'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault?.(); setLoading(true)
    const form = new FormData(event?.currentTarget)
    const currentPassword = String(form?.get?.('currentPassword') ?? '')
    const newPassword = String(form?.get?.('newPassword') ?? '')
    const confirmPassword = String(form?.get?.('confirmPassword') ?? '')
    try {
      if (newPassword !== confirmPassword) throw new Error('The new passwords do not match.')
      const response = await fetch('/api/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
      const result = await response?.json?.().catch?.(() => ({})) ?? {}
      if (!response?.ok) throw new Error(result?.error ?? 'Unable to update your password.')
      toast?.success?.('Your password has been updated.');
      (event?.currentTarget as HTMLFormElement)?.reset?.()
    } catch (error: unknown) { console.error(error); toast?.error?.(error instanceof Error ? error?.message ?? 'Something went wrong.' : 'Something went wrong.') }
    finally { setLoading(false) }
  }
  return <form onSubmit={submit} className="grid gap-4">
    <label><span className="label">Current password</span><span className="relative block"><LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="currentPassword" type="password" className="field pl-9" autoComplete="current-password" required /></span></label>
    <label><span className="label">New password</span><span className="relative block"><ShieldCheck className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="newPassword" type="password" minLength={8} className="field pl-9" autoComplete="new-password" required /></span></label>
    <label><span className="label">Confirm new password</span><span className="relative block"><ShieldCheck className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input name="confirmPassword" type="password" minLength={8} className="field pl-9" autoComplete="new-password" required /></span></label>
    <button disabled={loading} className="btn-primary mt-2 w-full disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Update password<ArrowRight className="h-4 w-4" /></button>
  </form>
}
