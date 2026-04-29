'use client'

import { useState } from 'react'
import { BoomFormShell, boomInput, boomInput2, boomLabel } from './BoomFormShell'
import { cn } from '@/lib/utils'

type Tier = 'free' | 'featured' | 'premium'

const TIER_INFO: Record<Tier, {
  label: string
  price: string
  amount: number
  features: string[]
  accent: string
  accentBg: string
}> = {
  free: {
    label: 'Online Feature',
    price: 'Free',
    amount: 0,
    features: ['Couple feature on RiverRegionBoom.com', 'Your anniversary milestone celebrated', 'Goes to approval queue'],
    accent: '#6FA8D4',
    accentBg: 'rgba(111,168,212,0.10)',
  },
  featured: {
    label: 'Featured Spotlight',
    price: '$45',
    amount: 45,
    features: ['Everything in Online Feature', 'AI-generated social share post', 'Boosted placement on site', 'Shared to Boom Facebook & Instagram'],
    accent: '#C9A84B',
    accentBg: 'rgba(201,168,75,0.10)',
  },
  premium: {
    label: 'Premium Keepsake',
    price: '$75',
    amount: 75,
    features: ['Everything in Featured Spotlight', 'Print placement flag in Boom magazine', 'Digital keepsake PDF to download & share', 'Priority review'],
    accent: '#D4886F',
    accentBg: 'rgba(212,136,111,0.10)',
  },
}

const NAVY_CARD  = '#162844'
const NAVY_LIGHT = '#1E3558'
const GOLD       = '#C9A84B'
const CREAM      = '#F4EFE4'
const CREAM_DIM  = '#9A9288'

export function AnniversarySpotlightForm() {
  const [tier, setTier]                   = useState<Tier>('free')
  const [person1Name, setPerson1Name]     = useState('')
  const [person2Name, setPerson2Name]     = useState('')
  const [yearsTogther, setYearsTogether]  = useState('')
  const [anniversaryDate, setAnniversaryDate] = useState('')
  const [shortMessage, setShortMessage]   = useState('')
  const [email, setEmail]                 = useState('')
  const [photo, setPhoto]                 = useState<File | null>(null)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')
  const [done, setDone]                   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (tier === 'free') {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formType: 'anniversary-spotlight',
            person1Name, person2Name,
            yearsTogether: yearsTogther,
            anniversaryDate,
            shortMessage, email, tier,
          }),
        })
        if (!res.ok) throw new Error('Submission failed')
        setDone(true)
      } else {
        const res = await fetch('/api/anniversary-spotlight/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier, person1Name, person2Name,
            yearsTogether: yearsTogther,
            anniversaryDate, shortMessage, email,
          }),
        })
        if (!res.ok) throw new Error('Could not create checkout session')
        const { url } = await res.json()
        if (url) window.location.href = url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <BoomFormShell
        title="Anniversary Spotlight"
        subtitle="Celebrate Your Love Story"
        department="Relationships"
      >
        <div className="text-center py-10 space-y-4">
          <div className="text-5xl">💍</div>
          <h2 className="text-2xl font-bold" style={{ color: CREAM }}>
            Congratulations!
          </h2>
          <p style={{ color: CREAM_DIM }}>
            Your anniversary spotlight has been submitted and will be reviewed soon.
            We look forward to celebrating your love story with the River Region.
          </p>
        </div>
      </BoomFormShell>
    )
  }

  return (
    <BoomFormShell
      title="Anniversary Spotlight"
      subtitle="Share Your Love Story with the River Region"
      department="Relationships"
    >
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Tier selection */}
        <div>
          <div className={cn(boomLabel)} style={{ color: CREAM }}>Choose Your Package</div>
          <div className="grid gap-3 mt-2">
            {(Object.entries(TIER_INFO) as [Tier, typeof TIER_INFO[Tier]][]).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTier(key)}
                className="text-left rounded-2xl border-2 p-4 transition-all"
                style={{
                  borderColor: tier === key ? info.accent : NAVY_LIGHT,
                  backgroundColor: tier === key ? info.accentBg : NAVY_CARD,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-base font-bold" style={{ color: CREAM }}>{info.label}</span>
                    {key === 'featured' && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(201,168,75,0.2)', color: GOLD }}>Most Popular</span>
                    )}
                  </div>
                  <span className="text-lg font-bold" style={{ color: info.accent }}>{info.price}</span>
                </div>
                <ul className="space-y-1">
                  {info.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs" style={{ color: CREAM_DIM }}>
                      <span style={{ color: info.accent }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        {/* Couple info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn(boomLabel)} style={{ color: CREAM }}>
                First Person's Name <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                required
                value={person1Name}
                onChange={e => setPerson1Name(e.target.value)}
                placeholder="First & last name"
                className={cn(boomInput, boomInput2)}
              />
            </div>
            <div>
              <label className={cn(boomLabel)} style={{ color: CREAM }}>
                Partner's Name <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                required
                value={person2Name}
                onChange={e => setPerson2Name(e.target.value)}
                placeholder="First & last name"
                className={cn(boomInput, boomInput2)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn(boomLabel)} style={{ color: CREAM }}>
                Years Together <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                required
                type="number"
                min="1"
                max="100"
                value={yearsTogther}
                onChange={e => setYearsTogether(e.target.value)}
                placeholder="e.g. 25"
                className={cn(boomInput, boomInput2)}
              />
            </div>
            <div>
              <label className={cn(boomLabel)} style={{ color: CREAM }}>
                Anniversary Date <span style={{ color: GOLD }}>*</span>
              </label>
              <input
                required
                type="date"
                value={anniversaryDate}
                onChange={e => setAnniversaryDate(e.target.value)}
                className={cn(boomInput, boomInput2)}
              />
            </div>
          </div>

          <div>
            <label className={cn(boomLabel)} style={{ color: CREAM }}>
              A Note from You{' '}
              <span className="text-xs font-normal" style={{ color: CREAM_DIM }}>
                (what you'd like readers to know — up to 200 characters)
              </span>
            </label>
            <textarea
              value={shortMessage}
              onChange={e => setShortMessage(e.target.value.slice(0, 200))}
              rows={3}
              placeholder="Share a brief message celebrating your milestone…"
              className={cn(boomInput, boomInput2, 'resize-none')}
            />
            <div className="text-right text-xs mt-1" style={{ color: CREAM_DIM }}>
              {shortMessage.length}/200
            </div>
          </div>

          <div>
            <label className={cn(boomLabel)} style={{ color: CREAM }}>
              Your Email <span style={{ color: GOLD }}>*</span>
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="We'll send confirmation here"
              className={cn(boomInput, boomInput2)}
            />
          </div>

          {(tier === 'featured' || tier === 'premium') && (
            <div>
              <label className={cn(boomLabel)} style={{ color: CREAM }}>
                Photo{' '}
                <span className="text-xs font-normal" style={{ color: CREAM_DIM }}>
                  (optional — you can email it to us after checkout)
                </span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setPhoto(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
                style={{ color: CREAM_DIM }}
              />
              <p className="text-xs mt-1" style={{ color: CREAM_DIM }}>
                Or email photo to jason@keepsharing.com with subject line &ldquo;Anniversary Photo — {person1Name || 'your names'}&rdquo;
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 text-base font-bold rounded-2xl transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: GOLD, color: '#0B1829' }}
        >
          {submitting
            ? 'Processing…'
            : tier === 'free'
              ? 'Submit Spotlight →'
              : `Proceed to Payment — ${TIER_INFO[tier].price} →`
          }
        </button>

        <p className="text-center text-xs" style={{ color: CREAM_DIM }}>
          {tier === 'free'
            ? 'Free submission goes to our editorial queue. We publish the best stories each month.'
            : 'Secure payment via Stripe. Your love story deserves to be shared.'
          }
        </p>
      </form>
    </BoomFormShell>
  )
}
