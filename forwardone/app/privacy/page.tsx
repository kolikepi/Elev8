import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <SiteHeader />
      <section className="container-app py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="section-kicker-blue">Legal</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A1628] sm:text-4xl">Privacy Policy</h1>
          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
            <p>This Privacy Policy explains how ForwardOne handles the information you provide when you request a quote, book a shipment, track a shipment or contact us through this platform.</p>
            <div><h2 className="text-lg font-bold text-[#0A1628]">Information we collect</h2><p className="mt-2">We collect the information you submit to use our services — such as your contact details, shipment origin and destination, and shipment characteristics — so that we can prepare quotations, coordinate shipments and keep you informed of their status.</p></div>
            <div><h2 className="text-lg font-bold text-[#0A1628]">How we use your information</h2><p className="mt-2">Your information is used to provide and improve our logistics services, to communicate with you about your shipments and quotations, and to meet operational and legal requirements associated with international shipping and customs.</p></div>
            <div><h2 className="text-lg font-bold text-[#0A1628]">Sharing</h2><p className="mt-2">We share only the information necessary to carry out your shipment with the parties involved in transporting and clearing it. We do not sell your personal information.</p></div>
            <div><h2 className="text-lg font-bold text-[#0A1628]">Contact</h2><p className="mt-2">For any questions about this policy or your information, contact us at <span suppressHydrationWarning>operations@forwardone.com</span>.</p></div>
            <p className="text-xs text-slate-400">This page is provided for general information and may be updated from time to time.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
