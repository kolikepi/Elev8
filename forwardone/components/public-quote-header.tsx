import Link from 'next/link'
import { Boxes, LockKeyhole } from 'lucide-react'

export function PublicQuoteHeader() {
  return <header className="border-b bg-white"><div className="container-app flex h-16 items-center justify-between"><Link href="/" className="flex items-center gap-2 font-bold text-[#0A1628]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A1628]"><Boxes className="h-5 w-5 text-green-400" /></span>Forward<span className="-ml-2 text-green-600">One</span></Link><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><LockKeyhole className="h-4 w-4 text-green-600" /> Secure quote request</span></div></header>
}
