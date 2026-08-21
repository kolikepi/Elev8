'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function InvoiceViewPage({ params }: { params: { id: string } }) {
  const id = params?.id
  const [html, setHtml] = useState<string>('')
  const [fileName, setFileName] = useState<string>('invoice.pdf')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch(`/api/invoices/${id}/document`)
        const d = await r?.json?.().catch?.(() => ({}))
        if (!r?.ok) throw new Error(d?.error ?? 'Unable to load invoice.')
        if (!alive) return
        setHtml(d?.html ?? '')
        setFileName(d?.fileName ?? 'invoice.pdf')
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'Unable to load invoice.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id])

  function print() {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  async function downloadPdf() {
    if (pdfBusy || !html) return
    setPdfBusy(true)
    setError('')
    try {
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
      setError(e?.message || 'Something went wrong.')
      setPdfBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden">
        <button onClick={() => { if (window.history.length > 1) window.history.back(); else window.close() }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={print} disabled={loading || !!error} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0A1628] transition hover:bg-slate-50 disabled:opacity-50">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={downloadPdf} disabled={loading || pdfBusy || !!error} className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60">
            {pdfBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing PDF...</> : <><Download className="h-4 w-4" /> Download PDF</>}
          </button>
        </div>
      </div>
      {error ? <div className="mx-auto mt-6 max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">{error}</div> : null}
      <div className="flex-1 print:block">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-green-600" /></div>
        ) : (
          <iframe ref={iframeRef} title="Invoice" srcDoc={html} className="h-[calc(100vh-61px)] w-full border-0 bg-white" />
        )}
      </div>
    </div>
  )
}
