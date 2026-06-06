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
import { ArrowLeft, Save, Pencil, AlertTriangle, MapPin, ExternalLink } from 'lucide-react'
import { groupedPlacementTypes, findPlacementType } from '@/lib/ads/placement-types'
import { PageLayoutPreview } from '@/components/admin/PageLayoutPreview'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'

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
  // Section-sponsor specific fields (placement_type='section_sponsor').
  // Live on every ad_placements row but only meaningful when sponsoring
  // a vertical/column — the edit form only surfaces them in that case.
  accent_color:          string | null
  logo_url:              string | null
  sponsor_tagline:       string | null
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

        {/* ── Where on the page is this? ────────────────────────── */}
        {def && (
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <MapPin size={14} className="text-primary" />
                Where this appears on the site
              </h2>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-5">
              <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                <p>{def.whereItAppears}</p>
                <p className="text-xs text-gray-500 italic">{def.description}</p>
              </div>
              <PageLayoutPreview placementSlug={def.slug} surface={def.surface} />
            </div>
          </section>
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
          {/* Display priority is now derived automatically — staff
              shouldn't have to think about it. Hidden by default; we
              keep the value on the row so future advanced workflows
              (manual priority bump) can still set it from elsewhere. */}
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
          <Row label="Image" hint="Upload from your device or paste a URL. Drag-and-drop, then use Zoom & adjust to crop.">
            <HeroImageUpload
              value={ad.ad_image_url ?? ''}
              onChange={(url) => set('ad_image_url', url)}
              context="asset"
            />
          </Row>

          {/* ── Live preview ─────────────────────────────────────
              Mirrors roughly what readers see for this slot. Updates
              as the editor types — feels like designing in-place. */}
          <Row label="Preview" hint="Approximate render — actual styles vary slightly by placement.">
            <AdPreview ad={ad} />
          </Row>
        </Section>

        {/* ── Section sponsor fields — only when this slot IS one ── */}
        {/* These columns live on every ad_placements row but only mean
            anything when the placement renders as a "[Section] presented
            by [Advertiser]" banner. Surfacing them only for that case
            keeps the standard ad-edit form clean. */}
        {ad.placement_type === 'section_sponsor' && (
          <Section
            title="Section sponsor — branded fields"
            subtitle="These fields drive the per-column sponsor banner (Play Ball / Mom to Mom / Teacher of the Month, etc.). They override the generic Creative fields above for the section-sponsor banner render."
          >
            <Row label="Logo URL" hint="Distinct from Image URL — rendered as a small square logo on the colored banner.">
              <input
                value={ad.logo_url ?? ''}
                onChange={e => set('logo_url', e.target.value)}
                placeholder="https://… (small square works best)"
                className={inp}
              />
            </Row>
            <Row label="Sponsor tagline" hint="Italicized one-liner under the sponsor name on the banner. Optional.">
              <input
                value={ad.sponsor_tagline ?? ''}
                onChange={e => set('sponsor_tagline', e.target.value)}
                placeholder="e.g. Proud sponsor of community sports"
                className={inp}
              />
            </Row>
            <Row label="Accent color" hint="Hex color (#ef6442). Banner background tint + button color. Falls back to the column's brand color if blank.">
              <div className="flex items-center gap-2">
                <input
                  value={ad.accent_color ?? ''}
                  onChange={e => set('accent_color', e.target.value)}
                  placeholder="#ef6442"
                  className={`${inp} flex-1`}
                />
                {ad.accent_color && (
                  <span
                    className="shrink-0 w-9 h-9 rounded-md border border-gray-200"
                    style={{ backgroundColor: ad.accent_color }}
                    title={ad.accent_color}
                  />
                )}
              </div>
            </Row>
          </Section>
        )}

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

        {/* ── Ad size (rotation weight under the hood) ─────────────
            Hidden entirely for sponsor-category slots — those are
            always exclusive, no sharing, so there's nothing to set.
            For every other slot, staff picks an Ad Size and the
            rotation_weight + rotation_group are derived behind the
            scenes (no raw weight field to confuse anyone). */}
        {def && def.category !== 'sponsor' && (
          <Section
            title="Ad size"
            subtitle="If multiple advertisers share this slot, larger sizes get more impressions automatically. Full = 4× a Quarter."
          >
            <Row label="Size">
              <select
                // Map the underlying rotation_weight to a friendly tier.
                value={
                  ad.rotation_weight == null || ad.rotation_weight >= 3.5 ? 'full'
                  : ad.rotation_weight >= 2.5 ? 'half'
                  : ad.rotation_weight >= 1.5 ? 'third'
                  : ad.rotation_weight >= 0.75 ? 'quarter'
                  : 'sixth'
                }
                onChange={e => {
                  const weights: Record<string, number> = {
                    full: 4, half: 3, third: 2, quarter: 1, sixth: 0.5,
                  }
                  set('rotation_weight', weights[e.target.value] ?? 1)
                  // Default rotation_group when staff sets a size — keeps the
                  // ad in the slot's shared pool unless they really want to
                  // lock it. Editor doesn't see this field; it's derived.
                  if (!ad.rotation_group) set('rotation_group', `${ad.placement_type}-pool`)
                }}
                className={inp}
              >
                <option value="full">Full page (largest share)</option>
                <option value="half">Half page</option>
                <option value="third">Third page</option>
                <option value="quarter">Quarter page (smallest tier)</option>
                <option value="sixth">Sixth page (smallest)</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                Share math is automatic: with 1 advertiser in the slot, this ad gets 100% of impressions
                regardless of size. With 2+ advertisers, share = this size ÷ total sizes in the pool.
              </p>
            </Row>
          </Section>
        )}

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
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
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

// ── Live preview ─────────────────────────────────────────────────────────────
// Roughly matches the public render style: image left, text + CTA right.
// Section-sponsor placements get the branded banner variant instead.

function AdPreview({ ad }: { ad: AdRow }) {
  const isSponsor = ad.placement_type === 'section_sponsor'
  const accent    = ad.accent_color && /^#[0-9a-f]{3,8}$/i.test(ad.accent_color) ? ad.accent_color : '#0f172a'

  if (isSponsor) {
    return (
      <div className="rounded-xl p-5 text-white shadow-sm" style={{ backgroundColor: accent }}>
        <div className="flex items-center gap-4">
          {ad.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.logo_url}
              alt={ad.ad_headline ?? ''}
              className="shrink-0 w-14 h-14 rounded-lg bg-white object-contain p-1"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-0.5">
              {ad.ad_eyebrow || 'Sponsored by'}
            </p>
            <p className="text-lg font-black leading-tight truncate">{ad.ad_headline || '(headline)'}</p>
            {ad.sponsor_tagline && (
              <p className="text-sm italic opacity-90 leading-snug mt-1 truncate">{ad.sponsor_tagline}</p>
            )}
          </div>
          {ad.ad_cta_label && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-xs font-bold whitespace-nowrap">
              {ad.ad_cta_label}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Default ad preview (homepage inline / sidebar / article inline / etc.)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        {ad.ad_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.ad_image_url}
            alt={ad.ad_headline ?? ''}
            className="shrink-0 w-20 h-20 rounded-lg object-cover bg-gray-100"
          />
        ) : (
          <div className="shrink-0 w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 text-center px-2">
            (image)
          </div>
        )}
        <div className="flex-1 min-w-0">
          {ad.ad_eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">
              {ad.ad_eyebrow}
            </p>
          )}
          <p className="text-base font-bold text-gray-900 leading-snug">
            {ad.ad_headline || <span className="text-gray-300">(headline)</span>}
          </p>
          {ad.ad_description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-snug">{ad.ad_description}</p>
          )}
          {ad.ad_cta_label && ad.ad_link && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-primary">
              {ad.ad_cta_label}
              <ExternalLink size={10} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
