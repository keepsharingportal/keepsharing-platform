'use client'

import { useState, useTransition } from 'react'
import { Save, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import type { Brand } from '@/lib/brands'
import { saveBrandVoiceAction } from './actions'

interface EffectiveColors { primary: string; accent: string }

export function BrandsClient({ brands, effectiveColors }: {
  brands: Brand[]
  /** Server-computed chrome (DB value OR fallback) per brand slug.
   *  Lets the form prefill with what's actually rendering, even when
   *  the DB column is null. */
  effectiveColors: Record<string, EffectiveColors>
}) {
  return (
    <div className="space-y-4">
      {brands.map(b => <BrandCard key={b.slug} brand={b} effective={effectiveColors[b.slug]} />)}
    </div>
  )
}

function BrandCard({ brand, effective }: { brand: Brand; effective: EffectiveColors }) {
  const hasVoice = !!brand.voice
  const [expanded, setExpanded] = useState(!hasVoice)   // expand empty ones by default
  const [audience, setAudience] = useState(brand.voice?.audience_summary ?? '')
  const [voiceRules, setVoiceRules] = useState(brand.voice?.voice_rules ?? '')
  const [avoidList, setAvoidList] = useState(brand.voice?.avoid_list ?? '')
  const [format, setFormat] = useState(brand.voice?.format_default ?? '')
  const [siteUrl, setSiteUrl] = useState(brand.voice?.site_url ?? '')
  const [ghlTag, setGhlTag] = useState(brand.voice?.ghl_tag ?? '')
  // Chrome state (migration 162). Stored as strings; the server-side validator
  // rejects bad hex codes before saving.
  const [tagline,     setTagline]     = useState(brand.voice?.tagline                   ?? '')
  const [logoUrl,     setLogoUrl]     = useState(brand.voice?.logo_url                  ?? '')
  // Prefill from the effective chrome (DB value OR built-in fallback)
  // so an editor sees the color that's actually rendering on the public
  // site, not an empty field that masks the active default.
  const [primary,     setPrimary]     = useState(brand.voice?.primary_color_hex         ?? effective.primary)
  const [accent,      setAccent]      = useState(brand.voice?.accent_color_hex          ?? effective.accent)
  const [contactEmail,setContactEmail]= useState(brand.voice?.contact_email             ?? '')
  const [socialFb,    setSocialFb]    = useState(brand.voice?.social_facebook           ?? '')
  const [socialIg,    setSocialIg]    = useState(brand.voice?.social_instagram          ?? '')
  // Rotation columns: text area input, one slug per line. Editorial enters
  // column slugs like "mom-to-mom" — easier than a multi-select for now,
  // and matches how column_slug is used everywhere else.
  const [rotationRaw, setRotationRaw] = useState((brand.voice?.homepage_rotation_columns ?? []).join('\n'))
  const [ghlList,     setGhlList]     = useState(brand.voice?.ghl_newsletter_list_id ?? '')
  const [ghlTagSub,   setGhlTagSub]   = useState(brand.voice?.ghl_subscriber_tag    ?? '')
  const [ghlWorkflow, setGhlWorkflow] = useState(brand.voice?.ghl_welcome_workflow_id ?? '')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function save() {
    setMsg(null)
    start(async () => {
      const rotationColumns = rotationRaw.split('\n').map(s => s.trim()).filter(Boolean)
      const out = await saveBrandVoiceAction({
        brandSlug:       brand.slug,
        audienceSummary: audience,
        voiceRules,
        avoidList,
        formatDefault:   format,
        siteUrl,
        ghlTag,
        tagline,
        logoUrl,
        primaryColorHex: primary,
        accentColorHex:  accent,
        contactEmail,
        socialFacebook:  socialFb,
        socialInstagram: socialIg,
        homepageRotationColumns: rotationColumns,
        ghlNewsletterListId: ghlList,
        ghlSubscriberTag:    ghlTagSub,
        ghlWelcomeWorkflowId: ghlWorkflow,
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

          {/* ── Brand chrome (migration 162) ── */}
          <div className="border-t border-portal-border pt-3 mt-3 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Site chrome</h4>
            <p className="text-[10px] text-portal-muted -mt-2">
              Drives the brand&apos;s public navigation, footer, metadata, and homepage rotation.
            </p>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Tagline</label>
              <input
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Local family stories, straight to your inbox."
                className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Logo URL</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Reader contact email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="hello@..."
                  className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Primary color</label>
                <ColorInput value={primary} onChange={setPrimary} placeholder="#c4622d" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Accent color</label>
                <ColorInput value={accent}  onChange={setAccent}  placeholder="#1a2744" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Facebook URL</label>
                <input
                  type="url"
                  value={socialFb}
                  onChange={e => setSocialFb(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={socialIg}
                  onChange={e => setSocialIg(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">
                Homepage rotation columns
              </label>
              <p className="text-[10px] text-portal-muted mb-1">
                One column slug per line. These columns rotate in the homepage hero + Community Spotlights sidebar.
                Leave blank to use the RRP defaults (mom-to-mom, teacher-of-month, grands-greatest, play-ball).
              </p>
              <textarea
                rows={4}
                value={rotationRaw}
                onChange={e => setRotationRaw(e.target.value)}
                placeholder="mom-to-mom&#10;teacher-of-month&#10;grands-greatest&#10;play-ball"
                className="w-full text-xs font-mono px-2 py-1.5 border border-portal-border rounded-md bg-white resize-y"
              />
            </div>
          </div>

          {/* ── GHL routing (migration 164) ── */}
          <div className="border-t border-portal-border pt-3 mt-3 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Newsletter routing (GHL)</h4>
            <p className="text-[10px] text-portal-muted -mt-2">
              When a reader on this brand&apos;s site subscribes, they&apos;ll land in the list / get the tag / trigger the workflow you set here.
              Leave fields blank to fall back to the legacy single-brand defaults.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">List ID</label>
                <input
                  value={ghlList}
                  onChange={e => setGhlList(e.target.value)}
                  placeholder="list_xxx"
                  className="w-full text-xs font-mono px-2 py-1.5 border border-portal-border rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Subscriber tag</label>
                <input
                  value={ghlTagSub}
                  onChange={e => setGhlTagSub(e.target.value)}
                  placeholder="rrp-newsletter-subscriber"
                  className="w-full text-xs font-mono px-2 py-1.5 border border-portal-border rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Welcome workflow ID</label>
                <input
                  value={ghlWorkflow}
                  onChange={e => setGhlWorkflow(e.target.value)}
                  placeholder="wf_xxx (optional)"
                  className="w-full text-xs font-mono px-2 py-1.5 border border-portal-border rounded-md bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={save} disabled={pending} className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5">
              <Save size={11} /> {pending ? 'Saving…' : 'Save brand'}
            </button>
            {msg && <span className="text-[11px] text-portal-sub">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// Color input — text field for typing/pasting hex + a clickable swatch
// that opens the native color picker. The two stay in sync. Invalid
// strings (e.g. while the user is mid-edit at "#c46") are left alone in
// the text field but the picker falls back to a neutral grey so we
// don't crash the <input type="color"> which only accepts strict
// 7-char hex.
function ColorInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const validHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#cccccc'
  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-xs font-mono px-2 py-1.5 border border-portal-border rounded-md bg-white"
      />
      {/* Native color picker — click the swatch to open the OS picker.
          Outputs lowercase 7-char hex; we write it back into the text
          field so both stay synced. */}
      <input
        type="color"
        value={validHex}
        onChange={e => onChange(e.target.value)}
        title="Pick a color"
        className="w-9 h-9 rounded border border-portal-border bg-white cursor-pointer"
        style={{ padding: 2 }}
      />
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
