'use client'

import { useState } from 'react'
import { Download, Eye, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'

// Shared invoice actions (View / Print / Download PDF) for both the admin and customer portals. All three
// use the SAME server-rendered HTML document (GET /api/invoices/[id]/document), so the on-screen preview,
// the printout and the PDF are always identical. Permissions are enforced by that endpoint.
export function InvoiceActions({ invoiceId, size = 'sm' }: { invoiceId: string; size?: 'sm' | 'md' }) {
  const [printBusy, setPrintBusy] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  const btn =
    size === 'md'
      ? 'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60'
      : 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60'

  async function fetchHtml(): Promise<{ html: string; fileName: string }> {
    const r = await fetch(`/api/invoices/${invoiceId}/document`)
    const d = await r?.json?.().catch?.(() => ({}))
    if (!r?.ok || !d?.html) throw new Error(d?.error ?? 'Unable to load invoice document.')
    return { html: d.html, fileName: d.fileName ?? 'invoice.pdf' }
  }

  function view() {
    window.open(`/invoices/${invoiceId}/view`, '_blank', 'noopener,noreferrer')
  }

  async function print() {
    if (printBusy) return
    setPrintBusy(true)
    try {
      const { html } = await fetchHtml()
      const w = window.open('', '_blank')
      if (!w) throw new Error('Please allow pop-ups to print the invoice.')
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.focus()
      // Give the document (and logo image, if any) a moment to lay out before invoking print.
      setTimeout(() => { try { w.print() } catch { /* user can print manually */ } }, 600)
    } catch (e: any) {
      toast?.error?.(e?.message ?? 'Unable to print invoice.')
    } finally {
      setPrintBusy(false)
    }
  }

  async function downloadPdf() {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      const { html, fileName } = await fetchHtml()
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: html, pdf_options: { format: 'A4', print_background: true, margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' } } }),
      })
      const data = await res.json()
      if (!data?.success || !data?.request_id) throw new Error(data?.error || 'Could not start PDF generation.')
      const reqId = data.request_id
      let attempts = 0
      while (attempts < 90) {
        await new Promise((r) => setTimeout(r, 1500)); attempts++
        const s = await fetch('/api/generate-pdf/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: reqId }) })
        const sd = await s.json()
        if (sd?.status === 'SUCCESS' && sd?.pdf_base64) {
          const blob = new Blob([Uint8Array.from(atob(sd.pdf_base64), (c) => c.charCodeAt(0))], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = fileName
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
          setPdfBusy(false); return
        }
        if (sd?.status === 'FAILED') throw new Error(sd?.error || 'PDF generation failed.')
      }
      throw new Error('PDF generation timed out. Please try again.')
    } catch (e: any) {
      toast?.error?.(e?.message ?? 'Unable to download PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={view} className={`${btn} border border-slate-200 bg-white text-[#0A1628] hover:bg-slate-50`}>
        <Eye className="h-4 w-4" /> View Invoice
      </button>
      <button onClick={print} disabled={printBusy} className={`${btn} border border-slate-200 bg-white text-[#0A1628] hover:bg-slate-50`}>
        {printBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Print
      </button>
      <button onClick={downloadPdf} disabled={pdfBusy} className={`${btn} bg-[#16A34A] text-white hover:bg-[#15803d]`}>
        {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
      </button>
    </div>
  )
}
