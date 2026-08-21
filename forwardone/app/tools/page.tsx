import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { LogisticsTools } from '@/components/logistics-tools'
import { Wrench } from 'lucide-react'

export const metadata = { title: 'Logistics Tools | ForwardOne', description: 'Free logistics calculators — volumetric weight, unit converters, transit time and shipping cost estimators for Albania ↔ Europe shipping.' }

export default function ToolsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-slate-200 bg-white">
          <div className="container-app py-12 md:py-16">
            <span className="section-kicker"><Wrench className="h-3.5 w-3.5" /> Logistics Tools</span>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-[#0A1628] md:text-4xl">Calculators every shipper needs</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Estimate volumetric weight, convert units and currencies, and get indicative transit times and shipping costs for your Albania ↔ Europe shipments. All estimates are for reference — request a quote for a binding price.</p>
          </div>
        </section>
        <section className="container-app py-10 md:py-14">
          <LogisticsTools />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
