'use client'

// Schema-driven onboarding wizard. Loops through a static step list
// for v1 (Basics → Tagline → Hero → Key Facts); the remaining 12
// section-builder steps slot in as we expand. Each step is its own
// component; the shell handles navigation, progress, save state.
//
// Save model: each step component calls the saveBasics / saveListing
// callbacks below on blur/change; those hit the API endpoint. State
// is optimistic — the UI reflects the change immediately, the server
// confirms in the background.

import { useState, useTransition, useCallback } from 'react'
import { Check, Loader2, ArrowLeft, ArrowRight, X, Send, Copy } from 'lucide-react'
import Link from 'next/link'
import { BasicsStep }    from '@/components/onboarding/steps/BasicsStep'
import { TaglineStep }   from '@/components/onboarding/steps/TaglineStep'
import { HeroPhotoStep } from '@/components/onboarding/steps/HeroPhotoStep'
import { KeyFactsStep }  from '@/components/onboarding/steps/KeyFactsStep'
import type { GuideSchema } from '@/lib/guides/schemas'

// Loose shape so the per-step components (each of which declares its
// own narrower Advertiser slice) can take partial updates without
// fighting the wizard's stricter shape. Steps read only the keys they
// care about and tolerate missing data.
type Advertiser = Record<string, unknown> & {
  id:             string
  business_name?:  string | null
  slug?:           string | null
  contact_email?:  string | null
  office_phone?:   string | null
  contact_phone?:  string | null
  website_url?:    string | null
  address?:        string | null
  city_state_zip?: string | null
  neighborhood?:   string | null
  card_hook?:      string | null
  detail_lead?:    string | null
  hero_photo_url?: string | null
}

interface GuideListing {
  id:              string
  guide_type_slug: string
  category:        string | null
  listing_tier:    string | null
  guide_data:      Record<string, unknown> | null
  [key: string]:   unknown
}

interface ListingSection {
  id:           string
  section_type: string
  is_active:    boolean
  [key: string]: unknown
}

// Steps in the v1 shipping set. Add additional step types to this
// array as their components land; the shell auto-displays them.
const STEP_DEFS = [
  { key: 'basics',     label: 'Business basics' },
  { key: 'tagline',    label: 'Tagline & about' },
  { key: 'hero',       label: 'Hero photo' },
  { key: 'key-facts',  label: 'Key facts' },
] as const

type StepKey = typeof STEP_DEFS[number]['key']

export function OnboardingWizard({
  advertiserId, guideSlug, advertiser: initialAdvertiser,
  listing: initialListing, schema, publicToken,
}: {
  advertiserId: string
  guideSlug:    string
  advertiser:   Advertiser
  listing:      GuideListing | null
  sections:     ListingSection[]
  schema:       GuideSchema
  // When set, the wizard is being driven from the public token URL
  // and saves go to the token-verified public endpoint instead of
  // the admin endpoint. Otherwise this is the admin-side view.
  publicToken?: string
}) {
  const [advertiser, setAdvertiser] = useState<Advertiser>(initialAdvertiser)
  const [listing, setListing]       = useState<GuideListing | null>(initialListing)
  const [stepKey, setStepKey]       = useState<StepKey>(STEP_DEFS[0].key)
  const [savedAt, setSavedAt]       = useState<Date | null>(null)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()

  // Save URL depends on whether we're admin-driven or token-driven.
  const saveUrl = publicToken
    ? `/api/public/onboarding/${publicToken}`
    : `/api/admin/advertisers/${advertiserId}/onboarding`

  const stepIdx   = STEP_DEFS.findIndex(s => s.key === stepKey)
  const progress  = Math.round(((stepIdx + 1) / STEP_DEFS.length) * 100)

  // ── Partial save: advertiser_accounts row ─────────────────────
  const saveAdvertiser = useCallback(async (patch: Partial<Advertiser>) => {
    setSaveError(null)
    setAdvertiser(prev => ({ ...prev, ...patch }))
    startTransition(async () => {
      const res = await fetch(saveUrl, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ target: 'advertiser', patch }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setSaveError(j?.error ?? `Save failed (${res.status})`)
        return
      }
      setSavedAt(new Date())
    })
  }, [advertiserId])

  // ── Partial save: guide_listings.guide_data merge ─────────────
  const saveGuideData = useCallback(async (patch: Record<string, unknown>) => {
    setSaveError(null)
    setListing(prev => prev
      ? { ...prev, guide_data: { ...(prev.guide_data ?? {}), ...patch } }
      : prev)
    startTransition(async () => {
      const res = await fetch(saveUrl, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ target: 'guide_data', guide_slug: guideSlug, patch }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setSaveError(j?.error ?? `Save failed (${res.status})`)
        return
      }
      setSavedAt(new Date())
      // Refetch listing id if a new row was created on the server.
      const j = await res.json().catch(() => null)
      if (j?.listing_id && !listing) {
        setListing({ id: j.listing_id, guide_type_slug: guideSlug, category: null, listing_tier: null, guide_data: patch })
      }
    })
  }, [advertiserId, guideSlug, listing])

  function prev() { if (stepIdx > 0) setStepKey(STEP_DEFS[stepIdx - 1].key) }
  function next() { if (stepIdx < STEP_DEFS.length - 1) setStepKey(STEP_DEFS[stepIdx + 1].key) }

  return (
    <div className="space-y-5">

      {/* Hand-off card — admin-only. Generates a magic link for the
          business owner. Hidden when the wizard is itself running
          from the public token URL (the business is already here). */}
      {!publicToken && (
        <SendLinkCard advertiserId={advertiserId} guideSlug={guideSlug} defaultEmail={advertiser.contact_email ?? ''} />
      )}

      {/* Progress strip */}
      <div className="bg-white border border-portal-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-portal-muted">
              Step {stepIdx + 1} of {STEP_DEFS.length}
            </div>
            <div className="text-[14px] font-bold text-portal-text mt-0.5">
              {STEP_DEFS[stepIdx].label}
            </div>
          </div>
          <SaveBadge pending={pending} savedAt={savedAt} error={saveError} />
        </div>
        <div className="h-1.5 bg-portal-bg rounded-full overflow-hidden">
          <div className="h-full bg-portal-blue transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {STEP_DEFS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStepKey(s.key)}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                i === stepIdx
                  ? 'bg-portal-blue text-white'
                  : i < stepIdx
                    ? 'bg-portal-green-lt text-portal-green'
                    : 'bg-portal-bg text-portal-sub border border-portal-border'
              }`}
            >
              {i < stepIdx && <Check size={9} />} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active step body */}
      <div className="bg-white border border-portal-border rounded-lg p-6">
        {stepKey === 'basics'    && <BasicsStep    advertiser={advertiser} onSave={saveAdvertiser} />}
        {stepKey === 'tagline'   && <TaglineStep   advertiser={advertiser} onSave={saveAdvertiser} />}
        {stepKey === 'hero'      && <HeroPhotoStep advertiser={advertiser} onSave={saveAdvertiser} />}
        {stepKey === 'key-facts' && <KeyFactsStep  schema={schema} listing={listing} onSave={saveGuideData} />}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={prev}
          disabled={stepIdx === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-portal-sub bg-white border border-portal-border-2 rounded hover:bg-portal-bg disabled:opacity-40"
        >
          <ArrowLeft size={12} /> Back
        </button>
        {publicToken ? (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-portal-sub">
            <Check size={12} className="text-portal-green" /> Save anytime — bookmark this page
          </span>
        ) : (
          <Link
            href={`/admin/advertisers/${advertiserId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-portal-sub hover:text-portal-text"
          >
            <X size={12} /> Save & exit
          </Link>
        )}
        <button
          type="button"
          onClick={next}
          disabled={stepIdx === STEP_DEFS.length - 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-40"
        >
          Next step <ArrowRight size={12} />
        </button>
      </div>

      {stepIdx === STEP_DEFS.length - 1 && (
        <div className="bg-portal-blue-lt border border-portal-blue/30 rounded-lg p-4 text-[12px] text-portal-text">
          <strong>Wizard v1 ends here.</strong> The remaining steps (Packages, Hours, FAQ, etc.)
          land in the next push. You can verify the live listing above — the changes made in
          these 4 steps render immediately at the live listing URL.
        </div>
      )}
    </div>
  )
}

function SendLinkCard({ advertiserId, guideSlug, defaultEmail }: {
  advertiserId: string; guideSlug: string; defaultEmail: string | null
}) {
  const [email, setEmail]   = useState(defaultEmail ?? '')
  const [busy, setBusy]     = useState(false)
  const [result, setResult] = useState<{ sent: boolean; url: string; recipient: string } | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function send() {
    setBusy(true); setError(null); setResult(null); setCopied(false)
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/onboarding/send-link`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: email || undefined, guide_slug: guideSlug }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? `Failed (${res.status})`); return }
      setResult({ sent: !!j.sent, url: j.wizard_url, recipient: j.recipient })
    } finally { setBusy(false) }
  }

  function copy() {
    if (!result?.url) return
    void navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-gradient-to-r from-portal-blue-lt to-white border border-portal-blue/20 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <div className="text-[12px] font-bold text-portal-text inline-flex items-center gap-1.5">
            <Send size={12} className="text-portal-blue" />
            Hand off to the business
          </div>
          <p className="text-[11px] text-portal-sub mt-0.5 max-w-2xl leading-relaxed">
            Generate a private edit link for the business owner. They can fill out the wizard themselves, save & exit, and come back any time using the same URL.
          </p>
        </div>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-portal-muted mb-1">
            Send to
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="owner@business.com"
            className="w-full px-2.5 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
          />
        </div>
        <button
          type="button"
          onClick={send}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-white bg-portal-blue rounded hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {busy ? 'Sending…' : 'Generate & send'}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-[11px] text-portal-red">{error}</div>
      )}
      {result && (
        <div className="mt-3 p-3 bg-white border border-portal-border rounded space-y-2">
          <div className="text-[11px] font-bold text-portal-text">
            {result.sent ? `✓ Sent to ${result.recipient}` : `⚠ Email send failed — copy the URL manually`}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] text-portal-sub bg-portal-bg px-2 py-1.5 rounded truncate">{result.url}</code>
            <button type="button" onClick={copy}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-portal-blue border border-portal-blue/30 rounded hover:bg-portal-blue-lt">
              <Copy size={10} /> {copied ? 'Copied' : 'Copy URL'}
            </button>
          </div>
          <p className="text-[10px] text-portal-muted">
            Re-issuing rotates the token — any previous link stops working. Safe to re-send if the business reports losing the link.
          </p>
        </div>
      )}
    </div>
  )
}

function SaveBadge({ pending, savedAt, error }: { pending: boolean; savedAt: Date | null; error: string | null }) {
  if (error) return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-red">{error}</span>
  if (pending) return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-sub"><Loader2 size={11} className="animate-spin" /> Saving…</span>
  if (savedAt) {
    const ago = Math.round((Date.now() - savedAt.getTime()) / 1000)
    const label = ago < 5 ? 'Saved just now' : `Saved ${ago}s ago`
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-green"><Check size={11} /> {label}</span>
  }
  return <span className="text-[11px] text-portal-muted">Changes auto-save on blur</span>
}
