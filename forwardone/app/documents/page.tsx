import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Boxes, FileText } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { DocumentGenerator } from '@/components/document-generator'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login?callbackUrl=/documents')
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white"><div className="container-app flex h-16 items-center justify-between"><Link href="/dashboard" className="flex items-center gap-2 font-bold text-[#0A1628]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A1628]"><Boxes className="h-5 w-5 text-green-400" /></span>Forward<span className="-ml-2 text-green-600">One</span></Link><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><FileText className="h-4 w-4 text-green-600" /> Document Generator</span></div></header>
      <div className="container-app py-8 sm:py-12">
        <div className="mb-8"><p className="section-kicker">Customs documentation</p><h1 className="text-3xl font-bold tracking-tight text-[#0A1628]">Commercial invoice &amp; packing list</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Generate professional, customs-ready documents for your international shipments. Fill in the shipper, consignee and line items, then download a branded PDF.</p></div>
        <DocumentGenerator />
      </div>
    </main>
  )
}
