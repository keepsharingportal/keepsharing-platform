// ── Newsletter HTML renderer ──────────────────────────────────────────────────
// Produces an email-safe HTML block of "this week's picks" that the operator
// can paste into Mailchimp, Beehiiv, ConvertKit, or whatever sends the
// Weekly Scoop. Inline styles only — email clients ignore <style> tags.

import { getFallbackByContext } from '@/lib/image-fallbacks'

export interface NewsletterPickEvent {
  id:               string
  slug:             string | null
  title:            string
  start_date:       string
  start_time:       string | null
  end_time:         string | null
  location_name:    string | null
  city:             string | null
  description:      string | null
  hero_image_url:   string | null
  registration_url: string | null
  is_free:          boolean | null
  cost_text:        string | null
  category:         string | null
  // Newsletter-pick overrides
  custom_headline:  string | null
  custom_blurb:     string | null
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function trimBlurb(s: string | null | undefined, max = 240): string {
  if (!s) return ''
  const flat = s.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return flat.slice(0, max).trimEnd() + '…'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderNewsletterHtml(
  picks: NewsletterPickEvent[],
  opts: { issue_date: string },
): string {
  const lines: string[] = []
  lines.push(`<!-- River Region Parents — Family Picks for the week of ${fmtDate(opts.issue_date)} -->`)
  lines.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;color:#2b2420;">`)

  // Header
  lines.push(`  <tr><td style="padding:24px 20px 12px;">`)
  lines.push(`    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ef6442;">River Region Parents — Family Picks</p>`)
  lines.push(`    <h1 style="margin:0;font-size:26px;line-height:1.2;color:#2b2420;">Things to do, week of ${escapeHtml(fmtDate(opts.issue_date))}</h1>`)
  lines.push(`  </td></tr>`)

  // Picks
  for (const ev of picks) {
    const title = ev.custom_headline?.trim() || ev.title
    const blurb = trimBlurb(ev.custom_blurb || ev.description)
    const img   = ev.hero_image_url || getFallbackByContext(ev.category ?? 'family', ev.slug ?? ev.id)
    const where = [ev.location_name, ev.city].filter(Boolean).join(', ')
    const when  = ev.start_time ? `${fmtDate(ev.start_date)} · ${ev.start_time}` : fmtDate(ev.start_date)
    const link  = ev.registration_url || `${SITE}/calendar/events/${ev.slug ?? ev.id}`

    lines.push(`  <tr><td style="padding:8px 20px;">`)
    lines.push(`    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border:1px solid #e0dbd1;border-radius:12px;overflow:hidden;">`)
    lines.push(`      <tr>`)
    lines.push(`        <td width="160" valign="top" style="padding:0;">`)
    lines.push(`          <a href="${escapeHtml(link)}" style="display:block;"><img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" width="160" height="120" style="display:block;width:160px;height:120px;object-fit:cover;border:0;" /></a>`)
    lines.push(`        </td>`)
    lines.push(`        <td valign="top" style="padding:12px 14px;">`)
    lines.push(`          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#70645b;">${escapeHtml(when)}</p>`)
    lines.push(`          <h2 style="margin:0 0 6px;font-size:17px;line-height:1.25;color:#2b2420;"><a href="${escapeHtml(link)}" style="color:#2b2420;text-decoration:none;">${escapeHtml(title)}</a></h2>`)
    if (where) {
      lines.push(`          <p style="margin:0 0 6px;font-size:13px;color:#70645b;">${escapeHtml(where)}</p>`)
    }
    if (blurb) {
      lines.push(`          <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#2b2420;">${escapeHtml(blurb)}</p>`)
    }
    const costPill = ev.is_free
      ? `<span style="display:inline-block;font-size:11px;font-weight:700;color:#3d8e8e;background:#e8f4f3;padding:2px 8px;border-radius:9999px;">Free</span>`
      : (ev.cost_text ? `<span style="display:inline-block;font-size:11px;font-weight:600;color:#70645b;background:#eae7e0;padding:2px 8px;border-radius:9999px;">${escapeHtml(ev.cost_text)}</span>` : '')
    const cta = `<a href="${escapeHtml(link)}" style="display:inline-block;font-size:12px;font-weight:700;color:#ffffff;background:#ef6442;padding:6px 12px;border-radius:9999px;text-decoration:none;margin-left:6px;">Details &rarr;</a>`
    lines.push(`          <div>${costPill}${cta}</div>`)
    lines.push(`        </td>`)
    lines.push(`      </tr>`)
    lines.push(`    </table>`)
    lines.push(`  </td></tr>`)
  }

  // Footer
  lines.push(`  <tr><td style="padding:16px 20px 24px;border-top:1px solid #e0dbd1;margin-top:12px;">`)
  lines.push(`    <p style="margin:0;font-size:12px;color:#70645b;text-align:center;">Want more? <a href="${SITE}/calendar" style="color:#ef6442;font-weight:600;text-decoration:none;">See the full family calendar &rarr;</a></p>`)
  lines.push(`  </td></tr>`)
  lines.push(`</table>`)

  return lines.join('\n')
}
