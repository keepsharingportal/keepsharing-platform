'use client'

import { useState, useCallback, useRef } from 'react'
import { ArrowRight, Check, RefreshCw, ChevronRight, Info } from 'lucide-react'
import { TEMPLATE_REGISTRY } from '@/components/partner-engine/templates'
import { getAllColorSchemes } from '@/lib/color-schemes'

interface Props {
  token: string
  accountId: string
  accountSlug: string
  businessName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  businessUrl: string
  category: string
  initialStatus: string
}

type Section = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

const SECTION_LABELS: Record<Section, string> = {
  1:  'Confirm Basics',
  2:  'Choose Template',
  3:  'Color Scheme',
  4:  'Auto-fill',
  5:  'Your Offer',
  6:  'Your Story',
  7:  'Locations',
  8:  'Your Team',
  9:  'Photos & Proof',
  10: 'Services',
  11: 'FAQs',
  12: 'Brand Colors',
  13: 'Review & Submit',
}

const SECTION_TIMES: Record<Section, string> = {
  1: '3 min', 2: '2 min', 3: '1 min', 4: '1 min', 5: '15 min',
  6: '10 min', 7: '5 min', 8: '10 min', 9: '10 min', 10: '5 min',
  11: '5 min', 12: '3 min', 13: '2 min',
}

const OFFER_TYPE_LABELS: Record<string, string> = {
  schedule_consult: 'Schedule a consultation / appointment',
  discount_code: 'Offer a discount code',
  booking_link: 'Send them to a booking link',
  info_request: 'Have them request information / be contacted',
  limited_promo: 'Limited-time promotion',
}

const OFFER_TEMPLATES: Record<string, string[]> = {
  healthcare: [
    '$0 First Visit Consultation — perfect for new patient acquisition',
    'Free Same-Day Sick Visit (New Patients Only)',
    'Free Dental Exam + X-Ray for New Patients',
    '$50 Off Your First Appointment',
    'Free 15-Minute "Is This Right For Us?" Phone Consult',
  ],
  education: [
    'Free Shadow Day — "Come spend a day as a student"',
    'Application Fee Waived for River Region Parents Families',
    'Free Summer Academic Enrichment Week',
    '"Meet the Teacher" Open House with coffee + Q&A',
    'Scholarship consideration for early applicants',
  ],
  childcare: [
    'First Week Free — new family enrollment',
    'Free Trial Day at Our Learning Center',
    '$100 Registration Fee Waived',
    'Free Summer Preview Camp (3 days)',
    'Free Parent Information Night + Tour',
  ],
  'family-service': [
    'Free Initial Consultation (no obligation)',
    '$50 Off First Service',
    'Free 30-Minute Strategy / Assessment Call',
    'First Month Free with Annual Contract',
    'Free Demo / Sample Session',
  ],
  'family-activities': [
    'First Class Free',
    'Bring a Friend Free — both get the first session free',
    '50% Off First Month',
    'Free Trial Session / Experience',
    'Free Birthday Party Consultation',
  ],
}

const TEMPLATE_ICONS: Record<string, string> = {
  'consult-booking': '📅',
  'giveaway': '🏆',
  'lead-magnet': '📄',
}

function Tip({ children }: { children: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ display: 'inline-flex', position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <Info size={14} color="#4a90d9" />
      </button>
      {open && (
        <span style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, backgroundColor: '#1a2744', color: 'white', fontSize: 12, padding: '8px 12px', borderRadius: 8, width: 220, lineHeight: 1.5, zIndex: 10 }}>
          {children}
        </span>
      )}
    </span>
  )
}

export function OnboardingForm({ token, accountId, accountSlug, businessName, contactName, contactEmail, contactPhone, businessUrl, category, initialStatus }: Props) {
  const [currentSection, setCurrentSection] = useState<Section>(1)
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [submitted, setSubmitted] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scraping, setScraping] = useState(false)
  const [scraped, setScraped] = useState(false)

  // Template selection (Sections 2 + 3)
  const [templateSlug, setTemplateSlug] = useState('consult-booking')
  const [colorScheme, setColorScheme] = useState('sky-terra')

  // Form state
  const [basics, setBasics] = useState({ businessName, contactName, contactEmail, contactPhone, businessUrl })
  const [offerType, setOfferType] = useState('schedule_consult')
  const [offerHeadline, setOfferHeadline] = useState('')
  const [offerSubheadline, setOfferSubheadline] = useState('')
  const [offerValue, setOfferValue] = useState('')
  const [offerUrgency, setOfferUrgency] = useState('')
  const [ctaText, setCtaText] = useState('Reserve My Spot →')
  const [missionStatement, setMissionStatement] = useState('')
  const [valueProps, setValueProps] = useState([
    { title: '', description: '' },
    { title: '', description: '' },
    { title: '', description: '' },
  ])
  const [teamMembers, setTeamMembers] = useState([
    { name: '', title: '', bio: '', quote: '' },
    { name: '', title: '', bio: '', quote: '' },
  ])
  const [notes, setNotes] = useState('')
  const [brandPrimary, setBrandPrimary] = useState('#1a2744')
  const [brandAccent, setBrandAccent] = useState('#c4622d')

  const inp = 'w-full px-3.5 py-3 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a90d9] transition-all bg-white'

  const autosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/onboarding/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token, accountId,
            progress: { basics, templateSlug, colorScheme, offerType, offerHeadline, offerSubheadline, offerValue, offerUrgency, ctaText, missionStatement, valueProps, teamMembers, notes, brandPrimary, brandAccent, currentSection },
          }),
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } catch {
        setSaveStatus('idle')
      }
    }, 1500)
  }, [token, accountId, basics, templateSlug, colorScheme, offerType, offerHeadline, offerSubheadline, offerValue, offerUrgency, ctaText, missionStatement, valueProps, teamMembers, notes, brandPrimary, brandAccent, currentSection])

  async function scrapeWebsite() {
    setScraping(true)
    try {
      const res = await fetch(`/api/onboarding/scrape?url=${encodeURIComponent(basics.businessUrl)}`)
      const data = await res.json()
      if (data.scraped) {
        if (data.phones?.[0] && !basics.contactPhone) setBasics(b => ({ ...b, contactPhone: data.phones[0] }))
        if (data.h1s?.[0] && !offerHeadline) setOfferHeadline(data.h1s[0].slice(0, 80))
        if (data.metaDescription && !offerValue) setOfferValue(data.metaDescription.slice(0, 300))
        setScraped(true)
      }
    } catch { /* non-blocking */ }
    setScraping(false)
  }

  async function submitOnboarding() {
    try {
      await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, accountId,
          data: { basics, templateSlug, colorScheme, offerType, offerHeadline, offerSubheadline, offerValue, offerUrgency, ctaText, missionStatement, valueProps, teamMembers, notes, brandPrimary, brandAccent },
        }),
      })
      setSubmitted(true)
    } catch { setSubmitted(true) }
  }

  if (submitted) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 10 }}>
          Thank you! Your page goes live within 48 hours.
        </h1>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.65 }}>
          Jason will review your information, make any final edits, and send you the live URL. If he has questions, you&apos;ll hear from him first.
        </p>
      </div>
    </div>
  )

  const sections = Object.keys(SECTION_LABELS) as unknown as Section[]
  const colorSchemes = getAllColorSchemes()

  // Template-specific offer guidance
  const offerGuidance = templateSlug === 'giveaway'
    ? { headline: 'What\'s the prize headline?', sub: 'e.g. "Win a $500 Family Fun Package"', val: 'Describe the prize in detail — what they win, how to enter, and who\'s eligible.', urgency: 'When is the drawing date?', cta: 'e.g. "Enter to Win →"' }
    : templateSlug === 'lead-magnet'
    ? { headline: 'What\'s the free resource called?', sub: 'e.g. "The 2026 Montgomery Family Activity Calendar"', val: 'Describe what\'s inside and why it\'s valuable. Bullet points work great here.', urgency: 'Any deadline or limited availability?', cta: 'e.g. "Send Me the Free Guide →"' }
    : { headline: 'Offer headline — your big promise', sub: 'e.g. "Reserve Your Child\'s Spot This Month"', val: 'What exactly does the offer include? Step by step.', urgency: 'Urgency (optional but important)', cta: 'What should the button say?' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a2744', padding: '16px 20px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 3px' }}>KeepSharing Partner Engine</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>Setting up your page — {businessName}</p>
          </div>
          <div style={{ fontSize: 12, color: saveStatus === 'saved' ? '#5a8a6a' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {saveStatus === 'saving' ? <><RefreshCw size={12} className="animate-spin" /> Saving…</> : saveStatus === 'saved' ? <><Check size={12} /> Saved</> : 'Auto-saves'}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '12px 20px', overflowX: 'auto' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', gap: 6 }}>
          {sections.map(s => {
            const sNum = Number(s) as Section
            const done = completedSections.has(sNum)
            const active = currentSection === sNum
            return (
              <button key={s} onClick={() => setCurrentSection(sNum)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0, cursor: 'pointer', border: 'none',
                backgroundColor: active ? '#1a2744' : done ? '#edf5f0' : 'rgba(0,0,0,0.05)',
                color: active ? 'white' : done ? '#5a8a6a' : '#888',
              }}>
                {done ? '✓ ' : ''}{sNum}. {SECTION_LABELS[sNum].split(' ')[0]}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Section 1: Confirm Basics */}
        {currentSection === 1 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4622d', marginBottom: 6 }}>Section 1 of 13 · {SECTION_TIMES[1]}</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>Let&apos;s confirm your basics</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>These were filled in from your initial conversation with Jason. Update anything that&apos;s changed.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Business name</label>
                <input className={inp} value={basics.businessName} onChange={e => { setBasics(b => ({...b, businessName: e.target.value})); autosave() }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Your name</label>
                  <input className={inp} value={basics.contactName} onChange={e => { setBasics(b => ({...b, contactName: e.target.value})); autosave() }} />
                </div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Your phone</label>
                  <input type="tel" className={inp} value={basics.contactPhone} onChange={e => { setBasics(b => ({...b, contactPhone: e.target.value})); autosave() }} />
                </div>
              </div>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Your email</label>
                <input type="email" className={inp} value={basics.contactEmail} onChange={e => { setBasics(b => ({...b, contactEmail: e.target.value})); autosave() }} />
              </div>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Your website URL</label>
                <input className={inp} placeholder="https://yourwebsite.com" value={basics.businessUrl} onChange={e => { setBasics(b => ({...b, businessUrl: e.target.value})); autosave() }} />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Choose Template */}
        {currentSection === 2 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4622d', marginBottom: 6 }}>Section 2 of 13 · {SECTION_TIMES[2]}</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>What kind of page are we building?</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>Pick the page type that matches your goal. This controls the layout, sections, and the questions you&apos;ll answer. You can always change this later.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(TEMPLATE_REGISTRY).map(([slug, def]) => {
                const selected = templateSlug === slug
                return (
                  <button key={slug} type="button" onClick={() => { setTemplateSlug(slug); autosave() }} style={{
                    textAlign: 'left', padding: '20px 20px', borderRadius: 16, cursor: 'pointer',
                    border: selected ? '2px solid #1a2744' : '1.5px solid rgba(0,0,0,0.1)',
                    backgroundColor: selected ? '#e8f0fc' : 'white',
                    boxShadow: selected ? '0 0 0 4px rgba(26,39,68,0.08)' : '0 1px 6px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{TEMPLATE_ICONS[slug]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', margin: 0 }}>{def.name}</p>
                          {selected && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 10, backgroundColor: '#1a2744', color: 'white' }}>SELECTED</span>}
                        </div>
                        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5, margin: '0 0 8px' }}>{def.description}</p>
                        <p style={{ fontSize: 11, color: '#888' }}>Best for: {def.best_for.join(' · ')}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 3: Color Scheme */}
        {currentSection === 3 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4622d', marginBottom: 6 }}>Section 3 of 13 · {SECTION_TIMES[3]}</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>Pick your color scheme</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>Each scheme is professionally designed to feel right for a specific type of business. Pick the one that fits your brand best — buttons, accents, and backgrounds will all use it.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {colorSchemes.map(scheme => {
                const selected = colorScheme === scheme.slug
                return (
                  <button key={scheme.slug} type="button" onClick={() => { setColorScheme(scheme.slug); autosave() }} style={{
                    textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                    border: selected ? `2px solid ${scheme.primary}` : '1.5px solid rgba(0,0,0,0.1)',
                    backgroundColor: selected ? `${scheme.primaryLight}` : 'white',
                    boxShadow: selected ? `0 0 0 3px ${scheme.primaryLight}` : '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                    {/* Swatch strip */}
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      <div style={{ width: 28, height: 52, borderRadius: 6, backgroundColor: scheme.primary }} />
                      <div style={{ width: 20, height: 52, borderRadius: 6, backgroundColor: scheme.secondary }} />
                      <div style={{ width: 16, height: 52, borderRadius: 6, backgroundColor: scheme.background, border: '1px solid rgba(0,0,0,0.08)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', margin: 0 }}>{scheme.name}</p>
                        {selected && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, backgroundColor: scheme.primary, color: scheme.primaryForeground }}>SELECTED</span>}
                      </div>
                      <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>{scheme.description}</p>
                      <p style={{ fontSize: 11, color: '#999' }}>Best for: {scheme.best_for}</p>
                    </div>
                    {/* Mini button preview */}
                    <div style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 8, backgroundColor: scheme.secondary, color: scheme.secondaryForeground, fontSize: 11, fontWeight: 700 }}>
                      CTA
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 4: Auto-prefill */}
        {currentSection === 4 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4622d', marginBottom: 6 }}>Section 4 of 13 · {SECTION_TIMES[4]}</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>Let&apos;s pull what we can from your website</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>We can auto-fill several sections from your existing website. This saves time and makes sure we capture your voice.</p>
            </div>
            {basics.businessUrl ? (
              <div>
                <button onClick={scrapeWebsite} disabled={scraping || scraped} style={{
                  padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                  backgroundColor: scraped ? '#edf5f0' : '#1a2744', color: scraped ? '#5a8a6a' : 'white',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {scraping ? <><RefreshCw size={15} className="animate-spin" /> Pulling info…</> : scraped ? <><Check size={15} /> Done! Info pulled from your website</> : <>✨ Pull info from {basics.businessUrl}</>}
                </button>
                {scraped && <p style={{ fontSize: 13, color: '#5a8a6a', marginTop: 12 }}>✓ We found and pre-filled some fields for you. Review everything in the next sections and edit as needed.</p>}
              </div>
            ) : (
              <div style={{ padding: '20px 24px', borderRadius: 12, backgroundColor: '#fdf6e3', border: '1px solid rgba(212,168,67,0.3)' }}>
                <p style={{ fontSize: 13, color: '#666' }}>No website URL was provided. Go back to Section 1 to add your website, or continue manually.</p>
              </div>
            )}
          </div>
        )}

        {/* Section 5: The Offer (template-aware) */}
        {currentSection === 5 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4622d', marginBottom: 6 }}>Section 5 of 13 · {SECTION_TIMES[5]} — The most important section</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>
                {templateSlug === 'giveaway' ? 'Your giveaway details' : templateSlug === 'lead-magnet' ? 'Your free resource' : "What's your offer?"}
              </h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
                {templateSlug === 'giveaway'
                  ? 'Your page is built around ONE giveaway. Make it feel exciting and worth entering.'
                  : templateSlug === 'lead-magnet'
                  ? "Your page is built around ONE free resource that's worth giving an email address for."
                  : "Your whole page is built around ONE specific thing you want a parent to do after reading it."}
              </p>
              {/* Template badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 12px', borderRadius: 20, backgroundColor: '#e8f0fc', border: '1px solid rgba(26,39,68,0.15)', fontSize: 11, fontWeight: 700, color: '#1a2744' }}>
                {TEMPLATE_ICONS[templateSlug]} {TEMPLATE_REGISTRY[templateSlug]?.name ?? templateSlug}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {templateSlug === 'consult-booking' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>What action do you want a parent to take? <Tip>Pick one. The clearest pages have the single clearest action.</Tip></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(OFFER_TYPE_LABELS).map(([k, v]) => (
                      <label key={k} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${offerType === k ? '#1a2744' : 'rgba(0,0,0,0.1)'}`, backgroundColor: offerType === k ? '#e8f0fc' : 'white', alignItems: 'center' }}>
                        <input type="radio" name="offerType" value={k} checked={offerType === k} onChange={() => { setOfferType(k); autosave() }} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 14, color: '#333' }}>{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ backgroundColor: '#fdf6e3', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(212,168,67,0.25)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#8b6a1a', marginBottom: 8 }}>💡 Proven offer templates for {category}:</p>
                {(OFFER_TEMPLATES[category] ?? OFFER_TEMPLATES['family-service']).map((t, i) => (
                  <button key={i} type="button" onClick={() => { setOfferHeadline(t); autosave() }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 7, fontSize: 13, color: '#555', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 2 }}>
                    → {t}
                  </button>
                ))}
              </div>

              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{offerGuidance.headline} <Tip>Short, specific, and valuable. Count the words — shorter usually wins.</Tip></label>
                <input className={inp} placeholder={offerGuidance.sub} value={offerHeadline} onChange={e => { setOfferHeadline(e.target.value); autosave() }} />
              </div>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Subheadline <Tip>Tells them the action. Present tense, specific, action-oriented.</Tip></label>
                <input className={inp} placeholder={offerGuidance.sub} value={offerSubheadline} onChange={e => { setOfferSubheadline(e.target.value); autosave() }} />
              </div>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{offerGuidance.val.split(' ').slice(0, 5).join(' ')}… <Tip>Be specific and detailed. Paint a picture of what they get.</Tip></label>
                <textarea rows={4} className={`${inp} resize-none`} placeholder={offerGuidance.val} value={offerValue} onChange={e => { setOfferValue(e.target.value); autosave() }} />
              </div>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>{offerGuidance.urgency} <Tip>Real urgency converts. Don't invent urgency — but if there's real scarcity, use it.</Tip></label>
                <input className={inp} placeholder={templateSlug === 'giveaway' ? 'e.g. "Drawing: June 15, 2026"' : 'e.g. "Limited to first 50 families this month"'} value={offerUrgency} onChange={e => { setOfferUrgency(e.target.value); autosave() }} />
              </div>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>What should the button say?</label>
                <input className={inp} placeholder={offerGuidance.cta} value={ctaText} onChange={e => { setCtaText(e.target.value); autosave() }} />
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Your Story */}
        {currentSection === 6 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4622d', marginBottom: 6 }}>Section 6 of 13 · {SECTION_TIMES[6]}</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>Your story</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>Parents choose businesses they connect with. This is where they connect with you.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>What&apos;s the one sentence that describes what you do for families? <Tip>Your mission, not your tagline. "We make first dental visits something kids look forward to" is a mission.</Tip></label>
                <textarea rows={3} className={`${inp} resize-none`} placeholder='"We make first dental visits something kids actually look forward to."' value={missionStatement} onChange={e => { setMissionStatement(e.target.value); autosave() }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 12 }}>What makes you different from the other options? <Tip>Three things. Each should be specific enough to be unprovable by your competitor.</Tip></label>
                {valueProps.map((vp, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 10 }}>
                    <input className={inp} placeholder={`Point ${i+1} title`} value={vp.title} onChange={e => { const n = [...valueProps]; n[i] = {...n[i], title: e.target.value}; setValueProps(n); autosave() }} />
                    <input className={inp} placeholder="What does this mean for families?" value={vp.description} onChange={e => { const n = [...valueProps]; n[i] = {...n[i], description: e.target.value}; setValueProps(n); autosave() }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sections 7-12: streamlined */}
        {[7, 8, 9, 10, 11, 12].includes(currentSection) && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4622d', marginBottom: 6 }}>Section {currentSection} of 13 · {SECTION_TIMES[currentSection as Section]}</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>{SECTION_LABELS[currentSection as Section]}</h2>
            </div>

            {currentSection === 8 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {teamMembers.map((m, i) => (
                  <div key={i} style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px 18px', border: '1px solid rgba(0,0,0,0.07)' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 12 }}>Team member {i+1}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>Name</label>
                          <input className={inp} value={m.name} onChange={e => { const n=[...teamMembers]; n[i]={...n[i],name:e.target.value}; setTeamMembers(n); autosave() }} placeholder="Dr. First Last" />
                        </div>
                        <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>Title</label>
                          <input className={inp} value={m.title} onChange={e => { const n=[...teamMembers]; n[i]={...n[i],title:e.target.value}; setTeamMembers(n); autosave() }} placeholder="Pediatric Dentist" />
                        </div>
                      </div>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>Bio — 2-3 sentences <Tip>Tell parents who you are. "Dr. Thomas has been making dental visits fun for River Region kids for 12 years" is better than a list of credentials.</Tip></label>
                        <textarea rows={3} className={`${inp} resize-none`} value={m.bio} onChange={e => { const n=[...teamMembers]; n[i]={...n[i],bio:e.target.value}; setTeamMembers(n); autosave() }} />
                      </div>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>One sentence you want parents to remember about you</label>
                        <input className={inp} value={m.quote} onChange={e => { const n=[...teamMembers]; n[i]={...n[i],quote:e.target.value}; setTeamMembers(n); autosave() }} placeholder='"My favorite moments are first visits — when a nervous kid leaves smiling."' />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentSection === 12 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, color: '#666' }}>These hex colors will override the scheme accents for your specific brand. Leave blank to use the scheme colors you selected in Section 3.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Primary color (override)</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={brandPrimary} onChange={e => { setBrandPrimary(e.target.value); autosave() }} style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
                      <input className={inp} style={{ flex: 1 }} value={brandPrimary} onChange={e => { setBrandPrimary(e.target.value); autosave() }} />
                    </div>
                  </div>
                  <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Accent color (CTA buttons)</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={brandAccent} onChange={e => { setBrandAccent(e.target.value); autosave() }} style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
                      <input className={inp} style={{ flex: 1 }} value={brandAccent} onChange={e => { setBrandAccent(e.target.value); autosave() }} />
                    </div>
                  </div>
                </div>
                <div style={{ padding: '14px 18px', borderRadius: 10, backgroundColor: brandPrimary, color: 'white', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Primary color preview</div>
                <div style={{ padding: '14px 18px', borderRadius: 10, backgroundColor: brandAccent, color: 'white', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Accent / CTA color preview</div>
              </div>
            )}

            {![8, 12].includes(currentSection) && (
              <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: 14, color: '#888' }}>
                  {currentSection === 7 && 'Locations pre-filled from your sign-up. Jason will verify addresses — reply to your setup email if anything needs correcting.'}
                  {currentSection === 9 && "Send your photos (JPG or PNG) by replying to your setup email. We'll also pull appropriate professional photos for any categories where you don't have your own."}
                  {currentSection === 10 && 'Services are pre-populated based on your category. Review them in your page preview and reply to Jason with any corrections.'}
                  {currentSection === 11 && 'FAQs are pre-drafted based on your offer and category. We\'ll send them to you for review before publishing.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Section 13: Review & Submit */}
        {currentSection === 13 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4622d', marginBottom: 6 }}>Section 13 of 13 · {SECTION_TIMES[13]}</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>Ready to submit?</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>Jason will review everything, make any final edits, and send you the live URL within 48 hours. Once live, any changes can be made via a quick email or call.</p>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px 20px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: '#1a2744', marginBottom: 14 }}>Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#555' }}>
                <p><strong>Business:</strong> {basics.businessName}</p>
                <p><strong>Template:</strong> {TEMPLATE_ICONS[templateSlug]} {TEMPLATE_REGISTRY[templateSlug]?.name ?? templateSlug}</p>
                <p><strong>Color scheme:</strong> {colorSchemes.find(s => s.slug === colorScheme)?.name ?? colorScheme}</p>
                <p><strong>Offer:</strong> {offerHeadline || '(not set)'}</p>
                {templateSlug === 'consult-booking' && <p><strong>Offer type:</strong> {OFFER_TYPE_LABELS[offerType]}</p>}
                <p><strong>CTA:</strong> {ctaText}</p>
                {offerUrgency && <p><strong>Urgency:</strong> {offerUrgency}</p>}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Anything else Jason should know?</label>
              <textarea rows={4} className={`${inp} resize-none`} value={notes} onChange={e => { setNotes(e.target.value); autosave() }} placeholder="Any context, corrections, or requests for Jason before your page goes live." />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <button
            onClick={() => currentSection > 1 && setCurrentSection((currentSection - 1) as Section)}
            disabled={currentSection === 1}
            style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'white', color: '#666', cursor: currentSection > 1 ? 'pointer' : 'not-allowed', opacity: currentSection === 1 ? 0.4 : 1 }}>
            ← Back
          </button>

          {currentSection < 13 ? (
            <button onClick={() => {
              setCompletedSections(s => new Set([...s, currentSection]))
              setCurrentSection((currentSection + 1) as Section)
              autosave()
            }} style={{ padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, backgroundColor: '#1a2744', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={submitOnboarding} style={{ padding: '12px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, backgroundColor: '#c4622d', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              Submit for Review <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
