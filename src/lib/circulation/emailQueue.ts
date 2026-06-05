// Circulation email queue helpers.
//
// Two paths into the queue:
//   - enqueue(): stage a single rendered email
//   - enqueueMany(): bulk insert (for "send on our way" to every stop)
//
// One path OUT:
//   - drainQueue(market, batchSize): pull `batchSize` pending rows, ship via
//     Resend (or mark as queued-only when RESEND_API_KEY isn't set), update
//     status. Returns sent/failed counts.
//
// Resend usage:
//   We use the Resend Node SDK with the per-region "from" address pulled
//   from circulation_settings.from_email (falls back to a default). Failed
//   sends increment `attempts` and store the error so the admin can see it.
//
// Why a queue at all (not just direct send):
//   - Rate limiting: Resend free tier is 100/day, paid is 100/sec. Our
//     scheduled fires (eg. "on our way" to 287 stops) need to drip out.
//   - Auditability: every email sent is a row, with provider_id for tracing.
//   - Retry: failed transient errors retry next cron tick without losing
//     the recipient list.

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

interface SupabaseRow { id: string }

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export interface EnqueueRow {
  market:               string
  template_key?:        string | null
  to_email:             string
  to_name?:             string | null
  subject:              string
  body_html:            string
  reply_to?:            string | null
  related_delivery_id?: string | null
  related_stop_id?:     string | null
  related_driver_id?:   string | null
}

export async function enqueue(row: EnqueueRow): Promise<{ id: string } | { error: string }> {
  const { data, error } = await sb()
    .from('circulation_email_queue')
    .insert({ ...row, status: 'pending' })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: (data as SupabaseRow).id }
}

export async function enqueueMany(rows: EnqueueRow[]): Promise<{ inserted: number; error?: string }> {
  if (rows.length === 0) return { inserted: 0 }
  const { error, count } = await sb()
    .from('circulation_email_queue')
    .insert(rows.map(r => ({ ...r, status: 'pending' })), { count: 'exact' })
  if (error) return { inserted: 0, error: error.message }
  return { inserted: count ?? rows.length }
}

export interface DrainResult {
  attempted: number
  sent:      number
  failed:    number
  skipped:   boolean        // true when no Resend key and we left rows pending
}

export async function drainQueue(market: string, batchSize = 30): Promise<DrainResult> {
  const apiKey = process.env.RESEND_API_KEY
  const client = sb()

  // Look up pending rows.
  const { data: pending } = await client
    .from('circulation_email_queue')
    .select('*')
    .eq('market', market)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize)
  const rows = (pending ?? []) as Array<{
    id: string
    to_email: string
    to_name: string | null
    subject: string
    body_html: string
    reply_to: string | null
    attempts: number
  }>

  if (rows.length === 0) return { attempted: 0, sent: 0, failed: 0, skipped: false }

  // No Resend key configured — leave them pending so when the key shows
  // up the admin can press Process Queue and they go out.
  if (!apiKey) {
    return { attempted: rows.length, sent: 0, failed: 0, skipped: true }
  }

  // Look up the brand from settings (from_email + brand_name).
  const settings = await loadSettings(market)
  const fromEmail = settings.from_email || `noreply@${defaultDomain()}`
  const fromName  = settings.from_name  || 'River Region Distribution'

  const resend = new Resend(apiKey)

  let sent = 0
  let failed = 0
  for (const r of rows) {
    // Optimistic lock — flip to 'sending' so a parallel drain doesn't pick
    // up the same row. If the update affected 0 rows, someone else has it.
    const { data: claimed } = await client
      .from('circulation_email_queue')
      .update({ status: 'sending', attempts: r.attempts + 1, last_attempted_at: new Date().toISOString() })
      .eq('id', r.id)
      .eq('status', 'pending')
      .select('id')
    if (!claimed || claimed.length === 0) continue

    try {
      const result = await resend.emails.send({
        from:    `${fromName} <${fromEmail}>`,
        to:      [r.to_email],
        subject: r.subject,
        html:    r.body_html,
        replyTo: r.reply_to ?? settings.ops_email ?? undefined,
      })
      if (result.error) {
        await client.from('circulation_email_queue')
          .update({
            status:     'failed',
            last_error: result.error.message ?? 'Resend error',
          })
          .eq('id', r.id)
        failed++
      } else {
        await client.from('circulation_email_queue')
          .update({
            status:      'sent',
            sent_at:     new Date().toISOString(),
            provider_id: result.data?.id ?? null,
            last_error:  null,
          })
          .eq('id', r.id)
        sent++
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await client.from('circulation_email_queue')
        .update({ status: 'failed', last_error: msg })
        .eq('id', r.id)
      failed++
    }
  }

  return { attempted: rows.length, sent, failed, skipped: false }
}

async function loadSettings(market: string): Promise<Record<string, string>> {
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

function defaultDomain(): string {
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) return new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
  } catch { /* fall through */ }
  return 'riverregionparents.com'
}
