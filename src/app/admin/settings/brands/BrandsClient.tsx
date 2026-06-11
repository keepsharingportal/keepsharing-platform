'use client'

import { useState, useTransition } from 'react'
import { Save, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import type { Brand } from '@/lib/brands'
import { saveBrandVoiceAction } from './actions'

export function BrandsClient({ brands }: { brands: Brand[] }) {
  return (
    <div className="space-y-4">
      {brands.map(b => <BrandCard key={b.slug} brand={b} />)}
    </div>
  )
}

function BrandCard({ brand }: { brand: Brand }) {
  const hasVoice = !!brand.voice
  const [expanded, setExpanded] = useState(!hasVoice)   // expand empty ones by default
  const [audience, setAudience] = useState(brand.voice?.audience_summary ?? '')
  const [voiceRules, setVoiceRules] = useState(brand.voice?.voice_rules ?? '')
  const [avoidList, setAvoidList] = useState(brand.voice?.avoid_list ?? '')
  const [format, setFormat] = useState(brand.voice?.format_default ?? '')
  const [siteUrl, setSiteUrl] = useState(brand.voice?.site_url ?? '')
  const [ghlTag, setGhlTag] = useState(brand.voice?.ghl_tag ?? '')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function save() {
    setMsg(null)
    start(async () => {
      const out = await saveBrandVoiceAction({
        brandSlug:       brand.slug,
        audienceSummary: audience,
        voiceRules,
        avoidList,
        formatDefault:   format,
        siteUrl,
        ghlTag,
      })
      setMsg(out.ok ? 'Saved' : `Error: ${out.error}`)
      setTimeout(() => setMsg(null), 2500)
    })
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-portal-bg transition-colors text-left"
      >
        {expanded ? <ChevronDown size={14} className="text-portal-muted" /> : <ChevronRight size={14} className="text-portal-muted" />}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-portal-text">{brand.displayName}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-muted bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full">
              {brand.slug}
            </span>
            {hasVoice ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles size={9} /> Voice set
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full">
                Needs voice
              </span>
            )}
          </div>
          {brand.market && <p className="text-[11px] text-portal-muted mt-0.5">{brand.market.city}, {brand.market.state}</p>}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 space-y-3 border-t border-portal-border bg-portal-bg/40">
          <Field
            label="Audience"
            hint='Who reads this brand. Be specific — life stage, geography, what they care about.'
            value={audience}
            onChange={setAudience}
            rows={3}
            placeholder="Parents of elementary-to-tween kids in… etc."
          />
          <Field
            label="Voice rules"
            hint="How to write for this brand. Concrete rules > vague adjectives."
            value={voiceRules}
            onChange={setVoiceRules}
            rows={4}
            placeholder='Warm, modern-parenting. Second-person works. Specific places > generic advice. Lead with the moment.'
          />
          <Field
            label="Avoid list"
            hint="Things never to do. Appended verbatim to every AI system prompt for this brand."
            value={avoidList}
            onChange={setAvoidList}
            rows={3}
            placeholder='Frazzled-mom clichés. "Mama" as universal address. Political opinion.'
          />
          <Field
            label="Format defaults"
            hint="Default article shape — length, structure, ending."
            value={format}
            onChange={setFormat}
            rows={2}
            placeholder="500-800 words. Lead with a moment. End with one specific line that lands."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Site URL</label>
              <input
                type="url"
                value={siteUrl}
                onChange={e => setSiteUrl(e.target.value)}
                placeholder="https://riverregionparents.com"
                className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">GHL tag (optional)</label>
              <input
                value={ghlTag}
                onChange={e => setGhlTag(e.target.value)}
                placeholder="rrp-advertiser"
                className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={save} disabled={pending} className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5">
              <Save size={11} /> {pending ? 'Saving…' : 'Save brand voice'}
            </button>
            {msg && <span className="text-[11px] text-portal-sub">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, hint, value, onChange, rows, placeholder }: {
  label: string; hint: string; value: string; onChange: (v: string) => void; rows: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub">{label}</label>
      <p className="text-[10px] text-portal-muted mb-1">{hint}</p>
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-xs px-3 py-2 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue resize-y"
      />
    </div>
  )
}
