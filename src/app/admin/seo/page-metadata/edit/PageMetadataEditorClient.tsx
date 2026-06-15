'use client'

import { useState } from 'react'
import { Save, Sparkles, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { PageMetadataOverride } from '@/lib/seo/page-metadata-overrides'

interface Props {
  route:     string
  brandSlug: string | null
  initial:   PageMetadataOverride | null
}

export function PageMetadataEditorClient({ route, brandSlug, initial }: Props) {
  const [ogTitle,        setOgTitle]        = useState(initial?.ogTitle ?? '')
  const [ogDescription,  setOgDescription]  = useState(initial?.ogDescription ?? '')
  const [ogImageUrl,     setOgImageUrl]     = useState(initial?.ogImageUrl ?? '')
  const [twitterTitle,   setTwitterTitle]   = useState(initial?.twitterTitle ?? '')
  const [twitterDesc,    setTwitterDesc]    = useState(initial?.twitterDescription ?? '')
  const [twitterImage,   setTwitterImage]   = useState(initial?.twitterImageUrl ?? '')
  const [twitterCard,    setTwitterCard]    = useState<PageMetadataOverride['twitterCardType']>(initial?.twitterCardType ?? 'summary_large_image')
  const [pinDescription, setPinDescription] = useState(initial?.pinterestDescription ?? '')
  const [pinImageUrl,    setPinImageUrl]    = useState(initial?.pinterestImageUrl ?? '')
  const [noindex,        setNoindex]        = useState(!!initial?.noindex)
  const [canonical,      setCanonical]      = useState(initial?.canonicalOverride ?? '')

  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [saved,  setSaved]  = useState(false)

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/admin/seo/page-metadata', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          route_path:           route,
          brand_slug:           brandSlug,
          og_title:             ogTitle.trim()       || null,
          og_description:       ogDescription.trim() || null,
          og_image_url:         ogImageUrl.trim()    || null,
          twitter_card_type:    twitterCard          || null,
          twitter_title:        twitterTitle.trim()  || null,
          twitter_description:  twitterDesc.trim()   || null,
          twitter_image_url:    twitterImage.trim()  || null,
          pinterest_image_url:  pinImageUrl.trim()   || null,
          pinterest_description:pinDescription.trim()|| null,
          noindex,
          canonical_override:   canonical.trim()     || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'save failed'); return }
      setSaved(true); setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setSaving(false) }
  }

  async function aiAssist() {
    setAiBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/seo/page-metadata/assist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ route_path: route, brand_slug: brandSlug }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'AI assist failed'); return }
      if (j.og_title)             setOgTitle(j.og_title)
      if (j.og_description)       setOgDescription(j.og_description)
      if (j.twitter_title)        setTwitterTitle(j.twitter_title)
      if (j.twitter_description)  setTwitterDesc(j.twitter_description)
      if (j.pinterest_description) setPinDescription(j.pinterest_description)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setAiBusy(false) }
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>

      <div className="bg-white border border-portal-border rounded-lg p-5 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-portal-text">Open Graph (Facebook / LinkedIn)</h2>
          <button
            type="button" onClick={aiAssist} disabled={aiBusy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg disabled:opacity-50"
          >
            {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI assist
          </button>
        </div>

        <Field label="OG title" hint={`${ogTitle.length}/60 chars · used for FB + LinkedIn share preview`}>
          <input type="text" className={inputCls} value={ogTitle} onChange={e => setOgTitle(e.target.value)} placeholder="Inherits from page title if blank" />
        </Field>
        <Field label="OG description" hint={`${ogDescription.length}/155 chars · the share blurb`}>
          <textarea rows={3} className={`${inputCls} resize-vertical`} value={ogDescription} onChange={e => setOgDescription(e.target.value)} placeholder="Inherits from page description if blank" />
        </Field>
        <Field label="OG image URL" hint="1200×630 (1.91:1) recommended">
          <input type="text" className={inputCls} value={ogImageUrl} onChange={e => setOgImageUrl(e.target.value)} placeholder="Inherits from coded default if blank" />
        </Field>

        <hr className="border-portal-border" />

        <h2 className="text-[14px] font-bold text-portal-text">Twitter / X</h2>
        <Field label="Card type">
          <select className={inputCls} value={twitterCard ?? ''} onChange={e => setTwitterCard((e.target.value || null) as PageMetadataOverride['twitterCardType'])}>
            <option value="summary_large_image">Summary with large image (1200×675)</option>
            <option value="summary">Summary (small square thumbnail)</option>
          </select>
        </Field>
        <Field label="Twitter title" hint="Inherits OG title if blank">
          <input type="text" className={inputCls} value={twitterTitle} onChange={e => setTwitterTitle(e.target.value)} placeholder="(uses OG title)" />
        </Field>
        <Field label="Twitter description" hint="Inherits OG description if blank">
          <textarea rows={2} className={`${inputCls} resize-vertical`} value={twitterDesc} onChange={e => setTwitterDesc(e.target.value)} placeholder="(uses OG description)" />
        </Field>
        <Field label="Twitter image URL" hint="Inherits OG image if blank">
          <input type="text" className={inputCls} value={twitterImage} onChange={e => setTwitterImage(e.target.value)} placeholder="(uses OG image)" />
        </Field>

        <hr className="border-portal-border" />

        <h2 className="text-[14px] font-bold text-portal-text">Pinterest</h2>
        <Field label="Pinterest image URL" hint="1000×1500 (2:3) recommended">
          <input type="text" className={inputCls} value={pinImageUrl} onChange={e => setPinImageUrl(e.target.value)} placeholder="(falls back to OG image)" />
        </Field>
        <Field label="Pinterest description" hint="Up to 500 chars · keyword-rich; emojis OK">
          <textarea rows={3} className={`${inputCls} resize-vertical`} value={pinDescription} onChange={e => setPinDescription(e.target.value)} placeholder="(falls back to OG description)" />
        </Field>

        <hr className="border-portal-border" />

        <h2 className="text-[14px] font-bold text-portal-text">Indexing</h2>
        <Field label="Canonical URL override" hint="Use only for cross-brand or syndication scenarios">
          <input type="text" className={inputCls} value={canonical} onChange={e => setCanonical(e.target.value)} placeholder="(uses brand origin + path)" />
        </Field>
        <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
          <input type="checkbox" checked={noindex} onChange={e => setNoindex(e.target.checked)} />
          <span className="text-portal-text">noindex this route (hides from search engines)</span>
        </label>
      </div>

      <div className="bg-white border border-portal-border rounded-lg p-4 self-start sticky top-4">
        <div className="text-[13px] font-bold text-portal-text mb-2">Save changes</div>
        <p className="text-[12px] text-portal-sub leading-relaxed mb-3">
          Override applies on the next request — no rebuild needed.
        </p>
        <button
          type="button" onClick={save} disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <Save size={13} /> {saving ? 'Saving…' : 'Save override'}
        </button>
        {error && (
          <div className="mt-2.5 p-2 bg-portal-red-lt text-portal-red rounded text-[11px]">
            <AlertTriangle size={11} className="inline mr-1" /> {error}
          </div>
        )}
        {saved && (
          <div className="mt-2.5 p-2 bg-portal-green-lt text-portal-green rounded text-[11px]">
            <CheckCircle2 size={11} className="inline mr-1" /> Saved.
          </div>
        )}

        {/* Live preview */}
        <div className="mt-4">
          <div className="text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Live preview (FB/LinkedIn)</div>
          <div className="border border-portal-border rounded overflow-hidden">
            {ogImageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={ogImageUrl} alt="" className="w-full aspect-[1.91/1] object-cover bg-portal-bg" />
              : <div className="w-full aspect-[1.91/1] bg-portal-bg flex items-center justify-center text-[10px] text-portal-muted">No image set</div>
            }
            <div className="p-2 bg-white">
              <div className="text-[9px] text-portal-muted uppercase tracking-wider mb-0.5">{route}</div>
              <div className="text-[12px] font-semibold text-portal-text line-clamp-2">{ogTitle || '(inherits page title)'}</div>
              {(ogDescription || '') && (
                <div className="text-[10px] text-portal-sub line-clamp-2 mt-0.5">{ogDescription}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <div className="text-[11px] text-portal-sub mb-1">{hint}</div>}
      {children}
    </div>
  )
}
