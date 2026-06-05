// Circulation email library.
//
// Variable substitution: PHP-style {{name}} tokens are replaced with values
// from a context object. Unknown tokens stay literal so a typo in a template
// is visible to the admin rather than silently dropped.
//
// Standard layout wrapper: matches the PHP `email_layout()` helper — a
// branded header (publication name + color), the body, optional CTA button,
// and an unsubscribe-style footer. Templates only have to author their body
// content; the wrapper handles brand polish.

import { createClient } from '@supabase/supabase-js'

export interface CirculationTemplate {
  id:           string
  market:       string
  key:          string
  name:         string
  subject:      string
  body_html:    string
  trigger_type: string
  send_day:     number
  active:       boolean
  description:  string | null
}

export interface CirculationSetting { market: string; key: string; value: string | null }

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

/** Substitute {{token}} occurrences with values from ctx. Unknown → literal. */
export function substitute(template: string, ctx: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, key: string) => {
    const v = ctx[key]
    if (v === undefined || v === null) return `{{${key}}}`
    return String(v)
  })
}

/** Wrap rendered body in a branded HTML layout. */
export function emailLayout(opts: {
  brandName:  string
  brandColor: string  // hex like '#1A5FA8'
  title:      string
  bodyHtml:   string
  ctaUrl?:    string
  ctaLabel?:  string
  footerNote?: string
}): string {
  const { brandName, brandColor, title, bodyHtml, ctaUrl, ctaLabel, footerNote } = opts
  return [
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1E293B;">`,
    `  <div style="background:${brandColor};padding:24px 28px;">`,
    `    <h1 style="color:#fff;font-family:Georgia,serif;font-size:22px;margin:0;">${brandName}</h1>`,
    `  </div>`,
    `  <div style="padding:24px 28px;">`,
    `    <h2 style="font-family:Georgia,serif;font-size:18px;color:${brandColor};margin:0 0 16px;">${title}</h2>`,
    `    ${bodyHtml}`,
    ctaUrl && ctaLabel
      ? `    <p style="margin:24px 0 8px;"><a href="${ctaUrl}" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px;">${ctaLabel}</a></p>`
      : '',
    `  </div>`,
    `  <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">`,
    `    ${footerNote ?? `&copy; ${new Date().getFullYear()} ${brandName}`}`,
    `  </div>`,
    `</div>`,
  ].filter(Boolean).join('\n')
}

/** Pull a template by key. Returns null when not found / not active. */
export async function getTemplate(market: string, key: string): Promise<CirculationTemplate | null> {
  const { data } = await sb()
    .from('circulation_email_templates')
    .select('*')
    .eq('market', market)
    .eq('key', key)
    .eq('active', true)
    .maybeSingle()
  return (data as CirculationTemplate | null) ?? null
}

/** Pull all settings for a market into a key→value map. */
export async function getSettings(market: string): Promise<Record<string, string>> {
  const { data } = await sb()
    .from('circulation_settings')
    .select('key, value')
    .eq('market', market)
  const out: Record<string, string> = {}
  for (const row of (data ?? []) as Array<{ key: string; value: string | null }>) {
    out[row.key] = row.value ?? ''
  }
  return out
}

/** Render a template against a context object. Returns subject + html. */
export async function renderTemplate(opts: {
  market:     string
  key:        string
  context:    Record<string, string | number | null | undefined>
  brandName:  string
  brandColor: string
}): Promise<{ subject: string; html: string } | null> {
  const tmpl = await getTemplate(opts.market, opts.key)
  if (!tmpl) return null
  const subject  = substitute(tmpl.subject, opts.context)
  const bodyHtml = substitute(tmpl.body_html, opts.context)
  const html = emailLayout({
    brandName:  opts.brandName,
    brandColor: opts.brandColor,
    title:      subject,
    bodyHtml,
  })
  return { subject, html }
}
