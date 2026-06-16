'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Sparkles, Loader2, AlertTriangle, CheckCircle2, ExternalLink, Share2, FileText } from 'lucide-react'
import type { ThemedCampaign, CampaignArticleRole } from '@/lib/campaigns'

interface LinkedArticle {
  article: { id: string; title: string; slug: string; columnSlug: string | null; heroImageUrl: string | null; excerpt: string | null; publishedAt: string | null }
  role: CampaignArticleRole
  displayOrder: number
}

interface Props {
  initial:         ThemedCampaign
  initialArticles: LinkedArticle[]
  publicOrigin:    string
}

export function CampaignDashboardClient({ initial, initialArticles, publicOrigin }: Props) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<ThemedCampaign>(initial)
  const [articles] = useState<LinkedArticle[]>(initialArticles)
  const [brief,       setBrief]       = useState(initial.brief ?? '')
  const [tagline,     setTagline]     = useState(initial.heroTagline ?? '')
  const [coverUrl,    setCoverUrl]    = useState(initial.coverImageUrl ?? '')
  const [keywords,    setKeywords]    = useState(initial.targetKeywords.join(', '))
  const [status,      setStatus]      = useState(initial.status)
  const [landingOn,   setLandingOn]   = useState(initial.publicLandingActive)
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true); setError(null); setSaved(false)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brief:                  brief.trim() || null,
          hero_tagline:           tagline.trim() || null,
          cover_image_url:        coverUrl.trim() || null,
          target_keywords:        keywords.split(',').map(s => s.trim()).filter(Boolean),
          status,
          public_landing_active:  landingOn,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'save failed'); return }
      setSaved(true); setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  async function generateBrief() {
    setAiBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/generate-brief`, {
        method: 'POST',
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'generation failed'); return }
      // Refresh page to load new ai_brief.
      router.refresh()
      setCampaign({ ...campaign, aiBrief: j.aiBrief })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setAiBusy(false) }
  }

  async function enqueueLandingForSocial() {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/enqueue-social`, { method: 'POST' })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'enqueue failed'); return }
      setSaved(true); setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  const ai = campaign.aiBrief

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>

      {/* LEFT: brief + articles */}
      <div className="space-y-4">

        {/* Editor brief */}
        <div className="bg-white border border-portal-border rounded-lg p-4">
          <h2 className="text-[14px] font-bold text-portal-text mb-3">Editorial brief</h2>
          <textarea
            rows={6}
            value={brief}
            onChange={e => setBrief(e.target.value)}
            className={`${inputCls} resize-vertical`}
            placeholder="Editor brief — what's the angle, who's the audience, what wins. Save then click Generate to ask Claude to expand."
          />
          <div className="text-[11px] text-portal-sub mt-1">Editor-written. The AI brief below uses this as a seed.</div>
        </div>

        {/* AI brief output */}
        <div className="bg-white border border-portal-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[14px] font-bold text-portal-text">AI-generated brief</h2>
            <button
              type="button" onClick={generateBrief} disabled={aiBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg disabled:opacity-50"
            >
              {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {ai?.editorial_brief ? 'Regenerate' : 'Generate'}
            </button>
          </div>
          {ai?.editorial_brief ? (
            <div className="space-y-3 text-[12px] leading-relaxed">
              <div className="prose prose-sm max-w-none text-portal-text whitespace-pre-wrap">{ai.editorial_brief}</div>

              {(ai.article_assignments?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-[12px] font-bold text-portal-text uppercase tracking-wider mb-1.5">Article assignments</h3>
                  <ul className="space-y-1.5">
                    {ai.article_assignments!.map((a, i) => (
                      <li key={i} className="bg-portal-bg rounded p-2">
                        <div className="font-bold text-portal-text">{a.title} <span className="text-[10px] text-portal-sub uppercase ml-1">[{a.role ?? 'supporting'}]</span></div>
                        <div className="text-portal-sub mt-0.5">{a.angle}</div>
                        {a.target_keyword && <div className="text-[10px] text-portal-blue mt-0.5">kw: {a.target_keyword}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(ai.sponsor_categories?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-[12px] font-bold text-portal-text uppercase tracking-wider mb-1.5">Sponsor categories to pitch</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {ai.sponsor_categories!.map(s => (
                      <li key={s} className="text-[11px] px-2 py-0.5 bg-portal-amber-lt text-portal-amber rounded">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ai.newsletter_angle && (
                <div>
                  <h3 className="text-[12px] font-bold text-portal-text uppercase tracking-wider mb-1.5">Newsletter angle</h3>
                  <div className="text-portal-text">{ai.newsletter_angle}</div>
                </div>
              )}

              {ai.social_hooks && (
                <div>
                  <h3 className="text-[12px] font-bold text-portal-text uppercase tracking-wider mb-1.5">Social hooks</h3>
                  {(ai.social_hooks.hashtags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {ai.social_hooks.hashtags!.map(h => (
                        <span key={h} className="text-[10px] text-portal-blue">{h}</span>
                      ))}
                    </div>
                  )}
                  {(ai.social_hooks.hooks?.length ?? 0) > 0 && (
                    <ul className="list-disc pl-5">
                      {ai.social_hooks.hooks!.map((h, i) => (
                        <li key={i} className="text-portal-text">{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-portal-sub text-[12px]">
              Click <strong>Generate</strong> and Claude proposes the editorial brief + article assignments + sponsor categories + newsletter angle + social hooks. Reads the brand SEO profile so output is locality-rich.
            </p>
          )}
        </div>

        {/* Linked articles */}
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border">
            <h2 className="text-[14px] font-bold text-portal-text">
              <FileText size={13} className="inline -translate-y-0.5 mr-1" />
              Linked articles ({articles.length})
            </h2>
            <p className="text-[11px] text-portal-sub mt-0.5">These articles are part of the campaign — they appear on the public landing page.</p>
          </div>
          {articles.length === 0 ? (
            <div className="p-4 text-[12px] text-portal-sub">
              No articles linked yet. Add by visiting an article&apos;s edit page and tagging it to this campaign (coming soon — or use the API).
            </div>
          ) : (
            <ul className="divide-y divide-portal-border">
              {articles.map(a => (
                <li key={a.article.id} className="p-3 flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-portal-bg text-portal-sub rounded">{a.role}</span>
                  <div className="flex-1 min-w-0">
                    <a href={`/admin/articles/${a.article.id}/edit`} className="text-[13px] font-bold text-portal-text hover:underline">{a.article.title}</a>
                    {a.article.publishedAt
                      ? <div className="text-[10px] text-portal-green">Published</div>
                      : <div className="text-[10px] text-portal-amber">Draft</div>
                    }
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* RIGHT: sidebar */}
      <div className="space-y-4">
        <div className="bg-white border border-portal-border rounded-lg p-4">
          <div className="text-[13px] font-bold text-portal-text mb-2">Settings</div>

          <Field label="Status">
            <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as ThemedCampaign['status'])}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>

          <Field label="Hero tagline">
            <input type="text" className={inputCls} value={tagline} onChange={e => setTagline(e.target.value)} />
          </Field>

          <Field label="Cover image URL">
            <input type="text" className={inputCls} value={coverUrl} onChange={e => setCoverUrl(e.target.value)} />
          </Field>

          <Field label="Target keywords">
            <input type="text" className={inputCls} value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="comma-separated" />
          </Field>

          <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer mt-2">
            <input type="checkbox" checked={landingOn} onChange={e => setLandingOn(e.target.checked)} />
            <span className="text-portal-text">Public landing page active</span>
          </label>
          {publicOrigin && (
            <div className="text-[10px] text-portal-sub mt-1">
              URL: <code>{publicOrigin}/campaigns/{campaign.slug}</code>
            </div>
          )}

          <button
            type="button" onClick={save} disabled={busy}
            className="mt-3 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <Save size={13} /> {busy ? 'Saving…' : 'Save'}
          </button>

          {error && (
            <div className="mt-2 p-2 bg-portal-red-lt text-portal-red rounded text-[11px]">
              <AlertTriangle size={11} className="inline mr-1" /> {error}
            </div>
          )}
          {saved && (
            <div className="mt-2 p-2 bg-portal-green-lt text-portal-green rounded text-[11px]">
              <CheckCircle2 size={11} className="inline mr-1" /> Saved.
            </div>
          )}
        </div>

        <div className="bg-white border border-portal-border rounded-lg p-4">
          <div className="text-[13px] font-bold text-portal-text mb-2">Social rotation</div>
          <p className="text-[11px] text-portal-sub mb-3 leading-relaxed">
            Enqueue the campaign landing page for social rotation. Uses the &ldquo;campaign&rdquo; schedule
            cadence — caption + image generated by AI per platform.
          </p>
          <button
            type="button" onClick={enqueueLandingForSocial} disabled={busy || !landingOn}
            title={!landingOn ? 'Activate the public landing first' : 'Enqueue for social rotation'}
            className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg disabled:opacity-50"
          >
            <Share2 size={12} /> Enqueue for social
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}
