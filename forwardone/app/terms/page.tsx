import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata = { title: 'Terms & Conditions' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <SiteHeader />
      <section className="container-app py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="section-kicker-blue">Legal</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">Terms &amp; Conditions</h1>
          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
            <p>These Terms &amp; Conditions govern your use of the ForwardOne platform and the logistics services requested through it. By using the platform, you agree to these terms.</p>
            <div><h2 className="text-lg font-bold text-[#0A1628]">Quotations</h2><p className="mt-2">Quotations are prepared based on the shipment details you provide and are reviewed by our team. Final pricing may depend on the accuracy of the information supplied, including weights, dimensions and shipment contents.</p></div>
            <div><h2 className="text-lg font-bold text-[#0A1628]">Bookings and shipments</h2><p className="mt-2">When you confirm a booking, you authorise ForwardOne to coordinate the shipment on your behalf. You are responsible for ensuring that shipment contents are accurately described and permitted for transport.</p></div>
            <div><h2 className="text-lg font-bold text-[#0A1628]">Customs and documentation</h2><p className="mt-2">For international shipments, you are responsible for providing accurate documentation. We assist with customs processes but cannot be responsible for delays caused by incomplete or inaccurate information.</p></div>
            <div><h2 className="text-lg font-bold text-[#0A1628]">Contact</h2><p className="mt-2">For questions about these terms, contact us at <span suppressHydrationWarning>operations@forwardone.com</span>.</p></div>
            <p className="text-xs text-slate-400">This page is provided for general information and may be updated from time to time.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
