'use client'

import { useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { AlertTriangle, Copy, Plus, Trash2, Upload, Layers, Boxes } from 'lucide-react'
import { calcShipment, validatePieces, round2, type PieceInput } from '@/lib/piece-calc'

const PACKAGE_TYPES = [['BOX', 'Box / carton'], ['PALLET', 'Pallet'], ['CRATE', 'Crate'], ['ENVELOPE', 'Envelope'], ['TUBE', 'Tube'], ['BAG', 'Bag'], ['DRUM', 'Drum'], ['OTHER', 'Other']]

export const emptyPiece: PieceInput = { packageType: 'BOX', quantity: 1, length: '', width: '', height: '', dimensionUnit: 'CM', weight: '', weightUnit: 'KG', stackable: true, description: '', reference: '', customerRef: '' }

type Props = {
  pieces: PieceInput[]
  onChange: (pieces: PieceInput[]) => void
  divisor: number
  restrictions?: Array<Record<string, any>>
  serviceCategory?: string
  carrier?: string
  destCountry?: string
}

export function PieceBuilder({ pieces, onChange, divisor, restrictions, serviceCategory, carrier, destCountry }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const rows = Array.isArray(pieces) && pieces.length ? pieces : [{ ...emptyPiece }]
  const { rows: calc, totals } = useMemo(() => calcShipment(rows, divisor), [rows, divisor])
  const warnings = useMemo(() => validatePieces(rows, restrictions, { serviceCategory, carrier, destCountry }), [rows, restrictions, serviceCategory, carrier, destCountry])

  const set = (index: number, key: keyof PieceInput, value: PieceInput[keyof PieceInput]) => onChange(rows.map((piece, i) => i === index ? { ...(piece ?? emptyPiece), [key]: value } : piece))
  const addPiece = () => onChange([...(rows ?? []), { ...emptyPiece }])
  const duplicatePiece = (index: number) => { const source = rows[index] ?? emptyPiece; const copy = [...rows]; copy.splice(index + 1, 0, { ...source }); onChange(copy) }
  const removePiece = (index: number) => { const next = rows.filter((_p, i) => i !== index); onChange(next.length ? next : [{ ...emptyPiece }]) }
  const clearAll = () => onChange([{ ...emptyPiece }])

  function importFile(file: File | null | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event?.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheet = workbook?.Sheets?.[workbook?.SheetNames?.[0] ?? '']
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, any>>
        if (!json?.length) { toast?.error?.('No rows found in the file.'); return }
        const pick = (row: Record<string, any>, keys: string[]) => { for (const k of Object.keys(row ?? {})) { const norm = k.toLowerCase().replace(/[^a-z0-9]/g, ''); if (keys.includes(norm)) return row[k] } return '' }
        const imported: PieceInput[] = json.map((row) => ({
          packageType: String(pick(row, ['packagetype', 'type', 'package']) || 'BOX').toUpperCase(),
          quantity: Number(pick(row, ['quantity', 'qty', 'pieces', 'count']) || 1),
          length: pick(row, ['length', 'l', 'lengthcm']) || '',
          width: pick(row, ['width', 'w', 'widthcm']) || '',
          height: pick(row, ['height', 'h', 'heightcm']) || '',
          dimensionUnit: String(pick(row, ['dimensionunit', 'dimunit', 'unit']) || 'CM').toUpperCase(),
          weight: pick(row, ['weight', 'weightkg', 'kg', 'wt']) || '',
          weightUnit: String(pick(row, ['weightunit', 'wtunit']) || 'KG').toUpperCase(),
          stackable: !['no', 'false', '0'].includes(String(pick(row, ['stackable']) || 'yes').toLowerCase()),
          description: String(pick(row, ['description', 'desc', 'goods', 'contents']) || ''),
          reference: String(pick(row, ['reference', 'ref']) || ''),
          customerRef: String(pick(row, ['customerref', 'customerreference', 'yourref']) || ''),
        }))
        onChange(imported)
        toast?.success?.(`Imported ${imported.length} line${imported.length === 1 ? '' : 's'} from ${file.name}.`)
      } catch (error: unknown) { console.error(error); toast?.error?.('Could not read that file. Use the CSV/XLSX template columns.') }
    }
    reader.onerror = () => toast?.error?.('Could not read that file.')
    reader.readAsBinaryString(file)
  }

  function downloadTemplate() {
    const rowsT = [{ packageType: 'BOX', quantity: 2, length: 40, width: 30, height: 30, dimensionUnit: 'CM', weight: 12, weightUnit: 'KG', stackable: 'yes', description: 'Spare parts', reference: 'PO-1001', customerRef: '' }]
    const ws = XLSX.utils.json_to_sheet(rowsT)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Pieces')
    XLSX.writeFile(wb, 'forwardone-pieces-template.xlsx')
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-bold text-[#0A1628]"><Boxes className="h-5 w-5 text-green-600" /> Pieces <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{rows.length} line{rows.length === 1 ? '' : 's'} · {totals.totalPieces} pc</span></div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addPiece} className="btn-secondary text-xs"><Plus className="h-4 w-4" /> Add line</button>
        <button type="button" onClick={() => fileRef?.current?.click?.()} className="btn-secondary text-xs"><Upload className="h-4 w-4" /> Import CSV / XLSX</button>
        <button type="button" onClick={downloadTemplate} className="text-xs font-semibold text-green-700 hover:underline">Template</button>
        <button type="button" onClick={clearAll} className="text-xs font-semibold text-red-600 hover:underline">Clear all</button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(e) => { importFile(e?.target?.files?.[0]); if (e?.target) e.target.value = '' }} />
      </div>
    </div>

    {divisor <= 0 ? <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">No volumetric divisor is configured for this service yet, so volumetric weight is shown as 0. An administrator will confirm the chargeable weight during pricing.</div> : null}

    <div className="grid gap-3">{rows.map((piece, index) => { const result = calc[index]; return <div key={`piece-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold text-[#0A1628]"><Layers className="h-4 w-4 text-slate-400" /> Line {index + 1}</p><div className="flex items-center gap-1"><button type="button" title="Duplicate" onClick={() => duplicatePiece(index)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-[#0A1628]"><Copy className="h-4 w-4" /></button><button type="button" title="Remove" onClick={() => removePiece(index)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <label><span className="label">Type</span><select className="field" value={String(piece?.packageType ?? 'BOX')} onChange={(e) => set(index, 'packageType', e?.target?.value ?? 'BOX')}>{PACKAGE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label><span className="label">Qty (identical)</span><input type="number" min="1" className="field" value={String(piece?.quantity ?? 1)} onChange={(e) => set(index, 'quantity', e?.target?.value ?? '1')} /></label>
        <label><span className="label">Length</span><input type="number" min="0" step="0.1" className="field" value={String(piece?.length ?? '')} onChange={(e) => set(index, 'length', e?.target?.value ?? '')} /></label>
        <label><span className="label">Width</span><input type="number" min="0" step="0.1" className="field" value={String(piece?.width ?? '')} onChange={(e) => set(index, 'width', e?.target?.value ?? '')} /></label>
        <label><span className="label">Height</span><input type="number" min="0" step="0.1" className="field" value={String(piece?.height ?? '')} onChange={(e) => set(index, 'height', e?.target?.value ?? '')} /></label>
        <label><span className="label">Dim unit</span><select className="field" value={String(piece?.dimensionUnit ?? 'CM')} onChange={(e) => set(index, 'dimensionUnit', e?.target?.value ?? 'CM')}>{['CM', 'IN', 'M'].map((u) => <option key={u}>{u}</option>)}</select></label>
        <label><span className="label">Weight / unit</span><input type="number" min="0" step="0.1" className="field" value={String(piece?.weight ?? '')} onChange={(e) => set(index, 'weight', e?.target?.value ?? '')} /></label>
        <label><span className="label">Wt unit</span><select className="field" value={String(piece?.weightUnit ?? 'KG')} onChange={(e) => set(index, 'weightUnit', e?.target?.value ?? 'KG')}>{['KG', 'LB'].map((u) => <option key={u}>{u}</option>)}</select></label>
        <label className="col-span-2"><span className="label">Description</span><input className="field" value={String(piece?.description ?? '')} onChange={(e) => set(index, 'description', e?.target?.value ?? '')} placeholder="e.g. spare parts" /></label>
        <label><span className="label">Your ref</span><input className="field" value={String(piece?.customerRef ?? '')} onChange={(e) => set(index, 'customerRef', e?.target?.value ?? '')} /></label>
        <label className="flex items-end pb-2"><span className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#0A1628]"><input type="checkbox" className="h-4 w-4 accent-green-600" checked={Boolean(piece?.stackable)} onChange={(e) => set(index, 'stackable', Boolean(e?.target?.checked))} /> Stackable</span></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>Actual <strong className="text-[#0A1628]">{result?.actualWeight ?? 0} kg</strong></span><span>Volumetric <strong className="text-[#0A1628]">{result?.volumetricWeight ?? 0} kg</strong></span><span>Chargeable <strong className="text-green-700">{result?.chargeableWeight ?? 0} kg</strong></span><span>Volume <strong className="text-[#0A1628]">{result?.volumeM3 ?? 0} m³</strong></span></div>
    </div> }) }</div>

    <div className="grid gap-3 rounded-xl bg-[#0A1628] p-5 text-white sm:grid-cols-4">
      <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total pieces</span><p className="mt-1 text-lg font-bold">{totals.totalPieces}</p></div>
      <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actual weight</span><p className="mt-1 text-lg font-bold">{totals.actualWeight} kg</p></div>
      <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Volumetric</span><p className="mt-1 text-lg font-bold">{totals.volumetricWeight} kg</p></div>
      <div><span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Chargeable weight</span><p className="mt-1 text-lg font-bold text-green-400">{totals.chargeableWeight} kg</p></div>
    </div>
    <p className="text-xs text-slate-400">Chargeable weight is the greater of actual and volumetric weight per piece{divisor > 0 ? ` (volumetric divisor ${divisor})` : ''}. Total volume {totals.volumeM3} m³.</p>

    {warnings.length ? <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-bold text-amber-900"><AlertTriangle className="h-5 w-5" /> Package limits to review ({warnings.length})</p><ul className="grid gap-1 text-xs text-amber-800">{warnings.map((warning, i) => <li key={i} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{warning.message}</li>)}</ul><p className="text-[11px] text-amber-700">Your shipment is not rejected — these items simply require a ForwardOne administrator to approve them before the quotation is issued.</p></div> : null}
  </div>
}
