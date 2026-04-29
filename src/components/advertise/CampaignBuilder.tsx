'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Brand colours ──────────────────────────────────────────────────────────────
const TERRA    = '#7d4535'
const TERRA_DK = '#5f3227'
const CREAM    = '#faf7f2'
const CREAM_2  = '#f5ede4'

// ── Rate card (exact values from spec) ────────────────────────────────────────
type SizeKey = 'full' | 'half' | 'quarter' | 'sixth'

const RATES: Record<SizeKey, Record<number, number>> = {
  full:    { 1: 937, 3: 863, 6: 797, 12: 747, 18: 697 },
  half:    { 1: 637, 3: 573, 6: 537, 12: 497, 18: 447 },
  quarter: { 1: 453, 3: 407, 6: 377, 12: 337, 18: 297 },
  sixth:   { 1: 327, 3: 297, 6: 263, 12: 223, 18: 197 },
}

const SIZE_META = {
  full: {
    label: 'Full Page',
    reach: 'Reach up to 18,000+ River Region Families each month',
    badge: '',
    included: [
      'Full-Page Magazine Placement (8.375 × 10.875")',
      'Front-of-Issue Priority Positioning',
      'Professional Ad Design Included',
      'Monthly Design Updates Included',
      'Smart QR Code for Immediate Action',
      'Full-Page Web Ad at Top of Articles',
      'Strong Website Visibility',
      'Targeted Social Media Campaigns (Facebook + Instagram)',
      'Zip Code + Interest Targeting',
      'Retargeting Ads',
    ],
    bestFor: 'Businesses that want to dominate visibility and be the first choice when moms are ready to act.',
  },
  half: {
    label: 'Half Page',
    reach: 'Reach up to 18,000+ River Region Families each month',
    badge: '',
    included: [
      'Half-Page Magazine Placement',
      'Professional Ad Design Included',
      'Monthly Design Updates Included',
      'Half-Page Web Ad on Articles',
      'Strong Website Visibility',
      'Targeted Social Media Campaigns',
      'Zip Code + Interest Targeting',
    ],
    bestFor: 'Businesses that want strong visibility with a more flexible budget.',
  },
  quarter: {
    label: 'Quarter Page',
    reach: 'Reach up to 18,000+ River Region Families each month',
    badge: '',
    included: [
      'Quarter-Page Magazine Placement',
      'Professional Ad Design Included',
      'Monthly Design Updates Included',
      'Web Ad on Articles',
      'Targeted Social Media Campaigns',
      'Zip Code Targeting',
    ],
    bestFor: 'Businesses getting started with local advertising or running seasonal campaigns.',
  },
  sixth: {
    label: 'Sixth Page',
    reach: 'Reach up to 18,000+ River Region Families each month',
    badge: '',
    included: [
      'Sixth-Page Magazine Placement',
      'Professional Ad Design Included',
      'Monthly Design Updates Included',
      'Web Ad Included',
      'Basic Social Media Exposure',
    ],
    bestFor: 'Businesses looking for consistent, affordable community presence.',
  },
}

const COMMITMENTS = [
  { months: 1,  label: '1 Month',   badge: '' },
  { months: 3,  label: '3 Months',  badge: '' },
  { months: 6,  label: '6 Months',  badge: '' },
  { months: 12, label: '12 Months', badge: 'Best Value' },
  { months: 18, label: '18 Months', badge: '' },
]

const GOAL_OPTIONS = [
  { id: 'brand-awareness', label: 'Brand Awareness' },
  { id: 'web-traffic',     label: 'More Website Traffic' },
  { id: 'calls',           label: 'More Calls / Inquiries' },
  { id: 'event',           label: 'Promote an Event' },
  { id: 'consistency',     label: 'Reach Moms Consistently' },
  { id: 'not-sure',        label: 'Not Sure Yet' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <Check size={14} className="shrink-0 mt-0.5" style={{ color: TERRA }} strokeWidth={2.5} />
      {children}
    </li>
  )
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('en-US')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

type CampaignForm = {
  firstName: string; lastName: string; businessName: string
  email: string; phone: string; goals: string[]; campaignNotes: string
}

const EMPTY_CAMPAIGN: CampaignForm = {
  firstName: '', lastName: '', businessName: '',
  email: '', phone: '', goals: [], campaignNotes: '',
}

export function CampaignBuilder() {
  const searchParams = useSearchParams()

  const [selectedSize,    setSelectedSize]    = useState<SizeKey>('full')
  const [selectedMonths,  setSelectedMonths]  = useState(12)
  const [form,            setForm]            = useState<CampaignForm>(EMPTY_CAMPAIGN)
  const [submitting,      setSubmitting]      = useState(false)
  const [submitError,     setSubmitError]     = useState<string | null>(null)
  const [whyOpen,         setWhyOpen]         = useState(false)

  // Pre-fill from Page 1 query params
  useEffect(() => {
    const fname = searchParams.get('fname')
    const biz   = searchParams.get('biz')
    const email = searchParams.get('email')
    if (fname || biz || email) {
      setForm(f => ({
        ...f,
        firstName:    fname ?? f.firstName,
        businessName: biz   ?? f.businessName,
        email:        email ?? f.email,
      }))
    }
  }, [searchParams])

  const leadId       = searchParams.get('lead') ?? undefined
  const monthlyRate  = RATES[selectedSize][selectedMonths]
  const totalAmount  = monthlyRate * selectedMonths
  const sizeMeta     = SIZE_META[selectedSize]

  const toggleGoal = (id: string) =>
    setForm(f => ({
      ...f,
      goals: f.goals.includes(id) ? f.goals.filter(g => g !== id) : [...f.goals, id],
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/advertise/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adSize:           selectedSize,
          commitmentMonths: selectedMonths,
          monthlyRate,
          totalAmount,
          firstName:        form.firstName,
          lastName:         form.lastName || undefined,
          businessName:     form.businessName,
          email:            form.email,
          phone:            form.phone,
          goals:            form.goals,
          campaignNotes:    form.campaignNotes || undefined,
          leadId,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setSubmitError(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-[#ddd4c8] rounded-lg outline-none focus:border-[#7d4535] focus:ring-2 focus:ring-[#7d453520] transition-all placeholder:text-gray-400'

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: CREAM }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#ede6de] shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <div>
            <div className="text-base font-black text-gray-900 tracking-tight leading-none">River Region</div>
            <div className="text-xs font-bold tracking-widest uppercase leading-none" style={{ color: TERRA }}>Parents</div>
            <div className="text-[9px] text-gray-400 leading-none mt-0.5">The River Region&apos;s Go-To Resource For Families!</div>
          </div>
          <Link href="/advertise" className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
            ← Back to main page
          </Link>
        </div>
      </header>

      {/* ── Hero image ────────────────────────────────────────────────── */}
      <div className="w-full" style={{ background: `linear-gradient(160deg, #d4b8a2 0%, #b8906a 50%, #9a7258 100%)`, height: 220 }}>
        <div className="max-w-4xl mx-auto h-full flex items-end px-5 pb-4">
          <div className="text-xs italic" style={{ color: '#8a6040' }}>River Region families</div>
        </div>
      </div>

      {/* ── Headline + value statement ────────────────────────────────── */}
      <section className="py-10 px-5 text-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-2">
            Build Your Campaign to Reach Local Families
          </h1>
          <p className="text-base font-bold mb-2" style={{ color: TERRA }}>You&apos;re Closer Than You Think</p>
          <p className="text-sm text-gray-500 mb-1">You&apos;ve already taken the first step.</p>
          <p className="text-sm text-gray-500 mb-3 leading-relaxed">
            Now it&apos;s just about choosing the level of visibility that fits your business—and we&apos;ll help you handle the rest.
          </p>
          <p className="text-xs text-gray-400 italic">
            Most businesses see the best results when they stay visible month after month.
          </p>
        </div>
      </section>

      {/* ── Main builder grid ─────────────────────────────────────────── */}
      <section className="px-5 pb-12" style={{ backgroundColor: CREAM }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6 items-start">

          {/* ── Left column ──────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* What you're getting */}
            <div className="bg-white rounded-2xl border border-[#ede6de] p-5">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">What You&apos;re Getting</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Print + Digital + Social Exposure',
                  'Professional Design Done for You',
                  'Monthly Updates at No Extra Cost',
                  'A System Designed to Bring You Customers',
                ].map(item => <CheckItem key={item}>{item}</CheckItem>)}
              </div>
              <p className="text-[11px] text-gray-400 mt-3 italic">
                All plans include professional design—and you can update your ad every month at no extra cost.
              </p>
            </div>

            {/* Ad size selector */}
            <div className="bg-white rounded-2xl border border-[#ede6de] p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-1">CHOOSE YOUR VISIBILITY LEVEL</h3>
              <p className="text-xs text-gray-400 mb-4">Details for each plan listed below.</p>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(SIZE_META) as SizeKey[]).map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all',
                      selectedSize === size
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-700 border-[#ddd4c8] hover:border-[#7d4535]/50'
                    )}
                    style={selectedSize === size ? { backgroundColor: TERRA, borderColor: TERRA } : {}}
                  >
                    {SIZE_META[size].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Commitment selector */}
            <div className="bg-white rounded-2xl border border-[#ede6de] p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-1">HOW LONG DO YOU WANT TO STAY VISIBLE?</h3>
              <p className="text-xs text-gray-400 mb-4">
                Consistency builds trust. Most businesses see the best results with 6–18 month campaigns.<br />
                Longer campaigns give your message time to build trust and deliver stronger results.
              </p>
              <div className="flex gap-2 flex-wrap">
                {COMMITMENTS.map(c => (
                  <button
                    key={c.months}
                    onClick={() => setSelectedMonths(c.months)}
                    className={cn(
                      'relative px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all',
                      selectedMonths === c.months
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-700 border-[#ddd4c8] hover:border-[#7d4535]/50'
                    )}
                    style={selectedMonths === c.months ? { backgroundColor: TERRA, borderColor: TERRA } : {}}
                  >
                    {c.label}
                    {c.badge && (
                      <span className="absolute -top-2.5 -right-2 px-1.5 py-0.5 text-[9px] font-bold text-white rounded-full leading-none" style={{ backgroundColor: '#4a7c59' }}>
                        {c.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected size description */}
            <div className="rounded-2xl border border-[#ede6de] p-5" style={{ backgroundColor: CREAM_2 }}>
              <h3 className="text-base font-black text-gray-900 uppercase mb-1" style={{ letterSpacing: '0.05em' }}>
                {sizeMeta.label.toUpperCase()}
              </h3>
              <p className="text-xs font-semibold mb-3" style={{ color: TERRA }}>
                Maximum Visibility. Maximum Trust. Maximum Results.
              </p>
              <p className="text-xs text-gray-500 mb-4">{sizeMeta.reach}</p>

              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">What&apos;s Included:</h4>
              <ul className="space-y-1.5 mb-4">
                {sizeMeta.included.map(item => <CheckItem key={item}>{item}</CheckItem>)}
              </ul>

              <div className="pt-3 border-t border-[#e0d4c8]">
                <span className="text-xs font-bold text-gray-600">Best For: </span>
                <span className="text-xs text-gray-600">{sizeMeta.bestFor}</span>
              </div>
            </div>

            {/* Why multi-month — collapsible */}
            <div className="bg-white rounded-2xl border border-[#ede6de] overflow-hidden">
              <button
                onClick={() => setWhyOpen(o => !o)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-[#fdf9f5] transition-colors"
              >
                <h3 className="text-sm font-bold text-gray-900">
                  Why Do Businesses Choose Multi-Month, Multi-Touch Campaigns?
                </h3>
                {whyOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
              </button>
              {whyOpen && (
                <div className="px-5 pb-5 border-t border-[#ede6de]">
                  <div className="pt-4 space-y-3 text-sm text-gray-600 leading-relaxed">
                    <p>People rarely choose a business the first time they see it.</p>
                    <p>It&apos;s more like meeting someone new. At first, it&apos;s unfamiliar.</p>
                    <p>But as they see you again… and again… As they recognize your name, your message, your presence…</p>
                    <p className="font-semibold text-gray-800">Trust starts to build.</p>
                    <p>And when the moment comes to make a decision, they choose the business they already feel comfortable with.</p>
                    <p className="font-bold" style={{ color: TERRA }}>That&apos;s why this works:</p>
                    <ul className="space-y-1.5">
                      {[
                        'Repeated visibility builds familiarity',
                        'Familiarity builds trust',
                        'Trust leads to action',
                      ].map(item => <CheckItem key={item}>{item}</CheckItem>)}
                    </ul>
                    <p className="text-center font-bold text-gray-800 italic pt-2">
                      This isn&apos;t about one ad—it&apos;s about becoming the business they already believe in.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ready steps */}
            <div className="bg-white rounded-2xl border border-[#ede6de] p-5">
              <h3 className="text-base font-black text-gray-900 text-center mb-1">Ready to Get Started?</h3>
              <p className="text-xs text-gray-400 text-center mb-4">Here&apos;s what happens next—simple and guided.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { n: '1', text: 'Choose your preferred ad size and commitment above' },
                  { n: '2', text: 'Submit your campaign request below' },
                  { n: '3', text: 'Our team will contact you to confirm details and begin your campaign' },
                  { n: '4', text: 'We help you create the right message and get everything live' },
                ].map(s => (
                  <div key={s.n} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: TERRA }}>
                      {s.n}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 italic text-center mt-4">
                You don&apos;t have to figure this out—we&apos;ll guide you every step of the way so you can move forward with confidence.
              </p>
            </div>

            {/* Campaign form */}
            <div id="campaign-form">
              <div className="text-center mb-5">
                <h2 className="text-xl font-black text-gray-900">Start My Campaign Plan</h2>
                <p className="text-xs text-gray-500 mt-1">Tell us what you&apos;re leaning toward and we&apos;ll help you finalize the best plan for your business.</p>
              </div>

              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#ede6de] shadow-sm p-6 space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      className={inputCls} placeholder="First" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                    <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      className={inputCls} placeholder="Last" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Business / Organization Name <span className="text-red-500">*</span></label>
                    <input required value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                      className={inputCls} placeholder="Your business name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className={inputCls} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone <span className="text-red-500">*</span></label>
                    <input required type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className={inputCls} placeholder="(334) 555-0100" />
                  </div>
                </div>

                {/* Show selected plan */}
                <div className="rounded-xl p-3 border border-[#ddd4c8] text-xs text-gray-600 flex items-center justify-between" style={{ backgroundColor: CREAM }}>
                  <div>
                    <span className="font-semibold text-gray-900">{sizeMeta.label}</span>
                    <span className="text-gray-400"> · </span>
                    <span>{selectedMonths} month{selectedMonths !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="font-bold" style={{ color: TERRA }}>
                    {formatMoney(monthlyRate)}/mo
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">What best describes your goal? <span className="text-gray-400">(Optional)</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_OPTIONS.map(g => (
                      <label key={g.id} className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all',
                        form.goals.includes(g.id)
                          ? 'border-[#7d4535] bg-[#fdf3ef]'
                          : 'border-[#ddd4c8] bg-white hover:border-[#7d4535]/40'
                      )}>
                        <input type="checkbox" className="sr-only" checked={form.goals.includes(g.id)}
                          onChange={() => toggleGoal(g.id)} />
                        <div className={cn(
                          'w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all',
                          form.goals.includes(g.id) ? 'border-[#7d4535] bg-[#7d4535]' : 'border-[#ccc3ba]'
                        )}>
                          {form.goals.includes(g.id) && <Check size={10} className="text-white" strokeWidth={2.5} />}
                        </div>
                        {g.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Questions or Notes <span className="text-gray-400">(Optional)</span></label>
                  <textarea rows={3} value={form.campaignNotes} onChange={e => setForm(f => ({ ...f, campaignNotes: e.target.value }))}
                    className={cn(inputCls, 'resize-none')} placeholder="Any specific questions or details?" />
                </div>

                {submitError && (
                  <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !form.firstName || !form.businessName || !form.email || !form.phone}
                  className="w-full py-3.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: TERRA }}
                >
                  {submitting
                    ? <><RefreshCw size={14} className="animate-spin" /> Setting up payment…</>
                    : `Start My Campaign Setup →`}
                </button>
                <p className="text-[11px] text-gray-400 text-center">No pressure. Just a simple next step.</p>
              </form>
            </div>

            {/* Talk it through */}
            <div className="bg-white rounded-2xl border border-[#ede6de] p-6 text-center">
              <h3 className="text-base font-bold text-gray-900 mb-1">Prefer to Talk It Through First?</h3>
              <p className="text-xs text-gray-500 mb-4">
                If you have questions or want help choosing the right option, you can reach us directly.
              </p>
              <a href="tel:+13343285189" className="block text-lg font-bold mb-3" style={{ color: TERRA }}>
                Call or Text: (334) 328-5189
              </a>
              <a
                href="https://calendly.com/rrparents"
                target="_blank" rel="noopener noreferrer"
                className="inline-block px-5 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all hover:opacity-90"
                style={{ borderColor: TERRA, color: TERRA }}
              >
                Schedule a quick call
              </a>
            </div>
          </div>

          {/* ── Sticky price sidebar ──────────────────────────────────── */}
          <div className="lg:sticky lg:top-20 order-first lg:order-last">
            <div className="rounded-2xl p-5 text-white shadow-lg" style={{ backgroundColor: TERRA }}>
              <div className="text-center mb-4">
                <div className="text-4xl font-black mb-0.5">{formatMoney(monthlyRate)}</div>
                <div className="text-sm opacity-75 font-medium">Estimated Monthly Investment</div>
                <div className="text-xs opacity-55 mt-1">Based on your selection</div>
              </div>

              <div className="border-t border-white/20 pt-4 mb-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-70">Ad Size</span>
                  <span className="font-semibold">{sizeMeta.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Commitment</span>
                  <span className="font-semibold">{selectedMonths} month{selectedMonths !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Monthly rate</span>
                  <span className="font-semibold">{formatMoney(monthlyRate)}</span>
                </div>
                <div className="flex justify-between border-t border-white/20 pt-1.5 mt-1.5">
                  <span className="opacity-70">Total campaign</span>
                  <span className="font-black">{formatMoney(totalAmount)}</span>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-3 text-xs opacity-80 mb-4 leading-relaxed">
                {selectedMonths >= 12
                  ? `Great choice—this is how visibility works. ${sizeMeta.label} gives you the strongest visibility, positioning, and recognition. You'll show up when they're ready to act, and become the one they already know and trust.`
                  : `${sizeMeta.label} keeps your business in front of families every month. The longer you stay visible, the more trust builds—and the more moms choose you.`
                }
              </div>

              {/* Quick rate comparison */}
              <div className="space-y-1 text-xs">
                <div className="text-white/60 uppercase tracking-wider text-[10px] mb-2">{sizeMeta.label} Rate Schedule</div>
                {COMMITMENTS.map(c => (
                  <button
                    key={c.months}
                    onClick={() => setSelectedMonths(c.months)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all',
                      selectedMonths === c.months ? 'bg-white/20 font-bold' : 'opacity-60 hover:opacity-80'
                    )}
                  >
                    <span>{c.label}</span>
                    <span>{formatMoney(RATES[selectedSize][c.months])}/mo</span>
                    {c.badge && <span className="text-[9px] bg-[#4a7c59] px-1.5 py-0.5 rounded text-white ml-1">{c.badge}</span>}
                  </button>
                ))}
              </div>

              <button
                onClick={() => document.getElementById('campaign-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full mt-5 py-3 text-sm font-bold text-center rounded-xl transition-all hover:opacity-90 bg-white"
                style={{ color: TERRA }}
              >
                Start My Campaign Setup →
              </button>

              <p className="text-[10px] text-white/50 text-center mt-2">
                We&apos;ll follow up within 1 business day to help you finalize the best option.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-8 px-5 text-center" style={{ backgroundColor: TERRA_DK }}>
        <div className="text-white text-sm font-black mb-1">River Region Parents</div>
        <div className="text-white/50 text-xs">The River Region&apos;s Go-To Resource For Families!</div>
        <div className="text-white/40 text-xs mt-2">© 2026 River Region Parents. All rights reserved. Reaching 18,000 local families every month.</div>
      </footer>

    </div>
  )
}
