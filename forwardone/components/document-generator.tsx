'use client'

import { useState } from 'react'
import { FileText, Plus, Trash2, Download, Loader2, ClipboardList } from 'lucide-react'

type DocType = 'invoice' | 'packing'
type Line = { description: string; hsCode: string; origin: string; qty: string; unit: string; unitValue: string; netWeight: string; grossWeight: string }

const emptyLine = (): Line => ({ description: '', hsCode: '', origin: 'Albania', qty: '1', unit: 'pcs', unitValue: '0', netWeight: '0', grossWeight: '0' })
const n = (v: string) => { const x = parseFloat(v); return isNaN(x) ? 0 : x }
const money = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const esc = (s: string) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}

export function DocumentGenerator() {
  const [docType, setDocType] = useState<DocType>('invoice')
  const [docNo, setDocNo] = useState('CI-' + new Date().getFullYear() + '-0001')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [incoterm, setIncoterm] = useState('DAP')
  const [currency, setCurrency] = useState('EUR')
  const [reason, setReason] = useState('Sale of goods')
  const [shipper, setShipper] = useState('')
  const [consignee, setConsignee] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const delLine = (i: number) => setLines(ls => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls))

  const totalValue = lines.reduce((s, l) => s + n(l.qty) * n(l.unitValue), 0)
  const totalNet = lines.reduce((s, l) => s + n(l.netWeight), 0)
  const totalGross = lines.reduce((s, l) => s + n(l.grossWeight), 0)
  const totalQty = lines.reduce((s, l) => s + n(l.qty), 0)

  const buildHtml = () => {
    const isInv = docType === 'invoice'
    const title = isInv ? 'COMMERCIAL INVOICE' : 'PACKING LIST'
    const head = isInv
      ? `<th>#</th><th>Description of goods</th><th>HS code</th><th>Origin</th><th class="r">Qty</th><th>Unit</th><th class="r">Unit value</th><th class="r">Total value</th>`
      : `<th>#</th><th>Description of goods</th><th>HS code</th><th>Origin</th><th class="r">Qty</th><th>Unit</th><th class="r">Net (kg)</th><th class="r">Gross (kg)</th>`
    const rows = lines.map((l, i) => isInv
      ? `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td>${esc(l.hsCode)}</td><td>${esc(l.origin)}</td><td class="r">${esc(l.qty)}</td><td>${esc(l.unit)}</td><td class="r">${money(n(l.unitValue))}</td><td class="r">${money(n(l.qty) * n(l.unitValue))}</td></tr>`
      : `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td>${esc(l.hsCode)}</td><td>${esc(l.origin)}</td><td class="r">${esc(l.qty)}</td><td>${esc(l.unit)}</td><td class="r">${money(n(l.netWeight))}</td><td class="r">${money(n(l.grossWeight))}</td></tr>`
    ).join('')
    const totalsRow = isInv
      ? `<tr class="tot"><td colspan="4">TOTAL</td><td class="r">${money(totalQty)}</td><td></td><td></td><td class="r">${currency} ${money(totalValue)}</td></tr>`
      : `<tr class="tot"><td colspan="4">TOTAL</td><td class="r">${money(totalQty)}</td><td></td><td class="r">${money(totalNet)}</td><td class="r">${money(totalGross)}</td></tr>`
    const metaRight = isInv
      ? `<div><span>Incoterms</span><b>${esc(incoterm)}</b></div><div><span>Currency</span><b>${esc(currency)}</b></div><div><span>Reason for export</span><b>${esc(reason)}</b></div>`
      : `<div><span>Incoterms</span><b>${esc(incoterm)}</b></div><div><span>Total packages</span><b>${money(totalQty)}</b></div><div><span>Total gross weight</span><b>${money(totalGross)} kg</b></div>`
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;font-family:'Helvetica Neue',Arial,sans-serif}body{margin:0;color:#0A1628;font-size:12px}
.wrap{padding:4px}
.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #16A34A;padding-bottom:14px;margin-bottom:18px}
.brand{font-size:22px;font-weight:800;color:#0A1628}.brand span{color:#16A34A}
.brand-sub{font-size:10px;color:#64748b;margin-top:2px;letter-spacing:.5px;text-transform:uppercase}
.doc-title{text-align:right}.doc-title h1{margin:0;font-size:18px;letter-spacing:1px;color:#0A1628}.doc-title p{margin:3px 0 0;font-size:11px;color:#64748b}
.parties{display:flex;gap:16px;margin-bottom:16px}
.card{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px}
.card h3{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#16A34A}
.card .body{white-space:pre-line;font-size:12px;line-height:1.5;min-height:56px}
.meta{display:flex;gap:24px;flex-wrap:wrap;background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:16px}
.meta div{font-size:11px}.meta span{display:block;color:#64748b;text-transform:uppercase;font-size:9px;letter-spacing:.5px}.meta b{font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:4px}
th{background:#0A1628;color:#fff;text-align:left;padding:8px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px}
td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
.r{text-align:right}tr.tot td{background:#f0fdf4;font-weight:800;border-top:2px solid #16A34A}
.foot{margin-top:26px;display:flex;justify-content:space-between;gap:24px}
.sign{flex:1;border-top:1px solid #94a3b8;padding-top:6px;font-size:10px;color:#64748b}
.declare{margin-top:22px;font-size:10px;color:#64748b;line-height:1.5;border-top:1px dashed #cbd5e1;padding-top:10px}
</style></head><body><div class="wrap">
<div class="top"><div><div class="brand">Forward<span>One</span></div><div class="brand-sub">International Shipping · Albania ↔ Europe</div></div>
<div class="doc-title"><h1>${title}</h1><p>No. ${esc(docNo)}</p><p>Date: ${esc(date)}</p></div></div>
<div class="parties"><div class="card"><h3>Shipper / Exporter</h3><div class="body">${esc(shipper) || '—'}</div></div>
<div class="card"><h3>Consignee / Importer</h3><div class="body">${esc(consignee) || '—'}</div></div></div>
<div class="meta">${metaRight}</div>
<table><thead><tr>${head}</tr></thead><tbody>${rows}${totalsRow}</tbody></table>
${isInv ? `<div class="declare">I/we hereby certify that the information on this invoice is true and correct and that the contents of this shipment are as stated above. These goods are of the origin indicated and are for the stated value.</div>` : `<div class="declare">This packing list details the contents of the above shipment. Weights and package counts are declared by the shipper.</div>`}
<div class="foot"><div class="sign">Authorised signature</div><div class="sign">Company stamp</div><div class="sign">Date &amp; place</div></div>
</div></body></html>`
  }

  const generate = async () => {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: buildHtml(), pdf_options: { format: 'A4', print_background: true, margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' } } }),
      })
      const data = await res.json()
      if (!data?.success || !data?.request_id) throw new Error(data?.error || 'Could not start PDF generation')
      const reqId = data.request_id
      let attempts = 0
      while (attempts < 90) {
        await new Promise(r => setTimeout(r, 1500)); attempts++
        const s = await fetch('/api/generate-pdf/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: reqId }) })
        const sd = await s.json()
        if (sd?.status === 'SUCCESS' && sd?.pdf_base64) {
          const blob = new Blob([Uint8Array.from(atob(sd.pdf_base64), c => c.charCodeAt(0))], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = `${docType === 'invoice' ? 'commercial-invoice' : 'packing-list'}-${docNo}.pdf`
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
          setBusy(false); return
        }
        if (sd?.status === 'FAILED') throw new Error(sd?.error || 'PDF generation failed')
      }
      throw new Error('PDF generation timed out. Please try again.')
    } catch (e: any) {
      setError(e?.message || 'Something went wrong'); setBusy(false)
    }
  }

  const switchType = (t: DocType) => {
    setDocType(t)
    setDocNo((t === 'invoice' ? 'CI-' : 'PL-') + new Date().getFullYear() + '-0001')
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => switchType('invoice')} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${docType === 'invoice' ? 'bg-[#0A1628] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}><FileText className="h-4 w-4" /> Commercial Invoice</button>
        <button onClick={() => switchType('packing')} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${docType === 'packing' ? 'bg-[#0A1628] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}><ClipboardList className="h-4 w-4" /> Packing List</button>
      </div>

      <div className="glass-card grid gap-5 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Document no."><input className="field" value={docNo} onChange={e => setDocNo(e.target.value)} /></Field>
          <Field label="Date"><input className="field" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Incoterms"><select className="field" value={incoterm} onChange={e => setIncoterm(e.target.value)}>{['DAP', 'DDP', 'EXW', 'FCA', 'CPT', 'CIP', 'DPU'].map(x => <option key={x}>{x}</option>)}</select></Field>
          {docType === 'invoice'
            ? <Field label="Currency"><select className="field" value={currency} onChange={e => setCurrency(e.target.value)}>{['EUR', 'USD', 'GBP', 'ALL', 'CHF'].map(x => <option key={x}>{x}</option>)}</select></Field>
            : <Field label="Reference"><input className="field" value={reason} onChange={e => setReason(e.target.value)} /></Field>}
        </div>
        {docType === 'invoice' && <Field label="Reason for export"><input className="field" value={reason} onChange={e => setReason(e.target.value)} /></Field>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Shipper / Exporter (name, address, country, tax ID)"><textarea className="field min-h-[96px]" value={shipper} onChange={e => setShipper(e.target.value)} placeholder={'Company name\nStreet, City, Postcode\nAlbania\nVAT / Tax ID'} /></Field>
          <Field label="Consignee / Importer (name, address, country, tax ID)"><textarea className="field min-h-[96px]" value={consignee} onChange={e => setConsignee(e.target.value)} placeholder={'Company name\nStreet, City, Postcode\nCountry\nVAT / EORI'} /></Field>
        </div>
      </div>

      <div className="glass-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><h3 className="font-semibold text-[#0A1628]">Line items</h3><button onClick={addLine} className="btn-secondary min-h-9 px-3 text-sm"><Plus className="h-4 w-4" /> Add item</button></div>
        <div className="divide-y divide-slate-100">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-3 p-4 md:grid-cols-12">
              <div className="md:col-span-4"><Field label={i === 0 ? 'Description' : ''}><input className="field" value={l.description} onChange={e => setLine(i, { description: e.target.value })} placeholder="Description of goods" /></Field></div>
              <div className="md:col-span-2"><Field label={i === 0 ? 'HS code' : ''}><input className="field" value={l.hsCode} onChange={e => setLine(i, { hsCode: e.target.value })} placeholder="e.g. 6109.10" /></Field></div>
              <div className="md:col-span-1"><Field label={i === 0 ? 'Qty' : ''}><input className="field" type="number" value={l.qty} onChange={e => setLine(i, { qty: e.target.value })} /></Field></div>
              {docType === 'invoice' ? (
                <>
                  <div className="md:col-span-2"><Field label={i === 0 ? 'Unit value' : ''}><input className="field" type="number" value={l.unitValue} onChange={e => setLine(i, { unitValue: e.target.value })} /></Field></div>
                  <div className="md:col-span-2 flex items-end"><div className="w-full rounded-lg bg-slate-50 px-3 py-2 text-right text-sm font-semibold text-[#0A1628]">{currency} {money(n(l.qty) * n(l.unitValue))}</div></div>
                </>
              ) : (
                <>
                  <div className="md:col-span-2"><Field label={i === 0 ? 'Net (kg)' : ''}><input className="field" type="number" value={l.netWeight} onChange={e => setLine(i, { netWeight: e.target.value })} /></Field></div>
                  <div className="md:col-span-2"><Field label={i === 0 ? 'Gross (kg)' : ''}><input className="field" type="number" value={l.grossWeight} onChange={e => setLine(i, { grossWeight: e.target.value })} /></Field></div>
                </>
              )}
              <div className="flex items-end md:col-span-1"><button onClick={() => delLine(i)} className="flex h-10 w-full items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove item"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-6 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm">
          <span className="text-slate-500">Total qty: <b className="text-[#0A1628]">{money(totalQty)}</b></span>
          {docType === 'invoice'
            ? <span className="text-slate-500">Total value: <b className="text-[#0A1628]">{currency} {money(totalValue)}</b></span>
            : <><span className="text-slate-500">Net: <b className="text-[#0A1628]">{money(totalNet)} kg</b></span><span className="text-slate-500">Gross: <b className="text-[#0A1628]">{money(totalGross)} kg</b></span></>}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex justify-end">
        <button onClick={generate} disabled={busy} className="btn-primary min-h-11 px-6 disabled:opacity-60">{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…</> : <><Download className="h-4 w-4" /> Generate PDF</>}</button>
      </div>
    </div>
  )
}
