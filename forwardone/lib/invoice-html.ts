// Single source of truth for the invoice layout — the SAME HTML is used for the in-browser preview, the
// browser Print dialog and the downloaded PDF. Clean A4 business layout, inline CSS only (so it renders
// identically inside an <iframe srcDoc> and in the server-side HTML→PDF converter).

import type { InvoiceViewData } from '@/lib/invoice-view'

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const sym = (ccy: string) => (({ EUR: '€', USD: '$', GBP: '£' } as Record<string, string>)[ccy] ?? '')
const money = (v: number, ccy: string) => `${sym(ccy)}${(Number.isFinite(v) ? v : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function row(label: string, value: string): string {
  if (!value) return ''
  return `<div class="info-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`
}

export function buildInvoiceHtml(data: InvoiceViewData): string {
  const { company, billTo, invoice } = data
  const ccy = invoice.currency || 'EUR'
  const isDraft = invoice.status !== 'FINALIZED'

  const logo = company.logoUrl
    ? `<img src="${esc(company.logoUrl)}" alt="${esc(company.legalName)}" style="max-height:52px;max-width:200px;object-fit:contain" />`
    : `<div class="brand">Forward<span>One</span></div><div class="brand-sub">International Shipping · Albania ↔ Europe</div>`

  const companyLines = [
    company.registeredAddress,
    company.taxId ? `NIPT / Tax ID: ${company.taxId}` : '',
    company.vatNumber ? `VAT: ${company.vatNumber}` : '',
    [company.phone, company.email].filter(Boolean).join(' · '),
    company.website,
  ].filter(Boolean).map((l) => `<div>${esc(l)}</div>`).join('')

  const billToLines = [
    billTo.legalName ? `<div class="party-name">${esc(billTo.legalName)}</div>` : '<div class="party-name">—</div>',
    billTo.tradingName ? `<div>${esc(billTo.tradingName)}</div>` : '',
    billTo.taxId ? `<div>NIPT / Tax ID: ${esc(billTo.taxId)}</div>` : '',
    billTo.address ? `<div>${esc(billTo.address)}</div>` : '',
    [billTo.zip, billTo.city].filter(Boolean).join(' ') ? `<div>${esc([billTo.zip, billTo.city].filter(Boolean).join(' '))}</div>` : '',
    billTo.country ? `<div>${esc(billTo.country)}</div>` : '',
    billTo.phone ? `<div>${esc(billTo.phone)}</div>` : '',
    billTo.email ? `<div>${esc(billTo.email)}</div>` : '',
  ].filter(Boolean).join('')

  const metaLeft = [
    row('Invoice Number', invoice.reference),
    row('Invoice Date', invoice.invoiceDate),
    row('Invoice Status', isDraft ? 'Draft' : 'Finalized'),
    row('Currency', ccy),
    row('Payment Terms', invoice.paymentTerms),
    row('Due Date', invoice.dueDate),
  ].join('')
  const metaRight = [
    row('Shipment Reference', invoice.shipmentReference),
    row('AWB / Tracking', invoice.awb || invoice.tracking),
    row('Route', invoice.route),
    row('Service', invoice.serviceName),
  ].join('')

  const rows = invoice.lines
    .map(
      (l) => `<tr>
        <td>${esc(l.description)}</td>
        <td class="r">${l.qty}</td>
        <td class="r">${money(l.unitPrice, ccy)}</td>
        <td class="r">${money(l.amount, ccy)}</td>
      </tr>`,
    )
    .join('')

  const hasVat = Number(invoice.vatPct) > 0 && Number(invoice.vatAmount) > 0
  const vatBlock = hasVat
    ? `<tr><td colspan="2"></td><td class="label">VAT (${esc(Number(invoice.vatPct).toLocaleString('en-US', { maximumFractionDigits: 2 }))}%)</td><td class="amt">${money(invoice.vatAmount, ccy)}</td></tr>`
    : ''

  const bankLines = [
    company.bankName ? `Bank: ${company.bankName}` : '',
    company.bankAccount ? `Account: ${company.bankAccount}` : '',
    company.iban ? `IBAN: ${company.iban}` : '',
    company.swift ? `SWIFT/BIC: ${company.swift}` : '',
  ].filter(Boolean).map((l) => `<div>${esc(l)}</div>`).join('')

  const draftWatermark = isDraft
    ? `<div class="draft-badge">DRAFT — NOT A FINAL INVOICE</div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(invoice.reference)}</title><style>
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; font-family: 'Helvetica Neue', Arial, sans-serif; }
html, body { margin: 0; padding: 0; }
body { color: #0A1628; font-size: 12px; background: #f1f5f9; }
.sheet { background: #fff; max-width: 210mm; margin: 0 auto; padding: 22px 26px 30px; }
@media screen { body { padding: 24px 12px; } .sheet { box-shadow: 0 8px 30px rgba(15,23,42,.12); border-radius: 6px; } }
@media print { body { background: #fff; } .sheet { box-shadow: none; max-width: none; margin: 0; padding: 0; border-radius: 0; } }
.top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #16A34A; padding-bottom: 16px; margin-bottom: 6px; }
.brand { font-size: 24px; font-weight: 800; color: #0A1628; }
.brand span { color: #16A34A; }
.brand-sub { font-size: 10px; color: #64748b; margin-top: 2px; letter-spacing: .5px; text-transform: uppercase; }
.company-meta { font-size: 10.5px; color: #475569; line-height: 1.55; margin-top: 8px; }
.doc-title { text-align: right; }
.doc-title h1 { margin: 0; font-size: 22px; letter-spacing: 1px; color: #0A1628; }
.doc-title .ref { margin-top: 4px; font-size: 12px; color: #64748b; font-family: 'Helvetica Neue', Arial, sans-serif; }
.draft-badge { display: inline-block; margin-top: 8px; background: #fef3c7; color: #92400e; font-weight: 800; font-size: 10px; letter-spacing: .6px; padding: 4px 10px; border-radius: 6px; }
.section { margin-top: 20px; }
.parties { display: flex; gap: 16px; margin-top: 18px; }
.card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
.card h3 { margin: 0 0 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #16A34A; }
.card .body { font-size: 11.5px; line-height: 1.55; color: #334155; }
.party-name { font-weight: 700; color: #0A1628; font-size: 13px; }
.meta-grid { display: flex; gap: 16px; margin-top: 18px; }
.meta-col { flex: 1; background: #f8fafc; border-radius: 8px; padding: 6px 14px; }
.info-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid #eef2f7; font-size: 11px; }
.info-row:last-child { border-bottom: none; }
.info-row span { color: #64748b; text-transform: uppercase; font-size: 9px; letter-spacing: .5px; align-self: center; }
.info-row b { color: #0A1628; font-size: 12px; text-align: right; }
table { width: 100%; border-collapse: collapse; margin-top: 22px; }
th { background: #0A1628; color: #fff; text-align: left; padding: 9px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; color: #334155; }
.r { text-align: right; }
.muted { color: #64748b; font-size: 10.5px; }
tfoot td { border-bottom: none; }
tfoot .label { text-align: right; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: .4px; }
tfoot .amt { text-align: right; font-weight: 700; color: #0A1628; font-size: 12px; }
tfoot .total .label { color: #0A1628; font-weight: 800; font-size: 12px; }
tfoot .total .amt { font-size: 16px; font-weight: 800; color: #16A34A; border-top: 2px solid #16A34A; }
.bottom { display: flex; gap: 16px; margin-top: 26px; }
.bank { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 11px; line-height: 1.6; color: #334155; }
.bank h3 { margin: 0 0 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #16A34A; }
.foot-note { margin-top: 22px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 10px; color: #64748b; line-height: 1.55; }
</style></head><body><div class="sheet">
<div class="top">
  <div>${logo}<div class="company-meta">${companyLines}</div></div>
  <div class="doc-title"><h1>INVOICE</h1><div class="ref">${esc(invoice.reference)}</div>${draftWatermark}</div>
</div>
<div class="parties">
  <div class="card"><h3>From</h3><div class="body"><div class="party-name">${esc(company.legalName)}</div>${companyLines}</div></div>
  <div class="card"><h3>Bill To</h3><div class="body">${billToLines}</div></div>
</div>
<div class="meta-grid">
  <div class="meta-col">${metaLeft}</div>
  <div class="meta-col">${metaRight}</div>
</div>
<table>
  <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit Price</th><th class="r">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr><td colspan="2"></td><td class="label">${hasVat ? 'Net Subtotal' : 'Subtotal'}</td><td class="amt">${money(invoice.subtotal, ccy)}</td></tr>
    ${vatBlock}
    <tr class="total"><td colspan="2"></td><td class="label">Total Due (${esc(ccy)})</td><td class="amt">${money(invoice.total, ccy)}</td></tr>
  </tfoot>
</table>
<div class="bottom">
  ${bankLines ? `<div class="bank"><h3>Payment Details</h3>${bankLines}</div>` : ''}
  ${company.vatInfo ? `<div class="bank"><h3>Tax Information</h3><div>${esc(company.vatInfo)}</div></div>` : ''}
</div>
${company.footerNote ? `<div class="foot-note">${esc(company.footerNote)}</div>` : ''}
</div></body></html>`
}
