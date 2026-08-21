import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Boxes, Sparkles } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { SmartQuoteBuilder } from '@/components/smart-quote-builder'

export const dynamic = 'force-dynamic'
export default async function AssistantPage({ searchParams }: { searchParams?: { draft?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login?callbackUrl=/quote/assistant')
  const initialDraftId = String(searchParams?.draft ?? '')
  return <main className="min-h-screen bg-slate-50"><header className="border-b bg-white"><div className="container-app flex h-16 items-center justify-between"><Link href="/dashboard" className="flex items-center gap-2 font-bold text-[#0A1628]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A1628]"><Boxes className="h-5 w-5 text-green-400" /></span>Forward<span className="-ml-2 text-green-600">One</span></Link><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Sparkles className="h-4 w-4 text-green-600" /> AI Shipment Assistant</span></div></header><div className="container-app py-8 sm:py-12"><div className="mb-8"><p className="section-kicker">AI-powered intake</p><h1 className="text-3xl font-bold tracking-tight text-[#0A1628]">Describe your shipment in plain language</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Our assistant extracts the route, cargo and customs details, flags required documents and suggests the right services. It never quotes prices &mdash; a ForwardOne specialist finalises every quotation manually.</p></div><SmartQuoteBuilder initialDraftId={initialDraftId} /></div></main>
}
