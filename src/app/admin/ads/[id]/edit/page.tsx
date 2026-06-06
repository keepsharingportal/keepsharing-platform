'use client'

// /admin/ads/[id]/edit — edit an existing ad_placement row.
//
// Fetches via /api/admin/ads/item?id=… on mount, saves via PATCH on the
// same endpoint. Mirrors the field set in /admin/ads/new but adds the
// post-093 columns (rotation_group, rotation_weight, pricing) and the
// post-119 columns (advertiser_email, sales_rep_email) so renewal
// reminders can target the right inbox.

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Pencil, AlertTriangle } from 'lucide-react'
import { groupedPlacementTypes, findPlacementType } from '@/lib/ads/placement-types'

interface AdRow {
  id:                    string
  placement_type:        string
  context_type:          string | null
  context_slug:          string | null
  advertiser_account_id: string | null
  ad_eyebrow:            string | null
  ad_headline:           string | null
  ad_description:        string | null
  ad_cta_label:          string | null
  ad_link:               string | null
  ad_image_url:          string | null
  is_active:             boolean
  display_priority:      number
  starts_at:             string | null
  ends_at:               string | null
  rotation_group:        string | null
  rotation_weight:       number | null
  price_monthly:         number | null
  price_quarterly:       number | null
  price_annual:          number | null
  advertiser_email:      string | null
  sales_rep_email:       string | null
}

const CONTEXT_SLUGS: Record<string, string[]> = {
  guide: [
    'family-resource-guide', 'private-school-guide', 'summer-camp-guide', 'childcare-guide',
    'healthy-kids-guide', 'summer-fun-guide', 'birthday-party-guide', 'afterschool-guide', 'special-needs-guide',
  ],
}

const CONTEXT_TYPES = ['guide', 'article', 'calendar', 'newsletter', 'site_global', 'homepage'] as const

function toLocalInput(s: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditAdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [ad,       setAd]       = useState<AdRow | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    fetch(`/api/admin/ads/item?id=${id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j.error) { setError(j.error); return }
        setAd(j.ad)
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [id])

  function set<K extends keyof AdRow>(k: K, v: AdRow[K]) {
    setAd(prev => prev ? { ...prev, [k]: v } : prev)
    setSuccess(false)
  }

  async function save() {
    if (!ad) return
    setSaving(true); setError(null); setSuccess(false)
    try {
      // Spread first so the explicit `id` and date normalizations
      // always win — TS warns when `id` appears in both positions.
      const payload = {
        ...ad,
        id,
        starts_at: ad.starts_at || null,
        ends_at:   ad.ends_at   || null,
      }
      const res  = await fetch('/api/admin/ads/item', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? `HTTP ${res.status}`); return }
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
        <p className="text-sm text-gray-400 max-w-[800px] mx-auto">Loading…</p>
      </div>
    )
  }

  if (!ad) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
        <div className="max-w-[800px] mx-auto bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-800">
          <p className="font-bold flex items-center gap-2"><AlertTriangle size={16} /> Could not load</p>
          <p className="text-xs mt-1">{error ?? 'Unknown error'}</p>
          <Link href="/admin/ads" className="inline-flex items-center gap-1 mt-3 text-xs text-red-900 font-semibold underline">
            <ArrowLeft size={12} /> Back to bookings
          </Link>
        </div>
      </div>
    )
  }

  const def         = findPlacementType(ad.placement_type)
  const contextSlugs = CONTEXT_SLUGS[ad.context_type ?? ''] ?? []
  const placementGroups = groupedPlacementTypes()

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[900px] mx-auto space-y-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link href="/admin/ads" className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2">
              <ArrowLeft size={12} /> Back to all bookings
            </Link>
            <div className="flex items-center gap-2 mb-1">
              <Pencil size={20} className="text-primary" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Edit placement
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              {def?.label ?? ad.placement_type} · <code className="text-[11px] text-gray-400">{ad.placement_type}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/ads"
              className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-primary rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-40"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </header>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
            ✓ Saved. Public homepage may take up to ~10 min to refresh (revalidate cache).
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* ── Status + scheduling ─────────────────────────────── */}
        <Section title="Status & scheduling">
          <Row label="Status">
            <button
              type="button"
              onClick={() => set('is_active', !ad.is_active)}
              className={`inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors min-w-[68px] justify-center ${
                ad.is_active
                  ? 'bg-green-600 text-white hover:bg-green-700 ring-1 ring-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700 ring-1 ring-red-700'
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white" />
              {ad.is_active ? 'ON' : 'OFF'}
            </button>
          </Row>
          <Row label="Display priority"
               hint="Higher wins when multiple ads compete for the same slot (0–100, 50 is default).">
            <input
              type="number"
              min={0} max={100}
              value={ad.display_priority ?? 50}
              onChange={e => set('display_priority', Number(e.target.value))}
              className={inp}
            />
          </Row>
          <Row label="Starts">
            <input
              type="datetime-local"
              value={toLocalInput(ad.starts_at)}
              onChange={e => set('starts_at', e.target.value || null)}
              className={inp}
            />
          </Row>
          <Row label="Ends" hint="Leave blank for no end date. The renewal cron uses this to time reminders.">
            <input
              type="datetime-local"
              value={toLocalInput(ad.ends_at)}
              onChange={e => set('ends_at', e.target.value || null)}
              className={inp}
            />
          </Row>
        </Section>

        {/* ── Creative ────────────────────────────────────────── */}
        <Section title="Creative">
          <Row label="Eyebrow">
            <input value={ad.ad_eyebrow ?? ''} onChange={e => set('ad_eyebrow', e.target.value)} placeholder="Sponsored · Featured Partner" className={inp} />
          </Row>
          <Row label="Headline">
            <input value={ad.ad_headline ?? ''} onChange={e => set('ad_headline', e.target.value)} className={inp} />
          </Row>
          <Row label="Description">
            <textarea value={ad.ad_description ?? ''} onChange={e => set('ad_description', e.target.value)} rows={3} className={`${inp} resize-y`} />
          </Row>
          <Row label="CTA label">
            <input value={ad.ad_cta_label ?? ''} onChange={e => set('ad_cta_label', e.target.value)} placeholder="Learn More" className={inp} />
          </Row>
          <Row label="CTA link">
            <input value={ad.ad_link ?? ''} onChange={e => set('ad_link', e.target.value)} placeholder="/healthy-kids-guide/listings/…" className={inp} />
          </Row>
          <Row label="Image URL">
            <input value={ad.ad_image_url ?? ''} onChange={e => set('ad_image_url', e.target.value)} placeholder="https://… or /images/…" className={inp} />
          </Row>
        </Section>

        {/* ── Placement type / context ─────────────────────── */}
        <Section title="Placement">
          <Row label="Placement type">
            <select value={ad.placement_type} onChange={e => set('placement_type', e.target.value)} className={inp}>
              {placementGroups.map(group => (
                <optgroup key={group.surface} label={group.label}>
                  {group.entries.map(p => (
                    <option key={p.slug} value={p.slug}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {def && (
              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{def.description}</p>
            )}
          </Row>
          <Row label="Context type">
            <select value={ad.context_type ?? ''} onChange={e => set('context_type', e.target.value || null)} className={inp}>
              <option value="">(none)</option>
              {CONTEXT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Row>
          {contextSlugs.length > 0 && (
            <Row label="Context slug">
              <select value={ad.context_slug ?? ''} onChange={e => set('context_slug', e.target.value || null)} className={inp}>
                <option value="">(all / global)</option>
                {contextSlugs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
          )}
        </Section>

        {/* ── Rotation ─────────────────────────────────────── */}
        <Section title="Rotation"
                 subtitle="Leave rotation_group blank to lock this slot as the exclusive booking. Set to a shared name (e.g. 'homepage-inline-pool') to share the spot with up to 2 other ads.">
          <Row label="Rotation group" hint="Same value on 2-3 ads = they share the slot and rotate per request.">
            <input
              value={ad.rotation_group ?? ''}
              onChange={e => set('rotation_group', e.target.value || null)}
              placeholder="(blank = exclusive)"
              className={inp}
            />
          </Row>
          <Row label="Rotation weight" hint="1.0 = equal share. 2.0 = double impressions vs a 1.0-weight ad in the same pool.">
            <input
              type="number"
              step="0.5"
              min={0.5} max={4}
              value={ad.rotation_weight ?? 1}
              onChange={e => set('rotation_weight', Number(e.target.value))}
              className={inp}
            />
          </Row>
        </Section>

        {/* ── Pricing ──────────────────────────────────────── */}
        <Section title="Pricing"
                 subtitle="Sales quote-card — what you charge for this slot. Renewal reminders quote these too.">
          <Row label="Monthly rate">
            <input
              type="number" step="0.01" min={0}
              value={ad.price_monthly ?? ''}
              onChange={e => set('price_monthly', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="0.00"
              className={inp}
            />
          </Row>
          <Row label="Quarterly rate">
            <input
              type="number" step="0.01" min={0}
              value={ad.price_quarterly ?? ''}
              onChange={e => set('price_quarterly', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="0.00"
              className={inp}
            />
          </Row>
          <Row label="Annual rate">
            <input
              type="number" step="0.01" min={0}
              value={ad.price_annual ?? ''}
              onChange={e => set('price_annual', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="0.00"
              className={inp}
            />
          </Row>
        </Section>

        {/* ── Contacts for renewal reminders ──────────────── */}
        <Section title="Renewal contact"
                 subtitle="The renewal-reminder cron emails these addresses as the contract end date approaches.">
          <Row label="Advertiser email" hint="The buyer / contact who gets the renewal reminder.">
            <input
              type="email"
              value={ad.advertiser_email ?? ''}
              onChange={e => set('advertiser_email', e.target.value)}
              placeholder="contact@business.com"
              className={inp}
            />
          </Row>
          <Row label="Sales rep email" hint="CC'd on certain templates (when the template has 'CC sales rep' enabled).">
            <input
              type="email"
              value={ad.sales_rep_email ?? ''}
              onChange={e => set('sales_rep_email', e.target.value)}
              placeholder="rep@riverregionparents.com"
              className={inp}
            />
          </Row>
        </Section>

      </div>
    </div>
  )
}

const inp = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400 transition-colors'

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-bold text-gray-700">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[180px_1fr] gap-2 sm:gap-4 items-start">
      <div className="pt-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</label>
        {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}
