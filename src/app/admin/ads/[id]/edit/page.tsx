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
import { ArrowLeft, Save, Pencil, AlertTriangle, MapPin, ExternalLink, Link2, Copy, Check, Users, Building2 } from 'lucide-react'
import { groupedPlacementTypes, findPlacementType } from '@/lib/ads/placement-types'
import { PageLayoutPreview } from '@/components/admin/PageLayoutPreview'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'

interface AdvertiserOption {
  id:             string
  business_name:  string
  slug:           string | null
  contact_name:   string | null
  contact_email:  string | null
  contact_phone:  string | null
}

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
  // Soft archive (migration 124). When set, the ad is hidden from the
  // public site and from /admin/ads default views, but preserved in the
  // customer's history.
  archived_at:           string | null
  // Section-sponsor specific fields (placement_type='section_sponsor').
  // Live on every ad_placements row but only meaningful when sponsoring
  // a vertical/column — the edit form only surfaces them in that case.
  accent_color:          string | null
  logo_url:              string | null
  sponsor_tagline:       string | null
  // Creative format (migration 125).
  //   'composed' = platform formats eyebrow/headline/desc/CTA + image
  //   'image'    = full-bleed advertiser-supplied image, click goes to ad_link
  creative_mode:         'composed' | 'image'
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
  const [advertisers, setAdvertisers] = useState<AdvertiserOption[]>([])

  useEffect(() => {
    fetch(`/api/admin/ads/item?id=${id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j.error) { setError(j.error); return }
        setAd(j.ad)
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))

    // Advertiser dropdown options. Loaded in parallel with the ad —
    // shows up empty for a beat then populates, which is fine on a
    // form where the existing advertiser_account_id is already shown.
    fetch('/api/admin/advertisers/list', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { advertisers: [] })
      .then(j => setAdvertisers((j.advertisers ?? []) as AdvertiserOption[]))
      .catch(() => {/* silent — advertisers list is optional UX */})
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
              <Pencil size={18} className="text-primary shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Edit placement</span>
            </div>
            {/* Slot name as the actual H1 — it's the most useful thing to
                see at the top of the page. Recommended size + slug live
                underneath as supporting context. */}
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight">
              {def?.label ?? ad.placement_type}
            </h1>
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
              {def?.recommendedImageSize && (
                <p><strong className="text-gray-700">Recommended size:</strong> {def.recommendedImageSize}</p>
              )}
              <p>
                Slug: <code className="text-[11px] text-gray-400">{ad.placement_type}</code>
                {ad.context_slug && <> · Page: <code className="text-[11px] text-gray-400">{ad.context_slug}</code></>}
              </p>
            </div>
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

        {ad.archived_at && (
          <ExpiredBanner
            expiredAt={ad.archived_at}
            onRenew={async () => {
              const res = await fetch('/api/admin/ads/restore', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body:   JSON.stringify({ id }),
              })
              if (res.ok) {
                set('archived_at', null)
                setSuccess(true)
              } else {
                const j = await res.json().catch(() => ({}))
                setError(j?.error ?? `HTTP ${res.status}`)
              }
            }}
            onDeleteForever={async () => {
              const typed = window.prompt('Permanently delete this ad? Type DELETE to confirm. This cannot be undone.')
              if (typed !== 'DELETE') return
              const res = await fetch('/api/admin/ads/delete-forever', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body:   JSON.stringify({ id }),
              })
              if (res.ok) {
                router.push('/admin/ads')
              } else {
                const j = await res.json().catch(() => ({}))
                setError(j?.error ?? `HTTP ${res.status}`)
              }
            }}
          />
        )}
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

        {/* ── Customer / Advertiser ───────────────────────────────
            Every ad belongs to a customer. Pick from the advertisers
            list; the dropdown auto-loads their contact info so renewal
            reminders + tracked link metadata all wire back to the same
            advertiser record. */}
        <CustomerSection
          ad={ad}
          advertisers={advertisers}
          onChange={(advertiserId) => {
            set('advertiser_account_id', advertiserId)
            // When the editor picks an advertiser, auto-fill the renewal
            // contact from their account record IF those fields are blank
            // (don't clobber an existing override).
            const adv = advertisers.find(a => a.id === advertiserId)
            if (adv) {
              if (!ad.advertiser_email && adv.contact_email) set('advertiser_email', adv.contact_email)
            }
          }}
        />

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

        {/* ── Creative ──────────────────────────────────────────
            Two modes per ad row:
            • Composed — platform formats eyebrow/headline/desc/CTA + image.
            • Image    — full-bleed advertiser-supplied creative, link only.
            Sponsor/newsletter/footer slots are locked to Composed (the
            mode dropdown is hidden) because a full-bleed image doesn't
            fit their layout. */}
        <Section title="Creative">
          {def?.allowsImageMode !== false && (
            <Row
              label="Format"
              hint="Composed = platform formats the ad. Image = your finished JPG/PNG fills the slot, no text added."
            >
              <select
                value={ad.creative_mode ?? 'composed'}
                onChange={e => set('creative_mode', e.target.value as 'composed' | 'image')}
                className={inp}
              >
                <option value="composed">Composed (we format)</option>
                <option value="image">Image (full creative)</option>
              </select>
              {def?.recommendedImageSize && (
                <p className="text-[11px] text-gray-600 mt-1.5">
                  <strong>Recommended size:</strong> {def.recommendedImageSize}
                </p>
              )}
            </Row>
          )}

          {/* Composed-mode fields. Hidden in Image mode but the data
              stays on the row so the editor can flip back without
              re-entering everything. */}
          {ad.creative_mode !== 'image' && (
            <>
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
            </>
          )}

          {/* Both modes need a CTA link + an image. */}
          <Row
            label="CTA link"
            hintNode={<span className="text-red-600 font-semibold">(generate tracked link below for clicks to count in reports)</span>}
          >
            <input value={ad.ad_link ?? ''} onChange={e => set('ad_link', e.target.value)} placeholder="/healthy-kids-guide/listings/…" className={inp} />
          </Row>
          <Row
            label={ad.creative_mode === 'image' ? 'Ad image (full creative)' : 'Image'}
            hint="Upload from your device or paste a URL. Drag-and-drop, then use Zoom & adjust to crop."
          >
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

        {/* ── Tracked CTA link ────────────────────────────────────
            Sits right under Creative because the CTA Link field is up
            in Creative — keeping the tracked equivalent next to it
            means staff doesn't have to scroll to wire one to the other. */}
        <TrackedLinkSection adId={id} adLink={ad.ad_link ?? ''} />

        {/* ── Section sponsor fields — only when this slot IS one ── */}
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
            Only relevant for in-article body ads — that's where the
            Full/Half/Quarter tier system actually applies (multiple
            advertisers buy different sizes in the same body slot).
            For sidebars, in-feed cards, and other rotating slots the
            sharing is naturally even — no size to pick. */}
        {def && def.category === 'in-article' && (
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

function Row({ label, hint, hintNode, children }: { label: string; hint?: string; hintNode?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[180px_1fr] gap-2 sm:gap-4 items-start">
      <div className="pt-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</label>
        {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
        {hintNode && <p className="text-[11px] mt-0.5">{hintNode}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ── Archived banner ──────────────────────────────────────────────────────────
// Shown at the top of the edit form when archived_at is set. Restore brings
// it back; Delete forever (typed-confirm) is for genuine cleanups.

// ExpiredBanner — surfaces at the top of an expired ad's edit page.
// "Archived" is the column name (archived_at) but staff-facing language
// is "Expired" because that's how the editor thinks about ads that have
// rotated off the active list (renewal lapsed, sale ended, etc.).
function ExpiredBanner({ expiredAt, onRenew, onDeleteForever }: {
  expiredAt:       string
  onRenew:         () => void | Promise<void>
  onDeleteForever: () => void | Promise<void>
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-sm font-bold text-amber-900">
          This ad is expired (since {new Date(expiredAt).toLocaleDateString()}).
        </p>
        <p className="text-xs text-amber-800 mt-0.5">
          Hidden from the public site and from the active ads list, but kept in the customer&apos;s history.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRenew}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
        >
          Renew (reactivate)
        </button>
        <button
          type="button"
          onClick={onDeleteForever}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-bold hover:bg-red-50"
          title="Permanent delete — for genuine cleanup only"
        >
          Delete permanently
        </button>
      </div>
    </div>
  )
}

// ── Customer / Advertiser section ────────────────────────────────────────────
// First section of the form on purpose — everything else (renewal contact,
// tracked link labels, reports) should descend from "who is this ad for?".

interface CustomerAd {
  id:               string
  placement_type:   string
  context_slug:     string | null
  ad_headline:      string | null
  is_active:        boolean
  starts_at:        string | null
  ends_at:          string | null
  archived_at:      string | null
  impression_count: number
  click_count:      number
}

function CustomerSection({ ad, advertisers, onChange }: {
  ad:          AdRow
  advertisers: AdvertiserOption[]
  onChange:    (advertiserId: string | null) => void
}) {
  const selected = ad.advertiser_account_id
    ? advertisers.find(a => a.id === ad.advertiser_account_id)
    : null

  // Other ads for this advertiser. Fetched lazily when an advertiser
  // is set. Empty until then; refreshes when the editor switches
  // advertiser via the dropdown.
  const [otherAds, setOtherAds] = useState<CustomerAd[]>([])
  const [adsLoading, setAdsLoading] = useState(false)
  useEffect(() => {
    if (!ad.advertiser_account_id) { setOtherAds([]); return }
    let cancelled = false
    setAdsLoading(true)
    fetch(`/api/admin/advertisers/${ad.advertiser_account_id}/ads`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { ads: [] })
      .then(j => { if (!cancelled) setOtherAds((j.ads ?? []) as CustomerAd[]) })
      .catch(() => {/* non-critical */})
      .finally(() => { if (!cancelled) setAdsLoading(false) })
    return () => { cancelled = true }
  }, [ad.advertiser_account_id])

  // This ad itself is in the list — exclude it so the editor sees
  // "what ELSE this customer is running." Group by active vs expired
  // for the two-section render.
  const otherAdsFiltered = otherAds.filter(o => o.id !== ad.id)
  const activeOtherAds   = otherAdsFiltered.filter(o => !o.archived_at)
  const expiredOtherAds  = otherAdsFiltered.filter(o => o.archived_at)

  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Users size={16} className="text-primary" />
          Customer (advertiser)
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          The business this ad belongs to. Their contact info auto-fills the renewal reminder fields below
          and tracked-link reports group every click back to this customer.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <Row label="Advertiser" hint="Pick from your customer list. Need to create one first? Open Advertisers.">
          <select
            value={ad.advertiser_account_id ?? ''}
            onChange={e => onChange(e.target.value || null)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400"
          >
            <option value="">(no advertiser selected)</option>
            {advertisers.map(a => (
              <option key={a.id} value={a.id}>{a.business_name}</option>
            ))}
          </select>
        </Row>

        {selected && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                <Building2 size={11} /> Business
              </p>
              <p className="text-sm font-bold text-gray-900">{selected.business_name}</p>
              {selected.slug && (
                <Link
                  href={`/admin/advertisers/${selected.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline mt-1"
                >
                  Open in Advertisers <ExternalLink size={10} />
                </Link>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                Contact
              </p>
              {selected.contact_name && <p className="text-sm font-semibold text-gray-900">{selected.contact_name}</p>}
              {selected.contact_email && (
                <a href={`mailto:${selected.contact_email}`} className="block text-xs text-blue-700 hover:underline">
                  {selected.contact_email}
                </a>
              )}
              {selected.contact_phone && (
                <a href={`tel:${selected.contact_phone}`} className="block text-xs text-gray-700">
                  {selected.contact_phone}
                </a>
              )}
              {!selected.contact_name && !selected.contact_email && !selected.contact_phone && (
                <p className="text-xs text-gray-400 italic">No contact info on file.</p>
              )}
            </div>
          </div>
        )}

        {!selected && ad.advertiser_account_id && (
          <p className="text-xs text-amber-700">
            This ad references an advertiser ID that isn&apos;t in your list — they may have been deleted.
            Pick a current advertiser or leave blank.
          </p>
        )}

        {/* ── Ad placements for this customer ────────────────
            Two groups — Active (currently running, paused, or
            scheduled) and Expired (rotated off the active list,
            either manually or automatically). Helps the editor
            spot upsell opportunities AND see the full ad history
            with this customer at a glance. */}
        {selected && (
          <div className="space-y-3">
            {adsLoading ? (
              <p className="text-xs text-gray-400">Loading customer ad history…</p>
            ) : otherAdsFiltered.length === 0 ? (
              <div className="rounded-xl border border-gray-200 p-3 text-xs text-gray-500 italic">
                This is the only ad this customer is running. Could be an upsell opportunity.
              </div>
            ) : (
              <>
                <CustomerAdGroup
                  label={`Other active ad placements — ${selected.business_name}`}
                  empty="No other active placements for this customer."
                  ads={activeOtherAds}
                />
                <CustomerAdGroup
                  label={`Expired ad placements — ${selected.business_name}`}
                  empty="No expired placements yet."
                  ads={expiredOtherAds}
                  isExpired
                />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function CustomerAdPill({ active }: { active: boolean }) {
  return active ? (
    <span className="shrink-0 inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-600 text-white">ON</span>
  ) : (
    <span className="shrink-0 inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-300 text-gray-700">OFF</span>
  )
}

// CustomerAdGroup — one section of the customer's ad history (Active or
// Expired). Both render the same row shape, with Expired rows muted and
// tagged differently.
function CustomerAdGroup({ label, empty, ads, isExpired }: {
  label:     string
  empty:     string
  ads:       CustomerAd[]
  isExpired?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
          {label}
        </p>
        <span className="text-[10px] text-gray-500">
          {ads.length} {ads.length === 1 ? 'ad' : 'ads'}
        </span>
      </div>
      {ads.length === 0 ? (
        <p className="p-3 text-xs text-gray-500 italic">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {ads.slice(0, 10).map(other => (
            <li key={other.id} className={`px-4 py-2 flex items-center gap-3 hover:bg-gray-50 ${isExpired ? 'opacity-70' : ''}`}>
              {isExpired ? (
                <span className="shrink-0 inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-600 text-white">
                  Expired
                </span>
              ) : (
                <CustomerAdPill active={other.is_active} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-xs font-bold truncate ${isExpired ? 'text-gray-600' : 'text-gray-900'}`}>
                    {findPlacementType(other.placement_type)?.label ?? other.placement_type}
                  </p>
                  {other.context_slug && (
                    <code className="text-[10px] text-gray-400 font-mono truncate">{other.context_slug}</code>
                  )}
                </div>
                {other.ad_headline && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{other.ad_headline}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                {isExpired && other.archived_at ? (
                  <p className="text-[10px] text-gray-500">
                    Expired {new Date(other.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                ) : other.ends_at ? (
                  <p className="text-[10px] text-gray-500">
                    Ends {new Date(other.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                ) : null}
                <Link href={`/admin/ads/${other.id}/edit`} className="text-[10px] font-bold text-primary hover:underline">
                  Open →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Tracked link section ─────────────────────────────────────────────────────
// Generates a /go/<shortcode> redirect for this ad. Click count rolls into
// the same dashboard as magazine QR codes — same pipeline, different surface.

interface TrackedLink {
  id:           string
  shortcode:    string
  destination:  string
  click_count:  number
  is_active:    boolean
  created_at:   string
}

function TrackedLinkSection({ adId, adLink }: { adId: string; adLink: string }) {
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(false)
  const [link,    setLink]    = useState<TrackedLink | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/ads/tracked-link?id=${adId}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) { setLink(j.link); setError(j.error ?? null) } })
      .catch(() => {/* silent — tracking is optional */})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [adId])

  async function create() {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const res  = await fetch('/api/admin/ads/tracked-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: adId }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? `HTTP ${res.status}`); return }
      setLink(json.link as TrackedLink)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const trackedUrl = link ? `${origin}/go/${link.shortcode}` : null

  async function copy() {
    if (!trackedUrl) return
    try {
      await navigator.clipboard.writeText(trackedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {/* clipboard blocked — user can select manually */}
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Link2 size={16} className="text-primary" />
          Tracked CTA link
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Optional. Generate a <code className="text-[11px] bg-gray-100 px-1 rounded">/go/&lt;shortcode&gt;</code> redirect
          for this ad — every click is counted and tagged with UTM parameters, same as a magazine QR. Reports roll up
          alongside print scans.
        </p>
      </div>
      <div className="p-5 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !link ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={create}
              disabled={busy || !adLink}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 disabled:opacity-40"
            >
              <Link2 size={14} />
              {busy ? 'Generating…' : 'Generate tracked link'}
            </button>
            {!adLink && (
              <p className="text-[11px] text-amber-700">
                Set a CTA link in the Creative section first — the tracked URL needs a destination to redirect to.
              </p>
            )}
            {error && <p className="text-xs text-red-700">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-center">
              <code className="block bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono text-gray-900 truncate">
                {trackedUrl}
              </code>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
                {trackedUrl && (
                  <a
                    href={trackedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink size={12} /> Open
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Clicks</p>
                <p className="text-base font-black text-gray-900 tabular-nums">{link.click_count.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Destination</p>
                <p className="text-[11px] text-gray-700 truncate font-mono">{link.destination}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Created</p>
                <p className="text-[11px] text-gray-700">{new Date(link.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              <strong>Tip:</strong> swap the Creative CTA link to this tracked URL if you want every public click
              to count. The site still works with the raw URL; switching is optional.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Live preview ─────────────────────────────────────────────────────────────
// Picks a render variant based on the placement's category so the editor
// sees a preview that roughly matches the public site for that slot.

function AdPreview({ ad }: { ad: AdRow }) {
  const def = findPlacementType(ad.placement_type)

  // Image mode — full-bleed image at the slot's natural aspect ratio.
  // Category drives the dimensions so a sidebar square stays square and
  // a bottom banner stays wide. Falls back to composed preview if no
  // image is set (avoids a giant empty rectangle).
  if (ad.creative_mode === 'image' && ad.ad_image_url) {
    return <ImageOnlyPreview ad={ad} category={def?.category} placementType={ad.placement_type} />
  }

  // Specific placements get bespoke previews; otherwise fall back to
  // the category-level variant.
  if (ad.placement_type === 'section_sponsor')       return <SponsorPreview ad={ad} />
  if (ad.placement_type === 'homepage_sidebar_ad')   return <SquareCardPreview ad={ad} />
  if (ad.placement_type === 'homepage_business_spotlight') return <DarkCardPreview ad={ad} />
  if (ad.placement_type === 'homepage_bottom_ad')    return <BannerPreview ad={ad} wide />
  if (ad.placement_type === 'homepage_hero_rotator') return <HeroPreview ad={ad} />
  if (ad.placement_type === 'newsletter_sponsor')    return <NewsletterPreview ad={ad} />
  if (ad.placement_type === 'site_footer_partners')  return <FooterPreview ad={ad} />

  switch (def?.category) {
    case 'sidebar':    return <SquareCardPreview ad={ad} />
    case 'inline':     return <InlinePreview ad={ad} />
    case 'in-article': return <InArticlePreview ad={ad} />
    case 'footer':     return <BannerPreview ad={ad} wide />
    case 'hero':       return <HeroPreview ad={ad} />
    case 'sponsor':    return <SponsorPreview ad={ad} />
    default:           return <InlinePreview ad={ad} />
  }
}

// Image-only preview — full-bleed clickable image at the slot's natural
// aspect ratio. Wrapper sized per category so sidebar squares stay square,
// bottom banners stay wide, hero rotator stays 3:1.
function ImageOnlyPreview({ ad, category, placementType }: {
  ad:            AdRow
  category:      string | undefined
  placementType: string
}) {
  const aspect =
    placementType === 'homepage_sidebar_ad' ? '1 / 1'           :
    placementType === 'homepage_hero_rotator' ? '3 / 1'         :
    category === 'sidebar'    ? '1 / 1'                          :
    category === 'hero'       ? '3 / 1'                          :
    category === 'footer'     ? '3 / 1'                          :
    category === 'in-article' ? '5 / 2'                          :
                                '5 / 2'  // inline default
  const maxW =
    category === 'sidebar' ? 'max-w-[224px]' :
    category === 'hero'    ? 'max-w-2xl'     :
    category === 'footer'  ? 'max-w-2xl'     :
                             'max-w-xl'

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-sm border border-gray-200 ${maxW}`} style={{ aspectRatio: aspect }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.ad_image_url ?? ''}
        alt={ad.ad_headline ?? ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {ad.ad_link && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-bold bg-white/90 text-gray-700 px-1.5 py-0.5 rounded">
          <ExternalLink size={9} /> {ad.ad_link.replace(/^https?:\/\//, '').slice(0, 24)}…
        </span>
      )}
    </div>
  )
}

// Inline horizontal card — image left, text + CTA right. Default for
// most in-feed/sidebar/article placements.
function InlinePreview({ ad }: { ad: AdRow }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm max-w-xl">
      <div className="flex items-start gap-4">
        <PreviewImage src={ad.ad_image_url} alt={ad.ad_headline} size={80} />
        <div className="flex-1 min-w-0">
          <PreviewEyebrow text={ad.ad_eyebrow} />
          <PreviewHeadline text={ad.ad_headline} size="md" />
          {ad.ad_description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-snug">{ad.ad_description}</p>
          )}
          <PreviewCta label={ad.ad_cta_label} hasLink={!!ad.ad_link} />
        </div>
      </div>
    </div>
  )
}

// Square sidebar card with overlay text — homepage_sidebar_ad style.
function SquareCardPreview({ ad }: { ad: AdRow }) {
  return (
    <div className="relative w-56 aspect-square rounded-2xl overflow-hidden shadow-sm bg-gray-200">
      {ad.ad_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.ad_image_url} alt={ad.ad_headline ?? ''} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-500">(image)</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute top-3 left-3">
        <span className="text-[9px] text-white/90 font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded">
          {ad.ad_eyebrow || 'Advertisement'}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <p className="text-base font-bold leading-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          {ad.ad_headline || <span className="text-white/60 italic">(headline)</span>}
        </p>
        {ad.ad_cta_label && (
          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold bg-white text-gray-900 px-2.5 py-1 rounded-full">
            {ad.ad_cta_label}
          </span>
        )}
      </div>
    </div>
  )
}

// Dark Business Spotlight card — homepage_business_spotlight style.
function DarkCardPreview({ ad }: { ad: AdRow }) {
  return (
    <div className="rounded-2xl bg-gray-900 text-white p-5 max-w-sm shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      {ad.ad_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.ad_image_url} alt="" className="w-full h-24 object-cover rounded-lg mb-3" />
      )}
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
        {ad.ad_eyebrow || 'Business Spotlight'}
      </p>
      <p className="text-lg font-bold leading-tight">
        {ad.ad_headline || <span className="text-white/40">(headline)</span>}
      </p>
      {ad.ad_description && (
        <p className="text-sm text-white/75 mt-2 line-clamp-2">{ad.ad_description}</p>
      )}
      {ad.ad_cta_label && (
        <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-primary">
          {ad.ad_cta_label} <ExternalLink size={10} />
        </span>
      )}
    </div>
  )
}

// Wide gradient banner — homepage_bottom_ad / footer variants.
function BannerPreview({ ad, wide }: { ad: AdRow; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-secondary/10 to-primary/10 border border-gray-200 p-5 shadow-sm ${wide ? 'max-w-2xl' : 'max-w-xl'}`}>
      <div className="flex items-center gap-5">
        <PreviewImage src={ad.ad_image_url} alt={ad.ad_headline} size={120} rounded="rounded-2xl" />
        <div className="flex-1 min-w-0">
          <PreviewEyebrow text={ad.ad_eyebrow} />
          <PreviewHeadline text={ad.ad_headline} size="lg" />
          {ad.ad_description && (
            <p className="text-sm text-gray-600 mt-1 leading-snug">{ad.ad_description}</p>
          )}
        </div>
        {ad.ad_cta_label && (
          <span className="shrink-0 inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold whitespace-nowrap">
            {ad.ad_cta_label}
          </span>
        )}
      </div>
    </div>
  )
}

// In-article body break — appears mid-paragraph, wider.
function InArticlePreview({ ad }: { ad: AdRow }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 max-w-xl">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
        {ad.ad_eyebrow || 'Sponsored'}
      </p>
      <div className="flex items-center gap-3">
        <PreviewImage src={ad.ad_image_url} alt={ad.ad_headline} size={64} />
        <div className="flex-1 min-w-0">
          <PreviewHeadline text={ad.ad_headline} size="md" />
          {ad.ad_description && (
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{ad.ad_description}</p>
          )}
        </div>
        {ad.ad_cta_label && (
          <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold">
            {ad.ad_cta_label}
          </span>
        )}
      </div>
    </div>
  )
}

// Big hero rotator — used at the very top of homepage.
function HeroPreview({ ad }: { ad: AdRow }) {
  return (
    <div className="relative aspect-[3/1] w-full max-w-2xl rounded-2xl overflow-hidden bg-gray-200 shadow-sm">
      {ad.ad_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.ad_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-gray-500">(hero image)</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{ad.ad_eyebrow || 'Featured'}</p>
        <p className="text-2xl font-black leading-tight max-w-md" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {ad.ad_headline || <span className="opacity-60 italic">(headline)</span>}
        </p>
        {ad.ad_cta_label && (
          <span className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-white text-gray-900 rounded-full text-sm font-bold w-fit">
            {ad.ad_cta_label} <ExternalLink size={12} />
          </span>
        )}
      </div>
    </div>
  )
}

// Newsletter sponsor block — styled to look like an email body row.
function NewsletterPreview({ ad }: { ad: AdRow }) {
  return (
    <div className="max-w-md mx-auto rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
        {ad.ad_eyebrow || 'Sponsored'}
      </p>
      {ad.ad_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.ad_image_url} alt="" className="w-full h-32 object-cover rounded-md mb-3" />
      )}
      <p className="text-lg font-bold text-gray-900 leading-tight">
        {ad.ad_headline || <span className="text-gray-300">(headline)</span>}
      </p>
      {ad.ad_description && (
        <p className="text-sm text-gray-600 mt-1 leading-snug">{ad.ad_description}</p>
      )}
      {ad.ad_cta_label && (
        <a className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-primary text-white rounded-md text-sm font-bold no-underline">
          {ad.ad_cta_label}
        </a>
      )}
    </div>
  )
}

// Footer partner logo strip — just shows the image as a logo, smaller.
function FooterPreview({ ad }: { ad: AdRow }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 max-w-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Footer partner</p>
      <div className="flex items-center gap-3">
        {ad.ad_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.ad_image_url} alt={ad.ad_headline ?? ''} className="h-10 w-auto object-contain" />
        ) : (
          <div className="h-10 w-24 bg-gray-100 rounded flex items-center justify-center text-[9px] text-gray-400">
            (logo)
          </div>
        )}
        <span className="text-xs text-gray-700 font-semibold">{ad.ad_headline || '(name)'}</span>
      </div>
    </div>
  )
}

// Section sponsor — the "presented by" branded banner.
function SponsorPreview({ ad }: { ad: AdRow }) {
  const accent = ad.accent_color && /^#[0-9a-f]{3,8}$/i.test(ad.accent_color) ? ad.accent_color : '#0f172a'
  return (
    <div className="rounded-xl p-5 text-white shadow-sm max-w-2xl" style={{ backgroundColor: accent }}>
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

// ── Preview building blocks ─────────────────────────────────────────────────

function PreviewImage({ src, alt, size, rounded }: { src: string | null; alt: string | null; size: number; rounded?: string }) {
  const r = rounded ?? 'rounded-lg'
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ''} style={{ width: size, height: size }} className={`shrink-0 ${r} object-cover bg-gray-100`} />
    )
  }
  return (
    <div style={{ width: size, height: size }} className={`shrink-0 ${r} bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 text-center px-2`}>
      (image)
    </div>
  )
}

function PreviewEyebrow({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">{text}</p>
  )
}

function PreviewHeadline({ text, size }: { text: string | null; size: 'md' | 'lg' }) {
  const cls = size === 'lg'
    ? 'text-lg font-bold text-gray-900 leading-snug'
    : 'text-base font-bold text-gray-900 leading-snug'
  return <p className={cls}>{text || <span className="text-gray-300">(headline)</span>}</p>
}

function PreviewCta({ label, hasLink }: { label: string | null; hasLink: boolean }) {
  if (!label || !hasLink) return null
  return (
    <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-primary">
      {label} <ExternalLink size={10} />
    </span>
  )
}
