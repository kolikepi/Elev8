import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Boxes, ShieldCheck } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { BookingDetailsForm } from '@/components/booking-details-form'

export const dynamic = 'force-dynamic'

// Sprint 2.2.1 Phase A — post-acceptance booking details capture. Owner-only. Never exposes pricing internals.
export default async function BookingPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/login?callbackUrl=/booking/${params?.id ?? ''}`)
  const base = session?.user?.role === 'BUSINESS_CUSTOMER' ? '/business' : '/customer'

  const quote = await prisma.quote.findUnique({ where: { id: params?.id ?? '' }, include: { shipmentPieces: { orderBy: { pieceNumber: 'asc' } } } })
  if (!quote || quote?.userId !== session?.user?.id) redirect(base)
  // Booking details are only relevant after acceptance and before the shipment is booked.
  if (quote?.status === 'BOOKED') redirect(`${base}/quotes/${quote?.id ?? ''}`)
  if (quote?.status !== 'ACCEPTED') redirect(`${base}/quotes/${quote?.id ?? ''}`)

  const safe = serializeData({
    id: quote?.id, reference: quote?.reference, serviceCategory: quote?.serviceCategory, serviceType: quote?.serviceType,
    contentsType: quote?.contentsType, senderJson: quote?.senderJson, receiverJson: quote?.receiverJson,
    weightKg: quote?.weightKg, pieces: quote?.pieces, dimensionsJson: quote?.dimensionsJson,
    dangerousGoods: quote?.dangerousGoods, unNumber: quote?.unNumber, dangerousGoodsClass: quote?.dangerousGoodsClass,
    isCommercial: quote?.isCommercial, commercialValue: quote?.commercialValue, currency: quote?.currency,
    incoterms: quote?.incoterms, goodsDescription: quote?.goodsDescription, specialInstructions: quote?.specialInstructions,
    shipmentPieces: quote?.shipmentPieces, bookingJson: quote?.bookingJson, bookingSubmittedAt: quote?.bookingSubmittedAt,
  })

  return <main className="min-h-screen bg-slate-50"><header className="border-b bg-white"><div className="container-app flex h-16 items-center justify-between"><Link href={base} className="flex items-center gap-2 font-bold text-[#0A1628]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A1628]"><Boxes className="h-5 w-5 text-green-400" /></span>Forward<span className="-ml-2 text-green-600">One</span></Link><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><ShieldCheck className="h-4 w-4 text-green-600" /> Secure booking</span></div></header><div className="container-app py-8 sm:py-12"><div className="mb-8"><p className="section-kicker">Quotation accepted · {safe?.reference ?? ''}</p><h1 className="text-3xl font-bold tracking-tight text-[#0A1628]">Complete your booking details</h1><p className="mt-2 text-sm text-slate-500">Confirm the final pickup, delivery and package information so our team can book your shipment. Your accepted price stays the same unless you change something that affects it.</p></div><BookingDetailsForm quote={safe} base={base} /></div></main>
}
