// Professional branded HTML email templates + sender for ForwardOne.
// All sends are best-effort: failures (including user-disabled notifications) are swallowed
// so the core request flow never breaks.
import { customerServiceLabel } from './customer-service-label'

const NAVY = '#0A1628'
const GREEN = '#16A34A'
const OWNER_EMAIL = 'kolikepi@gmail.com'

function hostname(): string {
  try { return new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000').hostname } catch { return 'localhost' }
}
function appUrl(): string { return process.env.NEXTAUTH_URL ?? 'http://localhost:3000' }

type Row = any

// Shared responsive shell with ForwardOne branding.
function shell(opts: { heading: string; intro: string; rows?: Array<[string, string]>; ctaLabel?: string; ctaHref?: string; note?: string; accent?: string }): string {
  const accent = opts?.accent ?? GREEN
  const rows = (opts?.rows ?? []).map(([label, value]) => `<tr><td style="padding:10px 0;color:#64748b;font-size:13px;">${label}</td><td style="padding:10px 0;color:${NAVY};font-size:14px;font-weight:600;text-align:right;">${value ?? ''}</td></tr>`).join('')
  const cta = opts?.ctaLabel && opts?.ctaHref ? `<tr><td style="padding-top:28px;"><a href="${opts?.ctaHref}" style="display:inline-block;background:${GREEN};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 26px;border-radius:10px;">${opts?.ctaLabel}</a></td></tr>` : ''
  const note = opts?.note ? `<tr><td style="padding-top:22px;"><div style="background:#f1f5f9;border-left:4px solid ${accent};border-radius:8px;padding:14px 16px;color:#475569;font-size:13px;line-height:20px;">${opts?.note}</div></td></tr>` : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);">
    <tr><td style="background:${NAVY};padding:26px 32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">Forward<span style="color:${GREEN};">One</span></span>
      <span style="float:right;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding-top:6px;">Albania &#8596; Europe</span>
    </td></tr>
    <tr><td style="padding:34px 32px 8px;"><h1 style="margin:0;color:${NAVY};font-size:22px;font-weight:800;">${opts?.heading}</h1></td></tr>
    <tr><td style="padding:6px 32px 0;color:#475569;font-size:15px;line-height:24px;">${opts?.intro}</td></tr>
    <tr><td style="padding:20px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${rows}</table></td></tr>
    <tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cta}${note}</table></td></tr>
    <tr><td style="padding:34px 32px 30px;"><p style="margin:0;color:#94a3b8;font-size:12px;line-height:18px;">This message was sent by ForwardOne, your international courier &amp; freight workspace for shipments between Albania and Europe. Prices are always confirmed by a ForwardOne operator before they reach your account.</p></td></tr>
    <tr><td style="background:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:11px;">&copy; 2026 ForwardOne &middot; Tirana, Albania</p></td></tr>
  </table></td></tr></table></body></html>`
}

async function send(opts: { notificationId?: string; recipientEmail: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  if (!opts?.notificationId || !opts?.recipientEmail) return
  try {
    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: opts?.notificationId,
        subject: opts?.subject,
        body: opts?.html,
        is_html: true,
        recipient_email: opts?.recipientEmail,
        reply_to: opts?.replyTo,
        sender_email: `noreply@${hostname()}`,
        sender_alias: 'ForwardOne',
      }),
    })
    const result = await response?.json?.().catch?.(() => ({})) ?? {}
    if (!result?.success && !result?.notification_disabled) console.error('Email send failed:', result?.message ?? 'unknown error')
  } catch (error: unknown) { console.error('Email send error:', error) }
}

const route = (q: Row): string => `${String((q?.senderJson as Row)?.city ?? '—')} \u2192 ${String((q?.receiverJson as Row)?.city ?? '—')}`
const money = (x: unknown, ccy = 'EUR') => `${ccy} ${(Number(x ?? 0) || 0).toFixed(2)}`

// 1. Quote received — to customer
export async function emailQuoteReceived(user: Row, quote: Row): Promise<void> {
  const html = shell({ heading: 'We\u2019ve received your quote request', intro: `Hi ${String(user?.name ?? 'there').split(' ')[0]}, thank you for choosing ForwardOne. Your request <strong>${String(quote?.reference ?? '')}</strong> is now with our operations team for manual review.`, rows: [['Reference', String(quote?.reference ?? '')], ['Route', route(quote)], ['Shipment', `${Number(quote?.pieces ?? 0)} pc \u00b7 ${Number(quote?.weightKg ?? 0)} kg`], ['Status', 'Pending review']], ctaLabel: 'View request', ctaHref: `${appUrl()}/dashboard`, note: 'No price is generated automatically. A ForwardOne operator reviews carrier options and confirms your quotation manually \u2014 you\u2019ll be notified the moment it\u2019s ready.' })
  await send({ notificationId: process.env.NOTIF_ID_QUOTE_RECEIVED, recipientEmail: String(user?.email ?? ''), subject: `Quote ${String(quote?.reference ?? '')} received \u2014 ForwardOne`, html })
}

// 2. Quote ready — to customer
export async function emailQuoteReady(user: Row, quote: Row, quotation: Row): Promise<void> {
  const ccy = String(quotation?.currency ?? 'EUR')
  const html = shell({ heading: 'Your quotation is ready', intro: `Good news ${String(user?.name ?? 'there').split(' ')[0]} \u2014 our team has reviewed <strong>${String(quote?.reference ?? '')}</strong> and prepared your quotation. Sign in to accept and book your shipment.`, rows: [['Reference', String(quote?.reference ?? '')], ['Route', route(quote)], ['Service', customerServiceLabel(quotation?.carrierSelected as any, quotation?.serviceSelected as any)], ['Final price', money(quotation?.finalPrice, ccy)]], ctaLabel: 'Review & accept', ctaHref: `${appUrl()}/dashboard`, note: String(quotation?.notes ?? '') || 'This price was confirmed manually by a ForwardOne operator.' })
  await send({ notificationId: process.env.NOTIF_ID_QUOTE_READY, recipientEmail: String(user?.email ?? ''), subject: `Quotation ready for ${String(quote?.reference ?? '')} \u2014 ForwardOne`, html })
}

// 3. Quote accepted — to admin/owner
export async function emailQuoteAccepted(user: Row, quote: Row, quotation: Row): Promise<void> {
  const ccy = String(quotation?.currency ?? 'EUR')
  const html = shell({ heading: 'A customer accepted a quotation', intro: `<strong>${String(user?.name ?? '')}</strong> (${String(user?.email ?? '')}) has accepted quotation <strong>${String(quote?.reference ?? '')}</strong>. It\u2019s ready to be booked as a shipment.`, rows: [['Reference', String(quote?.reference ?? '')], ['Customer', String(user?.name ?? '')], ['Route', route(quote)], ['Carrier', String(quotation?.carrierSelected ?? '')], ['Agreed price', money(quotation?.finalPrice, ccy)]], ctaLabel: 'Open in admin', ctaHref: `${appUrl()}/admin/quotes/${String(quote?.id ?? '')}`, accent: NAVY })
  await send({ notificationId: process.env.NOTIF_ID_QUOTE_ACCEPTED, recipientEmail: OWNER_EMAIL, subject: `Accepted: ${String(quote?.reference ?? '')} by ${String(user?.name ?? '')}`, html, replyTo: String(user?.email ?? '') })
}

// 4. Shipment booked — to customer
export async function emailShipmentBooked(user: Row, quote: Row, shipment: Row): Promise<void> {
  const html = shell({ heading: 'Your shipment is booked', intro: `Hi ${String(user?.name ?? 'there').split(' ')[0]}, your shipment for <strong>${String(quote?.reference ?? '')}</strong> is confirmed and in our operational pipeline. Track its progress at any time.`, rows: [['Tracking number', String(shipment?.trackingNumber ?? '')], ['Service', customerServiceLabel(shipment?.carrier as any)], ['Route', `${String(shipment?.origin ?? '')} \u2192 ${String(shipment?.destination ?? '')}`], ['Status', 'Booked']], ctaLabel: 'Track shipment', ctaHref: `${appUrl()}/tracking?number=${encodeURIComponent(String(shipment?.trackingNumber ?? ''))}` })
  await send({ notificationId: process.env.NOTIF_ID_SHIPMENT_BOOKED, recipientEmail: String(user?.email ?? ''), subject: `Shipment ${String(shipment?.trackingNumber ?? '')} booked \u2014 ForwardOne`, html })
}

// 5. Shipment delivered — to customer
export async function emailShipmentDelivered(user: Row, shipment: Row, event?: Row): Promise<void> {
  const html = shell({ heading: 'Delivered \u2014 thank you', intro: `Hi ${String(user?.name ?? 'there').split(' ')[0]}, your shipment <strong>${String(shipment?.trackingNumber ?? '')}</strong> has been delivered successfully. We hope everything arrived in perfect condition.`, rows: [['Tracking number', String(shipment?.trackingNumber ?? '')], ['Route', `${String(shipment?.origin ?? '')} \u2192 ${String(shipment?.destination ?? '')}`], ['Delivered at', String(event?.location ?? shipment?.destination ?? '')], ['Status', 'Delivered']], ctaLabel: 'Ship again', ctaHref: `${appUrl()}/quote/new`, note: 'Need this shipment\u2019s documents again? They remain saved in your ForwardOne document workspace.' })
  await send({ notificationId: process.env.NOTIF_ID_SHIPMENT_DELIVERED, recipientEmail: String(user?.email ?? ''), subject: `Delivered: ${String(shipment?.trackingNumber ?? '')} \u2014 ForwardOne`, html })
}
