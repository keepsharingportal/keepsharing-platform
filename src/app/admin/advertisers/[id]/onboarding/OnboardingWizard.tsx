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
import { BasicsStep }        from '@/components/onboarding/steps/BasicsStep'
import { TaglineStep }       from '@/components/onboarding/steps/TaglineStep'
import { HeroPhotoStep }     from '@/components/onboarding/steps/HeroPhotoStep'
import { KeyFactsStep }      from '@/components/onboarding/steps/KeyFactsStep'
import { GalleryStep }       from '@/components/onboarding/steps/GalleryStep'
import { OurStoryStep }      from '@/components/onboarding/steps/OurStoryStep'
import { WhatsDifferentStep } from '@/components/onboarding/steps/WhatsDifferentStep'
import { WhatsIncludedStep } from '@/components/onboarding/steps/WhatsIncludedStep'
import { ThemesStep }        from '@/components/onboarding/steps/ThemesStep'
import { BestForStep }       from '@/components/onboarding/steps/BestForStep'
import { PackagesStep }      from '@/components/onboarding/steps/PackagesStep'
import { AddOnsStep }        from '@/components/onboarding/steps/AddOnsStep'
import { HoursStep }         from '@/components/onboarding/steps/HoursStep'
import { ParentsSayStep }    from '@/components/onboarding/steps/ParentsSayStep'
import { FAQStep }           from '@/components/onboarding/steps/FAQStep'
import { BookingNotesStep }  from '@/components/onboarding/steps/BookingNotesStep'
import { HealthSafetyStep }  from '@/components/onboarding/steps/HealthSafetyStep'
import { SpecialOfferStep }  from '@/components/onboarding/steps/SpecialOfferStep'
import { WizardPreview }     from '@/components/onboarding/WizardPreview'
import type { SectionRowShape } from '@/components/onboarding/steps/types'
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

// All onboarding steps in render order. `required: true` blocks the
// listing from publishing until that step's content is filled in.
// `section_type` (when set) points the save callback at the matching
// listing_sections row; otherwise the step writes to advertiser_accounts
// or guide_data.
type StepDef = {
  key:           string
  label:         string
  section_type?: string
  required?:     boolean
}

const STEP_DEFS: readonly StepDef[] = [
  { key: 'basics',        label: 'Business basics',          required: true },
  { key: 'tagline',       label: 'Tagline & about',          required: true },
  { key: 'hero',          label: 'Hero photo',               required: true },
  { key: 'gallery',       label: 'Photo gallery' },
  { key: 'key-facts',     label: 'Key facts' },
  { key: 'our-story',     label: 'Our story',                section_type: 'our_story' },
  { key: 'whats-different', label: 'What makes you different', section_type: 'whats_different' },
  { key: 'packages',      label: 'Packages',                 section_type: 'party_packages' },
  { key: 'whats-included', label: "What's included",          section_type: 'features_bullets' },
  { key: 'themes',        label: 'Themes available',         section_type: 'themes_available' },
  { key: 'addons',        label: 'Add-ons',                  section_type: 'party_addons' },
  { key: 'hours',         label: 'Hours',                    section_type: 'party_hours' },
  { key: 'best-for',      label: 'Best for',                 section_type: 'best_for' },
  { key: 'parents-say',   label: 'Parents say',              section_type: 'parents_say' },
  { key: 'faq',           label: 'FAQ',                      section_type: 'faq' },
  { key: 'booking',       label: 'Booking & policies',       section_type: 'booking_notes' },
  { key: 'health-safety', label: 'Health & safety',          section_type: 'health_safety' },
  { key: 'special-offer', label: 'Special offer',            section_type: 'special_offer' },
] as const

type StepKey = typeof STEP_DEFS[number]['key']

// Required-step completion check. Returns the list of unmet
// requirements (empty when ready to publish).
function unmetRequirements(advertiser: Advertiser): Array<{ key: string; label: string; reason: string }> {
  const out: Array<{ key: string; label: string; reason: string }> = []
  if (!(advertiser.business_name ?? '').trim())
    out.push({ key: 'basics',  label: 'Business basics', reason: 'Business name is required' })
  if (!(advertiser.card_hook ?? '').trim() && !(advertiser.detail_lead ?? '').trim())
    out.push({ key: 'tagline', label: 'Tagline & about', reason: 'Add a tagline OR an About paragraph' })
  if (!(advertiser.hero_photo_url ?? '').trim())
    out.push({ key: 'hero',    label: 'Hero photo',      reason: 'Upload a hero photo' })
  return out
}

export function OnboardingWizard({
  advertiserId, guideSlug, advertiser: initialAdvertiser,
  listing: initialListing, sections: initialSections, schema, publicToken,
}: {
  advertiserId: string
  guideSlug:    string
  advertiser:   Advertiser
  listing:      GuideListing | null
  sections:     ListingSection[]
  schema:       GuideSchema
  publicToken?: string
}) {
  const [advertiser, setAdvertiser] = useState<Advertiser>(initialAdvertiser)
  const [listing, setListing]       = useState<GuideListing | null>(initialListing)
  const [sections, setSections]     = useState<ListingSection[]>(initialSections)
  const [stepKey, setStepKey]       = useState<StepKey>(STEP_DEFS[0].key as StepKey)
  const [savedAt, setSavedAt]       = useState<Date | null>(null)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishedAt, setPublishedAt]   = useState<Date | null>(null)

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

  // ── Partial save: listing_sections row ──────────────────────────
  // Each step that owns a section calls saveSection(section_type, patch)
  // on blur. The endpoint upserts by (advertiser, section_type) so
  // there's exactly one row per section per advertiser. We optimistically
  // patch local state so the field reflects immediately.
  const saveSection = useCallback(async (section_type: string, patch: Record<string, unknown>) => {
    setSaveError(null)
    setSections(prev => {
      const idx = prev.findIndex(s => s.section_type === section_type)
      if (idx === -1) {
        return [...prev, { id: 'pending-' + section_type, section_type, is_active: true, ...patch } as ListingSection]
      }
      return prev.map((s, i) => i === idx ? { ...s, ...patch } : s)
    })
    startTransition(async () => {
      const res = await fetch(saveUrl, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ target: 'section', section_type, patch }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setSaveError(j?.error ?? `Save failed (${res.status})`)
        return
      }
      setSavedAt(new Date())
    })
  }, [saveUrl])

  // Lookup helper for the section-typed steps
  function sectionFor(type: string): SectionRowShape | null {
    return (sections.find(s => s.section_type === type) ?? null) as SectionRowShape | null
  }

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

  function prev() { if (stepIdx > 0) setStepKey(STEP_DEFS[stepIdx - 1].key as StepKey) }
  function next() { if (stepIdx < STEP_DEFS.length - 1) setStepKey(STEP_DEFS[stepIdx + 1].key as StepKey) }

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
              onClick={() => setStepKey(s.key as StepKey)}
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

      {/* Active step body + live preview pane */}
      <div className="grid lg:grid-cols-[1fr,360px] gap-5">
      <div className="bg-white border border-portal-border rounded-lg p-6">
        {stepKey === 'basics'        && <BasicsStep        advertiser={advertiser} onSave={saveAdvertiser} />}
        {stepKey === 'tagline'       && <TaglineStep       advertiser={advertiser} onSave={saveAdvertiser} />}
        {stepKey === 'hero'          && <HeroPhotoStep     advertiser={advertiser} onSave={saveAdvertiser} />}
        {stepKey === 'gallery'       && <GalleryStep       advertiser={advertiser} onSave={saveAdvertiser} />}
        {stepKey === 'key-facts'     && <KeyFactsStep      schema={schema} listing={listing} onSave={saveGuideData} />}
        {stepKey === 'our-story'     && <OurStoryStep      section={sectionFor('our_story')}        onSave={p => saveSection('our_story', p as Record<string, unknown>)} />}
        {stepKey === 'whats-different' && <WhatsDifferentStep section={sectionFor('whats_different')} onSave={p => saveSection('whats_different', p as Record<string, unknown>)} />}
        {stepKey === 'packages'      && <PackagesStep      section={sectionFor('party_packages')}   onSave={p => saveSection('party_packages', p as Record<string, unknown>)} />}
        {stepKey === 'whats-included' && <WhatsIncludedStep section={sectionFor('features_bullets')} onSave={p => saveSection('features_bullets', p as Record<string, unknown>)} />}
        {stepKey === 'themes'        && <ThemesStep        section={sectionFor('themes_available')} onSave={p => saveSection('themes_available', p as Record<string, unknown>)} />}
        {stepKey === 'addons'        && <AddOnsStep        section={sectionFor('party_addons')}     onSave={p => saveSection('party_addons', p as Record<string, unknown>)} />}
        {stepKey === 'hours'         && <HoursStep         section={sectionFor('party_hours')}      onSave={p => saveSection('party_hours', p as Record<string, unknown>)} />}
        {stepKey === 'best-for'      && <BestForStep       section={sectionFor('best_for')}         onSave={p => saveSection('best_for', p as Record<string, unknown>)} />}
        {stepKey === 'parents-say'   && <ParentsSayStep    section={sectionFor('parents_say')}      onSave={p => saveSection('parents_say', p as Record<string, unknown>)} />}
        {stepKey === 'faq'           && <FAQStep           section={sectionFor('faq')}              onSave={p => saveSection('faq', p as Record<string, unknown>)} />}
        {stepKey === 'booking'       && <BookingNotesStep  section={sectionFor('booking_notes')}    onSave={p => saveSection('booking_notes', p as Record<string, unknown>)} />}
        {stepKey === 'health-safety' && <HealthSafetyStep  section={sectionFor('health_safety')}    onSave={p => saveSection('health_safety', p as Record<string, unknown>)} />}
        {stepKey === 'special-offer' && <SpecialOfferStep  section={sectionFor('special_offer')}    onSave={p => saveSection('special_offer', p as Record<string, unknown>)} />}
      </div>
        {/* Live preview pane — sticky on desktop, stacks below on mobile */}
        <WizardPreview
          stepKey={stepKey}
          advertiser={advertiser}
          listingData={listing?.guide_data ?? null}
          sections={sections as unknown as Parameters<typeof WizardPreview>[0]['sections']}
          schema={schema}
        />
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

      <PublishPanel
        advertiser={advertiser}
        publicToken={publicToken}
        advertiserId={advertiserId}
        guideSlug={guideSlug}
        publishing={publishing}
        publishError={publishError}
        publishedAt={publishedAt}
        onGoToStep={(k: StepKey) => setStepKey(k)}
        onPublish={async () => {
          setPublishing(true); setPublishError(null)
          try {
            const url = publicToken
              ? `/api/public/onboarding/${publicToken}/submit`
              : `/api/admin/advertisers/${advertiserId}/onboarding/publish`
            const res = await fetch(url, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ guide_slug: guideSlug }),
            })
            const j = await res.json()
            if (!res.ok) { setPublishError(j?.error ?? `Publish failed (${res.status})`); return }
            setPublishedAt(new Date())
          } finally { setPublishing(false) }
        }}
      />
    </div>
  )
}

function PublishPanel({
  advertiser, publicToken, advertiserId, guideSlug, publishing, publishError, publishedAt, onPublish, onGoToStep,
}: {
  advertiser:    Advertiser
  publicToken?:  string
  advertiserId:  string
  guideSlug:     string
  publishing:    boolean
  publishError:  string | null
  publishedAt:   Date | null
  onPublish:     () => void
  onGoToStep:    (k: StepKey) => void
}) {
  const unmet = unmetRequirements(advertiser)
  const ready = unmet.length === 0

  // Headline copy + button label differ between admin path
  // ("Publish my listing") and public token path
  // ("Submit for editor review") since the public flow gets reviewed.
  const buttonLabel = publicToken ? 'Submit for editor review' : 'Publish my listing'
  const successMsg  = publicToken
    ? "Submitted — the River Region Parents team will review and publish it."
    : 'Published. Your live listing is up.'

  if (publishedAt) {
    return (
      <div className="bg-portal-green-lt border border-portal-green/30 rounded-lg p-5 text-[13px] text-portal-text">
        <div className="font-bold mb-1 inline-flex items-center gap-2">
          <Check size={14} className="text-portal-green" /> {successMsg}
        </div>
        <p className="text-[12px] text-portal-sub leading-relaxed">
          Come back any time to update anything — your changes auto-save and reflect on the live listing immediately.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg p-5 border ${ready ? 'bg-portal-blue-lt border-portal-blue/30' : 'bg-amber-50 border-amber-200'}`}>
      <div className="text-[12px] font-bold uppercase tracking-widest mb-2"
        style={{ color: ready ? '#0a73e6' : '#92400e' }}>
        {ready ? 'Ready to go live' : 'Almost there'}
      </div>
      <h3 className="text-[15px] font-bold text-portal-text leading-tight mb-3">
        {ready
          ? (publicToken ? 'Submit your listing for review' : 'Publish this listing')
          : `${unmet.length} required ${unmet.length === 1 ? 'item' : 'items'} left`}
      </h3>

      {!ready && (
        <ul className="space-y-1.5 mb-4">
          {unmet.map(u => (
            <li key={u.key} className="flex items-center gap-2 text-[12px] text-portal-text">
              <span className="h-2 w-2 rounded-full bg-amber-600 shrink-0" />
              <span>
                <strong>{u.label}:</strong> {u.reason}
              </span>
              <button type="button" onClick={() => onGoToStep(u.key as StepKey)}
                className="ml-1 text-[11px] font-bold text-portal-blue hover:underline">
                Go to step →
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onPublish}
          disabled={!ready || publishing}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-40"
        >
          {publishing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {publishing ? 'Working…' : buttonLabel}
        </button>
        {publishError && <span className="text-[11px] text-portal-red">{publishError}</span>}
      </div>

      {!publicToken && (
        <p className="text-[10px] text-portal-muted mt-3 leading-snug">
          Admin shortcut: publishing flips <code>guide_listings.is_published</code> and stamps
          <code> onboarding_status=&apos;submitted&apos;</code>. Safe to re-run.
        </p>
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
