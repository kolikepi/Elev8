'use client'

import { useMemo, useState } from 'react'
import { Box, Scale, Ruler, Coins, Clock, Calculator, ArrowRight } from 'lucide-react'

type Tab = 'volumetric' | 'weight' | 'dimension' | 'currency' | 'transit' | 'cost'

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'volumetric', label: 'Volumetric Weight', icon: Box },
  { id: 'weight', label: 'Weight Converter', icon: Scale },
  { id: 'dimension', label: 'Dimension Converter', icon: Ruler },
  { id: 'currency', label: 'Currency Converter', icon: Coins },
  { id: 'transit', label: 'Transit Time', icon: Clock },
  { id: 'cost', label: 'Shipping Cost', icon: Calculator },
]

const num = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
const fmt = (n: number, d = 2) => (isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}

function Result({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#0A1628]">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function VolumetricTool() {
  const [l, setL] = useState('40'); const [w, setW] = useState('30'); const [h, setH] = useState('25')
  const [divisor, setDivisor] = useState('5000'); const [actual, setActual] = useState('8')
  const vol = useMemo(() => (num(l) * num(w) * num(h)) / (num(divisor) || 5000), [l, w, h, divisor])
  const chargeable = Math.max(vol, num(actual))
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Length (cm)"><input className="field" type="number" value={l} onChange={e => setL(e.target.value)} /></Field>
          <Field label="Width (cm)"><input className="field" type="number" value={w} onChange={e => setW(e.target.value)} /></Field>
          <Field label="Height (cm)"><input className="field" type="number" value={h} onChange={e => setH(e.target.value)} /></Field>
        </div>
        <Field label="Volumetric divisor">
          <select className="field" value={divisor} onChange={e => setDivisor(e.target.value)}>
            <option value="5000">5000 — Air / Express courier</option>
            <option value="6000">6000 — Economy air</option>
            <option value="4000">4000 — Road freight</option>
            <option value="3000">3000 — Sea / consolidated</option>
          </select>
        </Field>
        <Field label="Actual (gross) weight (kg)"><input className="field" type="number" value={actual} onChange={e => setActual(e.target.value)} /></Field>
      </div>
      <div className="grid content-start gap-4">
        <Result label="Volumetric weight" value={`${fmt(vol)} kg`} hint={`(${l} × ${w} × ${h}) ÷ ${divisor}`} />
        <Result label="Chargeable weight" value={`${fmt(chargeable)} kg`} hint={chargeable > vol ? 'Actual weight is higher' : 'Volumetric weight is higher'} />
      </div>
    </div>
  )
}

const WEIGHT_UNITS: Record<string, number> = { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.0283495231 }
function WeightTool() {
  const [val, setVal] = useState('10'); const [from, setFrom] = useState('kg'); const [to, setTo] = useState('lb')
  const out = (num(val) * WEIGHT_UNITS[from]) / WEIGHT_UNITS[to]
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <Field label="Value"><input className="field" type="number" value={val} onChange={e => setVal(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><select className="field" value={from} onChange={e => setFrom(e.target.value)}>{Object.keys(WEIGHT_UNITS).map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
          <Field label="To"><select className="field" value={to} onChange={e => setTo(e.target.value)}>{Object.keys(WEIGHT_UNITS).map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
        </div>
      </div>
      <div className="grid content-start gap-4"><Result label="Converted weight" value={`${fmt(out, 3)} ${to}`} hint={`${val} ${from} = ${fmt(out, 3)} ${to}`} /></div>
    </div>
  )
}

const DIM_UNITS: Record<string, number> = { cm: 1, mm: 0.1, m: 100, in: 2.54, ft: 30.48 }
function DimensionTool() {
  const [val, setVal] = useState('100'); const [from, setFrom] = useState('cm'); const [to, setTo] = useState('in')
  const out = (num(val) * DIM_UNITS[from]) / DIM_UNITS[to]
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <Field label="Value"><input className="field" type="number" value={val} onChange={e => setVal(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><select className="field" value={from} onChange={e => setFrom(e.target.value)}>{Object.keys(DIM_UNITS).map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
          <Field label="To"><select className="field" value={to} onChange={e => setTo(e.target.value)}>{Object.keys(DIM_UNITS).map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
        </div>
      </div>
      <div className="grid content-start gap-4"><Result label="Converted length" value={`${fmt(out, 3)} ${to}`} hint={`${val} ${from} = ${fmt(out, 3)} ${to}`} /></div>
    </div>
  )
}

// Static indicative rates relative to 1 EUR. For reference only.
const RATES: Record<string, { rate: number; sym: string }> = {
  EUR: { rate: 1, sym: '€' }, USD: { rate: 1.08, sym: '$' }, GBP: { rate: 0.85, sym: '£' },
  ALL: { rate: 98.5, sym: 'L' }, CHF: { rate: 0.94, sym: 'CHF' },
}
function CurrencyTool() {
  const [val, setVal] = useState('100'); const [from, setFrom] = useState('EUR'); const [to, setTo] = useState('ALL')
  const inEur = num(val) / RATES[from].rate
  const out = inEur * RATES[to].rate
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <Field label="Amount"><input className="field" type="number" value={val} onChange={e => setVal(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><select className="field" value={from} onChange={e => setFrom(e.target.value)}>{Object.keys(RATES).map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
          <Field label="To"><select className="field" value={to} onChange={e => setTo(e.target.value)}>{Object.keys(RATES).map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
        </div>
      </div>
      <div className="grid content-start gap-4">
        <Result label="Converted amount" value={`${RATES[to].sym} ${fmt(out)}`} hint={`Indicative rate only — not a live FX feed`} />
      </div>
    </div>
  )
}

// Indicative transit lanes (business days) from Albania. Reference only.
const LANES: Record<string, { express: number; economy: number; road: number }> = {
  'Italy': { express: 2, economy: 4, road: 3 },
  'Germany': { express: 2, economy: 5, road: 5 },
  'France': { express: 3, economy: 5, road: 6 },
  'United Kingdom': { express: 3, economy: 6, road: 7 },
  'Greece': { express: 2, economy: 3, road: 2 },
  'Spain': { express: 3, economy: 6, road: 7 },
  'Netherlands': { express: 3, economy: 5, road: 6 },
  'Rest of Europe': { express: 4, economy: 7, road: 8 },
}
function TransitTool() {
  const [dest, setDest] = useState('Italy'); const [svc, setSvc] = useState<'express' | 'economy' | 'road'>('express')
  const days = LANES[dest][svc]
  const label = svc === 'express' ? 'Express courier' : svc === 'economy' ? 'Economy courier' : 'Road freight'
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <Field label="Destination country"><select className="field" value={dest} onChange={e => setDest(e.target.value)}>{Object.keys(LANES).map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
        <Field label="Service type"><select className="field" value={svc} onChange={e => setSvc(e.target.value as any)}><option value="express">Express courier</option><option value="economy">Economy courier</option><option value="road">Road freight</option></select></Field>
      </div>
      <div className="grid content-start gap-4"><Result label="Estimated transit time" value={`${days}–${days + 1} business days`} hint={`${label} · Tirana → ${dest}. Indicative only.`} /></div>
    </div>
  )
}

function CostTool() {
  const [weight, setWeight] = useState('10'); const [rate, setRate] = useState('4.5')
  const [fuelPct, setFuelPct] = useState('12'); const [minCharge, setMinCharge] = useState('25'); const [cur, setCur] = useState('EUR')
  const base = num(weight) * num(rate)
  const afterMin = Math.max(base, num(minCharge))
  const fuel = afterMin * (num(fuelPct) / 100)
  const total = afterMin + fuel
  const sym = RATES[cur]?.sym ?? '€'
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Chargeable weight (kg)"><input className="field" type="number" value={weight} onChange={e => setWeight(e.target.value)} /></Field>
          <Field label="Rate per kg"><input className="field" type="number" value={rate} onChange={e => setRate(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fuel surcharge (%)"><input className="field" type="number" value={fuelPct} onChange={e => setFuelPct(e.target.value)} /></Field>
          <Field label="Minimum charge"><input className="field" type="number" value={minCharge} onChange={e => setMinCharge(e.target.value)} /></Field>
        </div>
        <Field label="Currency"><select className="field" value={cur} onChange={e => setCur(e.target.value)}>{Object.keys(RATES).map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
      </div>
      <div className="grid content-start gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between py-1"><span className="text-slate-500">Base ({weight} kg × {rate})</span><span className="font-medium">{sym} {fmt(base)}</span></div>
          <div className="flex justify-between py-1"><span className="text-slate-500">After minimum charge</span><span className="font-medium">{sym} {fmt(afterMin)}</span></div>
          <div className="flex justify-between py-1"><span className="text-slate-500">Fuel surcharge ({fuelPct}%)</span><span className="font-medium">{sym} {fmt(fuel)}</span></div>
        </div>
        <Result label="Estimated shipping cost" value={`${sym} ${fmt(total)}`} hint="Estimate only — request a formal quote for a binding price." />
      </div>
    </div>
  )
}

export function LogisticsTools() {
  const [tab, setTab] = useState<Tab>('volumetric')
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="grid content-start gap-1.5">
        {TABS.map(t => {
          const Icon = t.icon; const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${active ? 'bg-[#0A1628] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
              <Icon className={`h-4 w-4 ${active ? 'text-green-400' : 'text-slate-400'}`} />{t.label}
            </button>
          )
        })}
      </aside>
      <div className="glass-card p-6 md:p-8">
        {tab === 'volumetric' && <VolumetricTool />}
        {tab === 'weight' && <WeightTool />}
        {tab === 'dimension' && <DimensionTool />}
        {tab === 'currency' && <CurrencyTool />}
        {tab === 'transit' && <TransitTool />}
        {tab === 'cost' && <CostTool />}
        <div className="mt-8 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Need a binding, customs-ready price for your shipment?</p>
          <a href="/quote/start" className="btn-primary min-h-10 whitespace-nowrap px-4">Get a quote <ArrowRight className="h-4 w-4" /></a>
        </div>
      </div>
    </div>
  )
}
