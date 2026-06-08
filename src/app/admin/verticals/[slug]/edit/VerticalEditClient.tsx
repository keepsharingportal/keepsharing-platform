'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Save, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Crown } from 'lucide-react'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { FieldLabel, FieldHint, SectionHelp } from '@/components/admin/AdminHelp'

interface InitialState {
  display_name:       string
  subtitle:           string
  description:        string
  hero_image_url:     string
  homepage_image_url: string
  brand_color:        string
  primary_cta_label:  string
  primary_cta_url:    string
  sponsor_label:      string
  is_active:          boolean
}

interface Props {
  slug:                string
  publicPath:          string
  sponsorBusinessName: string | null
  initial:             InitialState
}

export function VerticalEditClient({ slug, publicPath, sponsorBusinessName, initial }: Props) {
  const router = useRouter()
  const [form, setForm]     = useState<InitialState>(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null)

  function set<K extends keyof InitialState>(k: K, v: InitialState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res  = await fetch(`/api/admin/verticals/${slug}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ text: json?.error ?? `Save failed (${res.status})`, ok: false }); return }
      setMsg({ text: 'Saved. Public page refreshed.', ok: true })
      router.refresh()
      setTimeout(() => setMsg(null), 4000)
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-portal-border outline-none focus:border-portal-blue bg-white'

  return (
    <div className="space-y-6">

      <SectionHelp variant="tip" title="What is a vertical?">
        A <strong>vertical</strong> is a year-round content home (School Zone, Mom Knows Best)
        — different from a <strong>guide</strong>, which is a monthly print issue with
        listings. Verticals don't rotate through the homepage Featured Month slot;
        they have a fixed home and stay there.
      </SectionHelp>

      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-white border-b border-portal-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {msg && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${msg.ok ? 'bg-portal-green-lt text-portal-green' : 'bg-red-100 text-red-700'} inline-flex items-center gap-1`}>
              {msg.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              {msg.text}
            </span>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-portal-text">Identity</h2>

        <div>
          <FieldLabel hint="The main headline shown in the hero on the public page. Keep it short and recognizable — this is what visitors will associate with the section.">
            Display name
          </FieldLabel>
          <input className={inp} value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="e.g. School Zone" />
        </div>

        <div>
          <FieldLabel hint="One sentence shown right under the page title. Sets expectations for what visitors will find here.">
            Subtitle / tagline
          </FieldLabel>
          <textarea rows={2} className={`${inp} resize-y`} value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="Short line shown under the page title." />
        </div>

        <div>
          <FieldLabel hint="Used for meta descriptions (SEO) and About-this-vertical sidebar widgets. 2-4 sentences is plenty.">
            Long description (optional)
          </FieldLabel>
          <textarea rows={5} className={`${inp} resize-y`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Used in About-this-vertical sidebar widgets and meta descriptions." />
        </div>

        <label className="flex items-center gap-2 text-sm pt-1">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
          Active (shows on public site)
        </label>
        <FieldHint className="!mt-1">
          Unchecking this hides the vertical from public navigation but keeps existing articles reachable by direct link.
        </FieldHint>

        <p className="text-[11px] text-portal-muted pt-2 border-t border-portal-border">
          Public landing: <code className="px-1 bg-gray-100 rounded">{publicPath}</code>
        </p>
      </section>

      {/* ── Images ────────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-border bg-white p-5 space-y-5">
        <h2 className="text-sm font-bold text-portal-text">Images</h2>

        <div>
          <FieldLabel hint="Wide photo (16:9 or wider works best). Sits behind the title with a dark overlay, so detail-heavy images can get lost — choose something with a clear focal point or strong texture.">
            Hero image — top of public page
          </FieldLabel>
          <FieldHint className="mb-2">Used as the background behind the title with a dark overlay.</FieldHint>
          <HeroImageUpload
            value={form.hero_image_url}
            onChange={url => set('hero_image_url', url)}
            context="asset"
          />
        </div>

        <div className="pt-3 border-t border-portal-border">
          <FieldLabel hint="Optional. If empty, the homepage tile uses the hero image above. Set this if you want a tighter crop or a different shot for the homepage card.">
            Homepage tile image (optional)
          </FieldLabel>
          <FieldHint className="mb-2">Override for the homepage Featured Categories tile.</FieldHint>
          <HeroImageUpload
            value={form.homepage_image_url}
            onChange={url => set('homepage_image_url', url)}
            context="asset"
          />
        </div>
      </section>

      {/* ── Sponsor ───────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-amber/30 bg-portal-amber-lt/40 p-5 space-y-3">
        <h2 className="text-sm font-bold text-portal-text flex items-center gap-2">
          <Crown size={14} className="text-amber-600" />
          Section Sponsor
        </h2>

        {sponsorBusinessName ? (
          <div className="rounded-lg bg-white border border-portal-amber/30 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-portal-amber mb-1">Currently Sponsored</p>
            <p className="text-sm font-bold text-portal-text">{sponsorBusinessName}</p>
            <p className="text-[11px] text-portal-sub mt-1">
              Manage placement details at <a href="/admin/advertisers/sponsor-inventory" className="text-portal-blue hover:underline">Sponsor Inventory</a>.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-white border border-portal-amber/30 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-portal-amber mb-1">Available</p>
            <p className="text-sm text-portal-text">
              No sponsor on this vertical right now. The public page shows the &quot;Sponsor This Section Available&quot; CTA.
            </p>
            <Link
              href="/admin/advertisers/sponsor-inventory"
              className="inline-flex items-center gap-1 text-xs font-semibold text-portal-blue hover:underline mt-2"
            >
              Add a sponsor placement →
            </Link>
          </div>
        )}

        <div className="pt-2 border-t border-portal-amber/30/60">
          <FieldLabel hint='The line above the sponsor name on the public page. Examples: "Proudly Presented By", "Brought to you by", "In partnership with".'>
            Sponsor label
          </FieldLabel>
          <FieldHint className="mb-2">Text shown above the sponsor name on the public page.</FieldHint>
          <input
            className={inp}
            value={form.sponsor_label}
            onChange={e => set('sponsor_label', e.target.value)}
            placeholder="Proudly Presented By"
          />
        </div>
      </section>

      {/* ── Primary CTA ───────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-portal-text">Primary CTA</h2>
        <FieldHint className="-mt-2">Optional button in the hero area. Skip if not needed — the existing in-page CTAs (Submit School News, etc.) still appear regardless.</FieldHint>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel hint="The button text. Keep it action-first: a verb the visitor can take right now.">
              CTA label
            </FieldLabel>
            <input className={inp} value={form.primary_cta_label} onChange={e => set('primary_cta_label', e.target.value)} placeholder="e.g. Nominate Someone, Meet the Moms" />
          </div>
          <div>
            <FieldLabel hint='Where the button links. Can be on-site (e.g. "/nominate") or off-site (https://...).'>
              CTA URL
            </FieldLabel>
            <input
              type="url"
              className={inp}
              value={form.primary_cta_url}
              onChange={e => set('primary_cta_url', e.target.value)}
              placeholder={publicPath}
            />
            {form.primary_cta_url && (
              <a href={form.primary_cta_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mt-1.5">
                <ExternalLink size={11} /> Test link
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Theming (optional) ────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-border bg-white p-5 space-y-3">
        <h2 className="text-sm font-bold text-portal-text">Brand Accent (optional)</h2>
        <FieldHint className="-mt-1">
          Hex color used for accent borders + badges. Example: <code className="px-1 bg-gray-100 rounded">#d4a843</code> for gold.
        </FieldHint>
        <input
          className={`${inp} max-w-[200px]`}
          value={form.brand_color}
          onChange={e => set('brand_color', e.target.value)}
          placeholder="#d4a843"
        />
      </section>

    </div>
  )
}
