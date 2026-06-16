'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, AlertTriangle } from 'lucide-react'

export function NewCampaignClient({ brands }: { brands: Array<{ slug: string; name: string }> }) {
  const router = useRouter()
  const [brandSlug,   setBrandSlug]   = useState(brands[0]?.slug ?? 'rrp')
  const [themeTitle,  setThemeTitle]  = useState('')
  const [month,       setMonth]       = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)  // default to next month
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [tagline,     setTagline]     = useState('')
  const [brief,       setBrief]       = useState('')
  const [keywords,    setKeywords]    = useState('')
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  function slugify(s: string): string {
    return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60)
  }

  async function create(generateBrief: boolean) {
    if (!themeTitle.trim()) { setError('Theme title is required'); return }
    if (!month) { setError('Month is required'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/campaigns', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brand_slug:      brandSlug,
          slug:            slugify(themeTitle),
          theme_title:     themeTitle.trim(),
          month:           `${month}-01`,
          hero_tagline:    tagline.trim() || null,
          brief:           brief.trim() || null,
          target_keywords: keywords.split(',').map(s => s.trim()).filter(Boolean),
          generate_brief:  generateBrief,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'create failed'); return }
      router.push(`/admin/campaigns/${j.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg p-5 max-w-2xl space-y-4">

      <Field label="Brand">
        <select className={inputCls} value={brandSlug} onChange={e => setBrandSlug(e.target.value)}>
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </Field>

      <Field label="Theme title" hint="e.g. Big Birthday Issue, Back to School, Halloween + Fall Fun">
        <input type="text" className={inputCls} value={themeTitle} onChange={e => setThemeTitle(e.target.value)}
          placeholder="Big Birthday Issue" />
      </Field>

      <Field label="Month">
        <input type="month" className={inputCls} value={month} onChange={e => setMonth(e.target.value)} />
      </Field>

      <Field label="Hero tagline (optional)" hint="Shows on the public landing + social cards">
        <input type="text" className={inputCls} value={tagline} onChange={e => setTagline(e.target.value)}
          placeholder="Everything River Region families need to throw the best summer parties." />
      </Field>

      <Field label="Initial brief (optional)" hint="Editor seed Claude will refine — leave blank to let Claude propose from scratch">
        <textarea rows={4} className={`${inputCls} resize-vertical`} value={brief} onChange={e => setBrief(e.target.value)}
          placeholder="What's the angle? Who's the audience? What needs to be covered?" />
      </Field>

      <Field label="Target keywords (comma-separated)">
        <input type="text" className={inputCls} value={keywords} onChange={e => setKeywords(e.target.value)}
          placeholder="kids birthday parties Montgomery, party venues Prattville, birthday cake bakeries River Region" />
      </Field>

      {error && (
        <div className="bg-portal-red-lt text-portal-red border border-portal-red rounded p-2 text-[12px] inline-flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button" onClick={() => create(true)} disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Create + generate brief
        </button>
        <button
          type="button" onClick={() => create(false)} disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg disabled:opacity-50"
        >
          Create without AI
        </button>
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
