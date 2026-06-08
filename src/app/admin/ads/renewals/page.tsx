// /admin/ads/renewals — editable renewal email templates + send log.
//
// The cron at /api/cron/ad-renewals only fires templates marked is_live.
// Until the editor flips that switch the template is a draft — write,
// preview, fine-tune, then go live. Same flag controls whether the cron
// will send the daily reminder for ads landing in its window.

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Mail, AlertTriangle, Check, Clock } from 'lucide-react'
import { AdsTabs } from '@/components/admin/AdsTabs'

export const dynamic = 'force-dynamic'

interface Template {
  id:           string
  name:         string
  days_before:  number
  subject:      string
  body_html:    string
  body_text:    string | null
  is_live:      boolean
  notify_sales: boolean
  updated_at:   string
}

interface LogRow {
  id:               string
  placement_id:     string
  template_id:      string
  ends_at_snapshot: string
  recipient_email:  string
  status:           string
  error_message:    string | null
  sent_at:          string
  template_name:    string | null
}

function windowLabel(days_before: number): string {
  if (days_before > 0) return `${days_before} day${days_before === 1 ? '' : 's'} before expiry`
  if (days_before === 0) return 'Day of expiry'
  return `${Math.abs(days_before)} day${Math.abs(days_before) === 1 ? '' : 's'} after expiry`
}

async function saveTemplate(formData: FormData) {
  'use server'
  await requireAdmin()
  const supabase = createAdminClient()

  const id           = formData.get('id') as string
  const subject      = (formData.get('subject') as string) ?? ''
  const body_html    = (formData.get('body_html') as string) ?? ''
  const body_text    = (formData.get('body_text') as string) ?? ''
  const is_live      = formData.get('is_live') === 'on'
  const notify_sales = formData.get('notify_sales') === 'on'

  await supabase
    .from('ad_renewal_templates')
    .update({ subject, body_html, body_text, is_live, notify_sales, updated_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/admin/ads/renewals')
  redirect('/admin/ads/renewals')
}

export default async function AdRenewalsPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const [tplRes, logRes] = await Promise.all([
    supabase
      .from('ad_renewal_templates')
      .select('*')
      .order('days_before', { ascending: false }),
    supabase
      .from('ad_renewal_log')
      .select('id, placement_id, template_id, ends_at_snapshot, recipient_email, status, error_message, sent_at, ad_renewal_templates(name)')
      .order('sent_at', { ascending: false })
      .limit(40),
  ])

  const templates = (tplRes.data ?? []) as Template[]
  const log: LogRow[] = ((logRes.data ?? []) as unknown as Array<LogRow & { ad_renewal_templates: { name: string } | null }>).map(r => ({
    ...r,
    template_name: r.ad_renewal_templates?.name ?? null,
  }))

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1200px] mx-auto space-y-6">
      <AdsTabs />
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-portal-text flex items-center gap-2">
            <Mail className="w-6 h-6 text-portal-blue" />
            Ad Renewal Reminders
          </h1>
          <p className="text-sm text-portal-sub mt-1 max-w-xl">
            Email templates fire automatically when an ad lands in their window. Templates ship as <strong>drafts</strong> —
            review the copy, edit anything that doesn&apos;t sound like you, then flip <strong>Live</strong> to enable that window.
            The cron runs nightly; nothing sends until a template is live.
          </p>
        </div>
        <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg px-4 py-2 text-xs text-portal-amber max-w-sm">
          <p className="font-bold flex items-center gap-1"><AlertTriangle size={12} /> Note</p>
          <p className="mt-0.5">Make sure your ad bookings have either <code>advertiser_email</code> on the placement
          or a linked advertiser_account with an email. Without one, the cron logs &quot;skipped: no-email&quot; and moves on.</p>
        </div>
      </header>

      {/* ── Templates ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-portal-text">Templates</h2>
        {templates.length === 0 && (
          <p className="text-sm text-portal-sub italic">No templates yet — apply migration 119 to seed the defaults.</p>
        )}
        {templates.map(tpl => (
          <details key={tpl.id} className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-4 hover:bg-portal-bg">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${tpl.is_live ? 'bg-portal-green-lt text-portal-green ring-1 ring-portal-green/30' : 'bg-portal-row-hover text-portal-sub'}`}>
                  {tpl.is_live ? <><Check size={12} /> Live</> : <><Clock size={12} /> Draft</>}
                </span>
                <span className="font-bold text-portal-text">{tpl.name}</span>
                <span className="text-xs text-portal-sub">· {windowLabel(tpl.days_before)}</span>
                {tpl.notify_sales && <span className="text-[10px] uppercase tracking-wider text-portal-blue bg-portal-blue-lt px-2 py-0.5 rounded">CC sales rep</span>}
              </div>
              <span className="text-xs text-portal-muted">edit ↓</span>
            </summary>
            <form action={saveTemplate} className="p-5 space-y-4 border-t border-portal-border bg-portal-bg">
              <input type="hidden" name="id" value={tpl.id} />
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Subject</label>
                <input
                  name="subject"
                  defaultValue={tpl.subject}
                  className="w-full text-sm px-3 py-2 border border-portal-border rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Body (HTML)</label>
                <textarea
                  name="body_html"
                  defaultValue={tpl.body_html}
                  rows={10}
                  className="w-full text-xs font-mono px-3 py-2 border border-portal-border rounded-lg bg-white"
                />
                <p className="text-[11px] text-portal-sub mt-1">
                  Merge tags: <code>{`{{first_name}}`}</code> · <code>{`{{advertiser_name}}`}</code> ·
                  <code>{` {{placement_label}}`}</code> · <code>{` {{ends_at}}`}</code> · <code>{` {{renewal_url}}`}</code>
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Body (plain text fallback)</label>
                <textarea
                  name="body_text"
                  defaultValue={tpl.body_text ?? ''}
                  rows={4}
                  className="w-full text-xs font-mono px-3 py-2 border border-portal-border rounded-lg bg-white"
                />
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="is_live" defaultChecked={tpl.is_live} className="h-4 w-4 rounded border-portal-border-2" />
                  <span className="font-bold">Live — cron will send this</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" name="notify_sales" defaultChecked={tpl.notify_sales} className="h-4 w-4 rounded border-portal-border-2" />
                  <span>CC the placement&apos;s <code>sales_rep_email</code></span>
                </label>
                <button type="submit" className="ml-auto px-4 py-2 bg-portal-navy text-white text-sm font-bold rounded-lg hover:bg-portal-navy">
                  Save changes
                </button>
              </div>
            </form>
          </details>
        ))}
      </section>

      {/* ── Recent activity ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-portal-text">Recent send activity</h2>
        {log.length === 0 ? (
          <p className="text-sm text-portal-sub italic">No reminders have fired yet. Once a template is Live and an ad lands in its window, you&apos;ll see entries here.</p>
        ) : (
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-portal-bg border-b border-portal-border">
                <tr className="text-left text-xs uppercase tracking-wider text-portal-sub">
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Template</th>
                  <th className="px-4 py-2">To</th>
                  <th className="px-4 py-2">For ends_at</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {log.map(r => (
                  <tr key={r.id} className="border-b border-portal-border last:border-0">
                    <td className="px-4 py-2 text-xs text-portal-sub">{new Date(r.sent_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-medium">{r.template_name ?? '—'}</td>
                    <td className="px-4 py-2 text-xs">{r.recipient_email}</td>
                    <td className="px-4 py-2 text-xs text-portal-sub">{new Date(r.ends_at_snapshot).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold ${
                        r.status === 'sent'   ? 'bg-portal-green-lt text-portal-green' :
                        r.status === 'failed' ? 'bg-portal-red-lt text-portal-red' :
                                                'bg-portal-row-hover text-portal-sub'
                      }`}>
                        {r.status}
                      </span>
                      {r.error_message && <span className="text-[11px] text-portal-red ml-2">{r.error_message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  )
}
