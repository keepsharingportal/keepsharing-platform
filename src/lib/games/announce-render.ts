// ── Games announcement email renderer ────────────────────────────────────────
// Renders a short, friendly "new brain games are live!" HTML block that the
// operator sends via GHL on Sunday mornings when the weekly rotation flips.

import { GAMES } from './types'
import type { IsoWeek } from './weekly'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function renderGamesAnnouncementHtml(week: IsoWeek): string {
  const lines: string[] = []
  lines.push(`<!-- River Region Parents — New Brain Games week ${week.week}, ${week.year} -->`)
  lines.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;color:#2b2420;">`)

  // Header
  lines.push(`  <tr><td style="padding:24px 20px 8px;">`)
  lines.push(`    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ef6442;">Weekly Brain Games — Week ${week.week}</p>`)
  lines.push(`    <h1 style="margin:0;font-size:28px;line-height:1.15;color:#2b2420;">This week's puzzles just dropped 🧠</h1>`)
  lines.push(`  </td></tr>`)

  // Lead paragraph
  lines.push(`  <tr><td style="padding:0 20px 16px;">`)
  lines.push(`    <p style="margin:0;font-size:15px;line-height:1.6;color:#2b2420;">`)
  lines.push(`      Six fresh brain games are live on River Region Parents — word searches, parenting trivia, emoji decode, and more. Play any one and you're entered into this month's <strong>$50 prize drawing</strong>. Play all six to stack more entries.`)
  lines.push(`    </p>`)
  lines.push(`  </td></tr>`)

  // Big primary CTA
  lines.push(`  <tr><td style="padding:0 20px 24px;text-align:center;">`)
  lines.push(`    <a href="${SITE}/games" style="display:inline-block;font-size:16px;font-weight:700;color:#ffffff;background:#ef6442;padding:14px 28px;border-radius:9999px;text-decoration:none;">Play this week's games &rarr;</a>`)
  lines.push(`  </td></tr>`)

  // Game grid (2 columns)
  lines.push(`  <tr><td style="padding:0 12px 12px;">`)
  lines.push(`    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">`)
  for (let i = 0; i < GAMES.length; i += 2) {
    const left  = GAMES[i]
    const right = GAMES[i + 1]
    lines.push(`      <tr>`)
    for (const g of [left, right].filter(Boolean)) {
      lines.push(`        <td valign="top" width="50%" style="padding:6px;">`)
      lines.push(`          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border:1px solid #e0dbd1;border-radius:12px;">`)
      lines.push(`            <tr><td style="padding:14px 16px;">`)
      lines.push(`              <p style="margin:0 0 6px;font-size:22px;line-height:1;">${g.emoji}</p>`)
      lines.push(`              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#2b2420;">${escapeHtml(g.title)}</p>`)
      lines.push(`              <p style="margin:0 0 10px;font-size:12px;color:#70645b;line-height:1.5;">${escapeHtml(g.desc)}</p>`)
      lines.push(`              <a href="${SITE}/games/${g.id}?diff=easy" style="font-size:12px;font-weight:700;color:#ef6442;text-decoration:none;">Play now &rarr;</a>`)
      lines.push(`            </td></tr>`)
      lines.push(`          </table>`)
      lines.push(`        </td>`)
    }
    if (!right) lines.push(`        <td width="50%"></td>`)  // keep grid balanced
    lines.push(`      </tr>`)
  }
  lines.push(`    </table>`)
  lines.push(`  </td></tr>`)

  // Drawing reminder
  lines.push(`  <tr><td style="padding:16px 20px;">`)
  lines.push(`    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff7e8;border:1px solid #f3bf24;border-radius:12px;">`)
  lines.push(`      <tr><td style="padding:14px 16px;">`)
  lines.push(`        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#2b2420;">🎁 Every play is an entry</p>`)
  lines.push(`        <p style="margin:0;font-size:13px;color:#2b2420;line-height:1.5;">Finish any game and submit your score to enter our $50 monthly drawing. Play all six for the best odds. Winner announced at the end of the month.</p>`)
  lines.push(`      </td></tr>`)
  lines.push(`    </table>`)
  lines.push(`  </td></tr>`)

  // Footer
  lines.push(`  <tr><td style="padding:16px 20px 24px;border-top:1px solid #e0dbd1;">`)
  lines.push(`    <p style="margin:0;font-size:12px;color:#70645b;text-align:center;">Sponsored by <strong style="color:#ef6442;">Brainy Kids Academy</strong> &middot; <a href="${SITE}/calendar" style="color:#70645b;text-decoration:none;">See the family calendar</a></p>`)
  lines.push(`  </td></tr>`)

  lines.push(`</table>`)
  return lines.join('\n')
}
