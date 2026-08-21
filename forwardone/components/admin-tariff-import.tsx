'use client'
import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Loader2, Upload, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, FileSpreadsheet, Database } from 'lucide-react'
import { toast } from 'sonner'

type Row = any
const CATEGORY = ['EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT']
const fmt = (x: unknown) => String(x ?? '').split('_').join(' ').replace(/\b\w/g, (c) => c.toUpperCase())
const TARGETS: { key: string; label: string; required?: boolean }[] = [
  { key: 'zone', label: 'Zone' }, { key: 'originCountry', label: 'Origin country' }, { key: 'destCountry', label: 'Destination country' },
  { key: 'weightFrom', label: 'Weight from' }, { key: 'weightTo', label: 'Weight to' }, { key: 'ratePerKg', label: 'Rate per kg' },
  { key: 'additionalKgRate', label: 'Additional kg rate' }, { key: 'flatRate', label: 'Flat rate' }, { key: 'minCharge', label: 'Min charge' }, { key: 'maxCharge', label: 'Max charge' },
]
const STEPS = ['Upload', 'Sheet', 'Map columns', 'Validate', 'Review', 'Import']
const num = (v: unknown) => { const n = Number(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : null }
function guess(header: string): string { const h = String(header ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''); if (/zone/.test(h)) return 'zone'; if (/orig/.test(h)) return 'originCountry'; if (/dest|to(country)?$/.test(h)) return 'destCountry'; if (/from|min.*weight|weightfrom/.test(h)) return 'weightFrom'; if (/to|max.*weight|weightto/.test(h)) return 'weightTo'; if (/addit|extrakg|perkgadd/.test(h)) return 'additionalKgRate'; if (/flat|fixed/.test(h)) return 'flatRate'; if (/minchar|minimum/.test(h)) return 'minCharge'; if (/maxchar|maximum/.test(h)) return 'maxCharge'; if (/rate|perkg|price|cost/.test(h)) return 'ratePerKg'; return '' }

export function TariffImportWizard() {
  const [step, setStep] = useState(0)
  const [meta, setMeta] = useState<Row>({ carrier: '', serviceCategory: 'EXPRESS', name: '', currency: 'EUR' })
  const [fileName, setFileName] = useState('')
  const [wb, setWb] = useState<Row | null>(null)
  const [sheets, setSheets] = useState<string[]>([])
  const [sheet, setSheet] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Row[][]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [jobId, setJobId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ accepted: Row[]; rejected: Row[] } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function onFile(file: File) {
    setFileName(file?.name ?? '')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e?.target?.result
        const book = XLSX.read(data, { type: 'binary' })
        setWb(book); setSheets(book?.SheetNames ?? []); setSheet(book?.SheetNames?.[0] ?? '')
        if (!meta?.name) setMeta((m: Row) => ({ ...m, name: (file?.name ?? '').replace(/\.[^.]+$/, '') }))
        toast?.success?.(`Parsed ${book?.SheetNames?.length ?? 0} sheet(s).`)
      } catch (err) { console.error(err); toast?.error?.('Unable to read this file.') }
    }
    reader.readAsBinaryString(file)
  }
  function loadSheet(name: string) { if (!wb) return; const ws = wb?.Sheets?.[name]; const arr: Row[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }); const hdr = (arr?.[0] ?? []).map((x: Row) => String(x ?? '')); setHeaders(hdr); setRawRows(arr.slice(1)); const auto: Record<string, number> = {}; hdr.forEach((h, i) => { const g = guess(h); if (g && !(g in auto)) auto[g] = i }); setMapping(auto) }

  async function createJob() {
    if (!meta?.carrier) { toast?.error?.('Carrier is required.'); return }
    setBusy(true)
    try { const r = await fetch('/api/admin/tariff-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName, carrier: meta?.carrier, serviceCategory: meta?.serviceCategory, sheets }) }); const d = await r?.json?.().catch?.(() => ({})) ?? {}; if (!r?.ok) throw new Error(d?.error ?? 'Unable to start import.'); setJobId(d?.job?.id ?? ''); loadSheet(sheet); setStep(2) } catch (e: unknown) { console.error(e); toast?.error?.(e instanceof Error ? e.message : 'Unable to start import.') } finally { setBusy(false) }
  }

  function runValidate() {
    const accepted: Row[] = []; const rejected: Row[] = []
    const get = (r: Row[], key: string) => mapping[key] === undefined ? '' : r?.[mapping[key]]
    rawRows.forEach((r, idx) => {
      const rowObj: Row = { zone: String(get(r, 'zone') ?? '').trim(), originCountry: String(get(r, 'originCountry') ?? '').trim(), destCountry: String(get(r, 'destCountry') ?? '').trim(), weightFrom: num(get(r, 'weightFrom')), weightTo: num(get(r, 'weightTo')), ratePerKg: num(get(r, 'ratePerKg')), additionalKgRate: num(get(r, 'additionalKgRate')), flatRate: num(get(r, 'flatRate')), minCharge: num(get(r, 'minCharge')), maxCharge: num(get(r, 'maxCharge')) }
      const hasScope = rowObj.zone || rowObj.originCountry || rowObj.destCountry || rowObj.weightTo
      const hasRate = rowObj.ratePerKg !== null || rowObj.flatRate !== null
      if (!hasScope) { rejected.push({ rowNumber: idx + 2, reason: 'No zone / lane / weight band', raw: r }); return }
      if (!hasRate) { rejected.push({ rowNumber: idx + 2, reason: 'No rate per kg or flat rate', raw: r }); return }
      accepted.push(rowObj)
    })
    setResult({ accepted, rejected })
    if (jobId) void fetch(`/api/admin/tariff-import/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'VALIDATED', sheetName: sheet, mapping, rowsAccepted: accepted.length, rowsRejected: rejected.length, preview: accepted.slice(0, 20), errors: rejected.slice(0, 200) }) }).catch((e) => console.error(e))
    setStep(4)
  }

  async function doImport() {
    if (!result?.accepted?.length) { toast?.error?.('No accepted rows to import.'); return }
    setBusy(true)
    try { const r = await fetch('/api/admin/tariffs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: meta?.name, carrier: meta?.carrier, serviceCategory: meta?.serviceCategory, currency: meta?.currency, jobId, originalFilePath: fileName, rows: result.accepted }) }); const d = await r?.json?.().catch?.(() => ({})) ?? {}; if (!r?.ok) throw new Error(d?.error ?? 'Import failed.'); toast?.success?.(`Imported ${result.accepted.length} rows as a new draft version.`); setStep(5) } catch (e: unknown) { console.error(e); toast?.error?.(e instanceof Error ? e.message : 'Import failed.') } finally { setBusy(false) }
  }
  function reset() { setStep(0); setWb(null); setSheets([]); setSheet(''); setHeaders([]); setRawRows([]); setMapping({}); setJobId(''); setResult(null); setFileName(''); setMeta({ carrier: '', serviceCategory: 'EXPRESS', name: '', currency: 'EUR' }) }

  return <div><div><p className="section-kicker">Rate card import</p><h2 className="text-2xl font-bold text-[#0A1628]">Tariff import wizard</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">Upload an XLSX or CSV rate card, map its columns, review accepted and rejected rows, then import them as a new tariff version. Existing versions are never overwritten.</p></div>
    <div className="mt-6 flex flex-wrap gap-2">{STEPS.map((s, i) => <div key={s} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${i === step ? 'bg-[#0A1628] text-white' : i < step ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i === step ? 'bg-white text-[#0A1628]' : i < step ? 'bg-green-600 text-white' : 'bg-white text-slate-500'}`}>{i < step ? '\u2713' : i + 1}</span>{s}</div>)}</div>
    <div className="mt-5 rounded-xl bg-white p-6 shadow-[var(--shadow-sm)]">
      {step === 0 ? <div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label><span className="label">Carrier</span><input className="field" value={meta?.carrier} onChange={(e) => setMeta((m: Row) => ({ ...m, carrier: e?.target?.value }))} /></label><label><span className="label">Service category</span><select className="field" value={meta?.serviceCategory} onChange={(e) => setMeta((m: Row) => ({ ...m, serviceCategory: e?.target?.value }))}>{CATEGORY.map((c) => <option key={c} value={c}>{fmt(c)}</option>)}</select></label><label><span className="label">Tariff name</span><input className="field" value={meta?.name} onChange={(e) => setMeta((m: Row) => ({ ...m, name: e?.target?.value }))} placeholder="Auto from file" /></label><label><span className="label">Currency</span><select className="field" value={meta?.currency} onChange={(e) => setMeta((m: Row) => ({ ...m, currency: e?.target?.value }))}>{['EUR', 'USD', 'GBP', 'ALL'].map((c) => <option key={c} value={c}>{c}</option>)}</select></label></div>
        <button onClick={() => inputRef.current?.click?.()} className="mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center transition hover:border-green-400 hover:bg-green-50/40"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50"><Upload className="h-6 w-6 text-green-600" /></span><span className="text-sm font-semibold text-[#0A1628]">{fileName || 'Click to upload XLSX or CSV'}</span><span className="text-xs text-slate-400">.xlsx, .xls, .csv</span></button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e?.target?.files?.[0]; if (f) onFile(f) }} />
        <div className="mt-5 flex justify-end"><button disabled={!wb || busy} onClick={createJob} className="btn-primary disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue</button></div></div> : null}

      {step === 1 ? null : null}
      {step === 2 ? <div><div className="mb-4 flex items-center gap-3"><label className="flex-1"><span className="label">Sheet</span><select className="field" value={sheet} onChange={(e) => { setSheet(e?.target?.value); loadSheet(e?.target?.value) }}>{sheets.map((s) => <option key={s} value={s}>{s}</option>)}</select></label><div className="pt-6 text-xs text-slate-500">{rawRows.length} data rows detected</div></div>
        <h3 className="font-bold text-[#0A1628]">Map columns</h3><p className="text-xs text-slate-500">Match each tariff field to a column from your file. Auto-detected where possible.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{TARGETS.map((t) => <label key={t.key}><span className="label">{t.label}</span><select className="field" value={mapping[t.key] ?? ''} onChange={(e) => setMapping((m) => { const n = { ...m }; if (e?.target?.value === '') delete n[t.key]; else n[t.key] = Number(e?.target?.value); return n })}><option value="">\u2014 Not mapped \u2014</option>{headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select></label>)}</div>
        {headers.length ? <div className="mt-5 overflow-x-auto rounded-lg border border-slate-100"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{headers.map((h, i) => <th key={i} className="px-3 py-2">{h || `Col ${i + 1}`}</th>)}</tr></thead><tbody>{rawRows.slice(0, 4).map((r, ri) => <tr key={ri} className="border-t border-slate-100">{headers.map((_, ci) => <td key={ci} className="px-3 py-2 text-slate-600">{String(r?.[ci] ?? '')}</td>)}</tr>)}</tbody></table></div> : null}
        <div className="mt-5 flex justify-between"><button onClick={() => setStep(0)} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back</button><button onClick={runValidate} className="btn-primary"><CheckCircle2 className="h-4 w-4" /> Validate</button></div></div> : null}

      {step === 4 ? <div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg bg-green-50 p-4"><p className="text-2xl font-bold text-green-700">{result?.accepted?.length ?? 0}</p><p className="text-xs text-green-700">Accepted rows</p></div><div className="rounded-lg bg-red-50 p-4"><p className="text-2xl font-bold text-red-700">{result?.rejected?.length ?? 0}</p><p className="text-xs text-red-700">Rejected rows</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-2xl font-bold text-[#0A1628]">{rawRows.length}</p><p className="text-xs text-slate-500">Total rows</p></div></div>
        <h3 className="mt-5 font-bold text-[#0A1628]">Accepted preview</h3><div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-100"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Zone/Lane</th><th className="px-3 py-2">Weight</th><th className="px-3 py-2">Rate/kg</th><th className="px-3 py-2">Flat</th><th className="px-3 py-2">Min</th></tr></thead><tbody>{(result?.accepted ?? []).slice(0, 50).map((r, i) => <tr key={i} className="border-t border-slate-100"><td className="px-3 py-2">{r?.zone || `${r?.originCountry ?? ''}\u2192${r?.destCountry ?? ''}`}</td><td className="px-3 py-2">{r?.weightFrom ?? '\u2014'}\u2013{r?.weightTo ?? '\u2014'}</td><td className="px-3 py-2">{r?.ratePerKg ?? '\u2014'}</td><td className="px-3 py-2">{r?.flatRate ?? '\u2014'}</td><td className="px-3 py-2">{r?.minCharge ?? '\u2014'}</td></tr>)}</tbody></table></div>
        {result?.rejected?.length ? <><h3 className="mt-5 font-bold text-[#0A1628]">Rejected rows</h3><div className="mt-2 max-h-40 overflow-auto rounded-lg border border-red-100"><table className="w-full text-left text-xs"><thead className="bg-red-50 text-red-700"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Reason</th></tr></thead><tbody>{result.rejected.slice(0, 100).map((r, i) => <tr key={i} className="border-t border-red-50"><td className="px-3 py-2">#{r?.rowNumber}</td><td className="px-3 py-2 text-red-700">{r?.reason}</td></tr>)}</tbody></table></div></> : null}
        <div className="mt-5 flex justify-between"><button onClick={() => setStep(2)} className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back to mapping</button><button disabled={busy || !result?.accepted?.length} onClick={doImport} className="btn-primary disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} Import {result?.accepted?.length ?? 0} rows as new version</button></div></div> : null}

      {step === 5 ? <div className="py-8 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50"><CheckCircle2 className="h-7 w-7 text-green-600" /></span><h3 className="mt-4 text-xl font-bold text-[#0A1628]">Import complete</h3><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{result?.accepted?.length ?? 0} rate rows were imported as a new <strong>draft</strong> tariff version. Open it under Tariff modules to review, validate and activate it.</p><button onClick={reset} className="btn-primary mt-6"><FileSpreadsheet className="h-4 w-4" /> Import another file</button></div> : null}
    </div>
  </div>
}
