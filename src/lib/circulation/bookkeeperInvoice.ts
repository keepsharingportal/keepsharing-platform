// Shared builder for the bookkeeper's invoice-summary email.
//
// Called from two places:
//   1. /api/circulation/driver (submitOneDelivery) — fires once when a
//      driver flips a route from draft → submitted.
//   2. /api/admin/circulation/deliveries (resend-bookkeeper-invoices
//      action) — bulk-fires for every already-submitted row in a month,
//      e.g. when the bookkeeper email is first configured and the admin
//      needs to catch her up on the current cycle.
//
// One shared builder keeps the two entry points from drifting.

import { enqueue } from '@/lib/circulation/emailQueue'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMonth(m: string): string {
  if (!m) return ''
  const d = new Date(m + '-01T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export interface BookkeeperInvoiceInput {
  market:        string
  deliveryId:    string
  driverId:      string
  driverName:    string
  routeName:     string
  month:         string          // YYYY-MM
  stops:         number
  ratePerStop:   number
  stopPay:       number
  gasAmount:     number
  driverNotes:   string | null
  bookkeeperEmail: string
  opsEmailReplyTo?: string | null
}

/** Build the subject + HTML body used across both submit and resend paths. */
export function buildBookkeeperInvoice(input: BookkeeperInvoiceInput): { subject: string; html: string } {
  const monthLabel = formatMonth(input.month)
  const total      = input.stopPay + input.gasAmount
  const subject    = `Invoice — ${input.driverName || 'Driver'} · ${input.routeName || 'Route'} · ${monthLabel}`
  const notesRow   = input.driverNotes?.trim()
    ? `<p style="margin:14px 0 0;font-size:13px;color:#333;"><strong>Driver notes:</strong> ${escapeHtml(input.driverNotes.trim())}</p>`
    : ''
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:520px;">
      <p style="margin:0 0 12px;">A driver submitted a route invoice. Details for payment:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tbody>
          <tr><td style="padding:6px 0;color:#555;">Driver</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(input.driverName)}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Route</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(input.routeName)}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Month</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(monthLabel)}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Stops delivered</td><td style="padding:6px 0;font-weight:600;">${input.stops}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Rate per stop</td><td style="padding:6px 0;font-weight:600;">$${input.ratePerStop.toFixed(2)}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Stop pay</td><td style="padding:6px 0;font-weight:600;">$${input.stopPay.toFixed(2)}</td></tr>
          <tr><td style="padding:6px 0;color:#555;">Gas</td><td style="padding:6px 0;font-weight:600;">$${input.gasAmount.toFixed(2)}</td></tr>
          <tr><td style="padding:10px 0 6px;border-top:1px solid #eee;color:#111;font-weight:700;">Total owed</td><td style="padding:10px 0 6px;border-top:1px solid #eee;font-weight:700;color:#111;">$${total.toFixed(2)}</td></tr>
        </tbody>
      </table>
      ${notesRow}
      <p style="margin:18px 0 0;font-size:12px;color:#666;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/admin/circulation/deliveries" style="color:#1A5FA8;">Open in portal →</a>
      </p>
    </div>`
  return { subject, html }
}

/** Build + enqueue in one call. Returns the queue insert result. */
export async function enqueueBookkeeperInvoice(input: BookkeeperInvoiceInput) {
  const { subject, html } = buildBookkeeperInvoice(input)
  return enqueue({
    market:              input.market,
    template_key:        'bookkeeper_invoice_summary',
    to_email:            input.bookkeeperEmail,
    to_name:             null,
    subject,
    body_html:           html,
    reply_to:            input.opsEmailReplyTo ?? null,
    related_delivery_id: input.deliveryId,
    related_driver_id:   input.driverId,
  })
}
