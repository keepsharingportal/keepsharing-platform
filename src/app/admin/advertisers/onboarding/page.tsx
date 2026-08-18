// ── /admin/advertisers/onboarding ────────────────────────────────────────────
// Advertiser activation command center.
// Shows all accounts in the 'onboarding' lifecycle stage with per-account
// checklists, blocking items, and one-click checklist toggles via server action.

import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath }  from 'next/cache'
import { createClient }    from '@/lib/supabase/server'
import { GUIDE_CONFIGS }   from '@/app/partners/guide/configs'

export const metadata: Metadata = { title: 'Onboarding — Admin' }

// ── Checklist definition ──────────────────────────────────────────────────────
// tier: 'all' | 'ecosystem' (EP+) | 'sponsor' (Category Sponsor only)
// critical: blocks launch readiness if unchecked

interface ChecklistItem { label: string; section: string; critical: boolean; tier: 'all' | 'ecosystem' | 'sponsor' }
type ChecklistKey = keyof typeof CHECKLIST

const CHECKLIST = {
  // ── Assets
  photo_received:          { label: 'Photo received from partner',           section: 'Assets',   critical: true,  tier: 'all' },
  description_drafted:     { label: 'Editorial description drafted by RRP',  section: 'Assets',   critical: true,  tier: 'all' },
  description_approved:    { label: 'Partner approved editorial copy',        section: 'Assets',   critical: true,  tier: 'all' },
  contact_verified:        { label: 'Phone + website link verified',          section: 'Assets',   critical: false, tier: 'all' },
  // ── Listing
  listing_created:         { label: 'Listing created in guide',              section: 'Listing',  critical: true,  tier: 'all' },
  listing_badge_applied:   { label: 'Partner badge applied',                 section: 'Listing',  critical: false, tier: 'all' },
  listing_go_live_set:     { label: 'Go-live date confirmed',                section: 'Listing',  critical: true,  tier: 'all' },
  // ── CRM
  ghl_tagged:              { label: 'GHL: tier + guide + category tags set', section: 'CRM',      critical: false, tier: 'all' },
  ghl_renewal_set:         { label: 'GHL: renewal date set',                 section: 'CRM',      critical: false, tier: 'all' },
  ghl_agreement_uploaded:  { label: 'Signed agreement uploaded to GHL',      section: 'CRM',      critical: false, tier: 'all' },
  // ── Campaign (Ecosystem Partner+)
  print_ad_received:       { label: 'Print ad design received',              section: 'Campaign', critical: true,  tier: 'ecosystem' },
  print_ad_approved:       { label: 'Print ad approved by partner',          section: 'Campaign', critical: true,  tier: 'ecosystem' },
  newsletter_slot_booked:  { label: 'Newsletter category slot scheduled',    section: 'Campaign', critical: false, tier: 'ecosystem' },
  social_brief_done:       { label: 'Social campaign brief completed',       section: 'Campaign', critical: false, tier: 'ecosystem' },
  social_creative_approved:{ label: 'Social creative approved',              section: 'Campaign', critical: false, tier: 'ecosystem' },
  // ── Sponsor (Category Sponsor only)
  sponsor_name_confirmed:  { label: '"Presented By" display name confirmed', section: 'Sponsor',  critical: true,  tier: 'sponsor' },
  sponsor_db_set:          { label: 'Category + guide set in DB',            section: 'Sponsor',  critical: true,  tier: 'sponsor' },
  sponsor_renewal_set:     { label: 'Renewal priority date set',             section: 'Sponsor',  critical: true,  tier: 'sponsor' },
  sponsor_kickoff_done:    { label: 'Kickoff call completed with Jason',     section: 'Sponsor',  critical: false, tier: 'sponsor' },
} satisfies Record<string, ChecklistItem>

const SECTIONS = ['Assets', 'Listing', 'CRM', 'Campaign', 'Sponsor'] as const

// ── Server action ─────────────────────────────────────────────────────────────

async function toggleChecklistItem(formData: FormData) {
  'use server'
  const supabase    = await createClient()
  const accountId   = formData.get('account_id') as string
  const key         = formData.get('key') as string
  const current     = formData.get('current') === 'true'

  const { data } = await supabase
    .from('advertiser_accounts')
    .select('ops_checklist')
    .eq('id', accountId)
    .single()

  const checklist = ((data?.ops_checklist ?? {}) as Record<string, boolean>)
  checklist[key]  = !current

  await supabase
    .from('advertiser_accounts')
    .update({ ops_checklist: checklist })
    .eq('id', accountId)

  revalidatePath('/admin/advertisers/onboarding')
}

async function setGoLiveTarget(formData: FormData) {
  'use server'
  const supabase  = await createClient()
  const accountId = formData.get('account_id') as string
  const date      = formData.get('date') as string
  if (!date) return
  await supabase
    .from('advertiser_accounts')
    .update({ go_live_target: date })
    .eq('id', accountId)
  revalidatePath('/admin/advertisers/onboarding')
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountRow {
  id:                   string
  business_name:        string
  package_tier:         string | null
  loyalty_tier:         string
  lifecycle_stage:      string
  onboarding_started_at:string | null
  published_at:         string | null
  go_live_target:       string | null
  ops_checklist:        Record<string, boolean> | null
  contact_name:         string | null
  contact_phone:        string | null
  contact_email:        string | null
  sponsor_guide_slug:   string | null
  sponsor_category_slug:string | null
  ops_notes:            string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isEcosystemTier(tier: string | null): boolean {
  if (!tier) return false
  const n = tier.toLowerCase().replace(/[\s-]+/g, '')
  return n.includes('ecosystem') || n.includes('categorysponsor')
}

function isSponsorTier(tier: string | null, sponsorSlug: string | null): boolean {
  if (sponsorSlug) return true
  if (!tier) return false
  const n = tier.toLowerCase().replace(/[\s-]+/g, '')
  return n.includes('categorysponsor')
}

function getApplicableKeys(acc: AccountRow): ChecklistKey[] {
  const eco  = isEcosystemTier(acc.package_tier)
  const spn  = isSponsorTier(acc.package_tier, acc.sponsor_category_slug)
  return (Object.keys(CHECKLIST) as ChecklistKey[]).filter(k => {
    const t = CHECKLIST[k].tier
    if (t === 'all')      return true
    if (t === 'ecosystem') return eco
    if (t === 'sponsor')   return spn
    return true
  })
}

function getProgress(acc: AccountRow) {
  const cl         = acc.ops_checklist ?? {}
  const applicable = getApplicableKeys(acc)
  const done       = applicable.filter(k => cl[k]).length
  const blocking   = applicable.filter(k => !cl[k] && CHECKLIST[k].critical).map(k => CHECKLIST[k].label)
  const pct        = applicable.length > 0 ? Math.round((done / applicable.length) * 100) : 0
  return { pct, done, total: applicable.length, blocking, launchReady: pct >= 80 && blocking.length === 0 }
}

function daysSince(date: string | null, now: Date): number {
  if (!date) return 0
  return Math.floor((now.getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000))
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function tierColor(tier: string | null): string {
  if (!tier) return '#6b7280'
  const n = tier.toLowerCase()
  if (n.includes('sponsor'))   return '#b8860b'
  if (n.includes('ecosystem')) return '#ef6442'
  if (n.includes('guide'))     return '#1e3a5f'
  return '#6b7280'
}

function tierLabel(tier: string | null): string {
  if (!tier) return 'Unknown'
  const n = tier.toLowerCase()
  if (n.includes('sponsor'))   return 'Cat. Sponsor'
  if (n.includes('ecosystem')) return 'Ecosystem Partner'
  if (n.includes('guide'))     return 'Guide Partner'
  return tier
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OnboardingPage() {
  const supabase = await createClient()
  const now      = new Date()

  const { data: rawAccounts } = await supabase
    .from('advertiser_accounts')
    .select([
      'id', 'business_name', 'package_tier', 'loyalty_tier', 'lifecycle_stage',
      'onboarding_started_at', 'published_at', 'go_live_target',
      'ops_checklist', 'contact_name', 'contact_phone', 'contact_email',
      'sponsor_guide_slug', 'sponsor_category_slug', 'ops_notes',
    ].join(', '))
    .eq('lifecycle_stage', 'onboarding')
    .order('onboarding_started_at', { ascending: true })

  const accounts = (rawAccounts ?? []) as unknown as AccountRow[]

  const progresses  = accounts.map(a => getProgress(a))
  const launchReady = progresses.filter(p => p.launchReady).length
  const blocked     = progresses.filter(p => !p.launchReady && p.blocking.length > 0).length
  const avgDays     = accounts.length > 0
    ? Math.round(accounts.reduce((s, a) => s + daysSince(a.onboarding_started_at, now), 0) / accounts.length)
    : 0

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Link href="/admin/advertisers" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>← Advertisers</Link>
              <span style={{ color: '#d1d5db' }}>›</span>
              <span style={{ fontSize: 12, color: '#374151' }}>Onboarding</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>Advertiser Activation</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} in onboarding · Track assets, approvals, and launch readiness
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin/advertisers/proposals" style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>
              Proposals →
            </Link>
            <Link href="/admin/advertisers/sponsor-inventory" style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>
              Inventory →
            </Link>
          </div>
        </div>

        {/* ── METRICS STRIP ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'In Onboarding', value: accounts.length, dot: '#3b82f6', sub: 'total active' },
            { label: 'Launch Ready',  value: launchReady,     dot: '#22c55e', sub: '≥ 80% + no blockers' },
            { label: 'Blocked',       value: blocked,         dot: '#ef4444', sub: 'critical items missing' },
            { label: 'Avg Days',      value: avgDays,         dot: '#eab308', sub: 'in onboarding stage' },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: m.dot, display: 'inline-block' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
              </div>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: '0 0 2px' }}>{m.value}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── ONBOARDING QUEUE ────────────────────────────────────────────── */}
        {accounts.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>✓</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No accounts in onboarding</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>All current advertisers are active, or no new agreements have been signed.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {accounts.map((acc, i) => {
              const prog  = progresses[i]
              const cl    = acc.ops_checklist ?? {}
              const days  = daysSince(acc.onboarding_started_at, now)
              const tc    = tierColor(acc.package_tier)
              const isEco = isEcosystemTier(acc.package_tier)
              const isSpn = isSponsorTier(acc.package_tier, acc.sponsor_category_slug)
              const guideConfig = acc.sponsor_guide_slug
                ? GUIDE_CONFIGS.find(g => g.slug === acc.sponsor_guide_slug)
                : null

              // Group applicable keys by section
              const applicable = getApplicableKeys(acc)
              const bySect = SECTIONS.reduce((map, sec) => {
                const keys = applicable.filter(k => CHECKLIST[k].section === sec)
                if (keys.length > 0) map[sec] = keys
                return map
              }, {} as Record<string, ChecklistKey[]>)

              return (
                <div
                  key={acc.id}
                  style={{
                    backgroundColor: '#fff',
                    border: `1px solid ${prog.launchReady ? '#bbf7d0' : prog.blocking.length > 0 ? '#fca5a5' : '#e5e7eb'}`,
                    borderLeft: `5px solid ${prog.launchReady ? '#22c55e' : prog.blocking.length > 0 ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  {/* Card header */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>{acc.business_name}</h2>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10, backgroundColor: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}>
                          {tierLabel(acc.package_tier)}
                        </span>
                        {isSpn && guideConfig && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10, backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fde047' }}>
                            {guideConfig.emoji} Cat. Sponsor
                          </span>
                        )}
                        {prog.launchReady && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 10, backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            ✓ LAUNCH READY
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {acc.contact_name  && <span style={{ fontSize: 12, color: '#6b7280' }}>👤 {acc.contact_name}</span>}
                        {acc.contact_phone && <span style={{ fontSize: 12, color: '#6b7280' }}>📞 {acc.contact_phone}</span>}
                        {acc.contact_email && <span style={{ fontSize: 12, color: '#6b7280' }}>✉ {acc.contact_email}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 24, fontWeight: 900, color: days > 14 ? '#ef4444' : '#374151', margin: '0 0 2px' }}>{days}d</p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>in onboarding</p>
                    </div>
                  </div>

                  <div style={{ padding: '16px 20px' }}>
                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${prog.pct}%`, backgroundColor: prog.launchReady ? '#22c55e' : prog.blocking.length > 0 ? '#ef4444' : '#3b82f6', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: prog.launchReady ? '#15803d' : '#374151', flexShrink: 0 }}>
                        {prog.pct}% ({prog.done}/{prog.total})
                      </span>
                    </div>

                    {/* Blocking items */}
                    {prog.blocking.length > 0 && (
                      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Blocking Launch ({prog.blocking.length})
                        </p>
                        {prog.blocking.map(b => (
                          <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ color: '#ef4444', fontSize: 12, flexShrink: 0 }}>✗</span>
                            <span style={{ fontSize: 12, color: '#7f1d1d' }}>{b}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Checklist by section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                      {Object.entries(bySect).map(([section, keys]) => (
                        <div key={section} style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8, padding: '12px 14px' }}>
                          <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                            {section}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {keys.map(k => {
                              const done = !!cl[k]
                              const item = CHECKLIST[k]
                              return (
                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <form action={toggleChecklistItem} style={{ flexShrink: 0 }}>
                                    <input type="hidden" name="account_id" value={acc.id} />
                                    <input type="hidden" name="key" value={k} />
                                    <input type="hidden" name="current" value={String(done)} />
                                    <button
                                      type="submit"
                                      title={done ? 'Mark incomplete' : 'Mark complete'}
                                      style={{
                                        width: 18, height: 18, borderRadius: 4, border: `2px solid ${done ? '#22c55e' : item.critical ? '#fca5a5' : '#d1d5db'}`,
                                        backgroundColor: done ? '#22c55e' : '#fff',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: 0, flexShrink: 0,
                                      }}
                                    >
                                      {done && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                                    </button>
                                  </form>
                                  <span style={{ fontSize: 12, color: done ? '#6b7280' : item.critical ? '#374151' : '#6b7280', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.4 }}>
                                    {item.label}
                                    {item.critical && !done && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Go-live target card */}
                      <div style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8, padding: '12px 14px' }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                          Go-Live Target
                        </p>
                        {acc.go_live_target ? (
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
                            {fmtDate(acc.go_live_target)}
                            {new Date(acc.go_live_target) < now && !acc.published_at && (
                              <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 8 }}>overdue</span>
                            )}
                          </p>
                        ) : (
                          <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>Not set *</p>
                        )}
                        <form action={setGoLiveTarget} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="hidden" name="account_id" value={acc.id} />
                          <input
                            type="date"
                            name="date"
                            defaultValue={acc.go_live_target ?? ''}
                            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', flex: 1, minWidth: 0 }}
                          />
                          <button type="submit" style={{ fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: '#1e3a5f', padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer' }}>
                            Set
                          </button>
                        </form>
                        {acc.published_at && (
                          <p style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginTop: 8 }}>
                            ✓ Live since {fmtDate(acc.published_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {acc.ops_notes && (
                      <div style={{ marginTop: 12, padding: '10px 14px', backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: 6 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Notes</p>
                        <p style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{acc.ops_notes}</p>
                      </div>
                    )}

                    {/* Quick links */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
                      {acc.sponsor_guide_slug && (
                        <Link href={`/admin/go/partners/guide/${acc.sponsor_guide_slug}`} target="_blank" style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textDecoration: 'none' }}>
                          Guide page →
                        </Link>
                      )}
                      <Link href={`/admin/advertisers/sponsor-inventory?guide=${acc.sponsor_guide_slug ?? 'all'}`} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textDecoration: 'none' }}>
                        Inventory →
                      </Link>
                      <Link href="/admin/proposals/new" style={{ fontSize: 11, fontWeight: 600, color: '#ef6442', textDecoration: 'none', marginLeft: 'auto' }}>
                        + Send proposal →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── LAUNCH CHECKLIST LEGEND ─────────────────────────────────────── */}
        <div style={{ marginTop: 24, padding: '12px 20px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Legend</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}><span style={{ color: '#ef4444' }}>*</span> = blocks launch readiness</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}><span style={{ color: '#22c55e' }}>Green bar</span> = ready to launch</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}><span style={{ color: '#ef4444' }}>Red bar</span> = blocked by critical items</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Campaign + Sponsor sections shown only for qualifying tiers</span>
        </div>

      </div>
    </div>
  )
}
