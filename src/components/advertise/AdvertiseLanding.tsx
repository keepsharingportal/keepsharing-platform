'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Check, RefreshCw, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Brand colours ──────────────────────────────────────────────────────────────
const TERRA    = '#7d4535'
const TERRA_DK = '#5f3227'
const CREAM    = '#faf7f2'
const CREAM_2  = '#f5ede4'

// ── Lead form ─────────────────────────────────────────────────────────────────

type LeadForm = {
  firstName: string; lastName: string; businessName: string
  email: string; phone: string; businessType: string
  interests: string[]; notes: string
}

const EMPTY_FORM: LeadForm = {
  firstName: '', lastName: '', businessName: '',
  email: '', phone: '', businessType: '',
  interests: [], notes: '',
}

const BUSINESS_TYPES = [
  'Select business type',
  'Medical or Dental Provider', 'Education or Childcare', 'Retail / Boutique',
  'Restaurant or Food', 'Fitness or Wellness', 'Home Services',
  'Church or Ministry', 'Non-Profit or Community Org', 'Event / Entertainment',
  'Professional Services', 'Sports or Recreation', 'Other',
]

const INTEREST_OPTIONS = [
  { id: 'print',       label: 'Print Advertising' },
  { id: 'social',      label: 'Social Media Promotion' },
  { id: 'digital',     label: 'Digital Exposure' },
  { id: 'multi-month', label: 'Multi-Month Campaigns' },
  { id: 'not-sure',    label: 'Not Sure Yet' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-gray-700">
      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: CREAM_2, border: `1.5px solid ${TERRA}` }}>
        <Check size={11} style={{ color: TERRA }} strokeWidth={2.5} />
      </span>
      {children}
    </li>
  )
}

function SectionDivider() {
  return <div className="w-12 h-0.5 mx-auto my-8" style={{ backgroundColor: TERRA }} />
}

function Testimonial({ quote, name, title, initials }: { quote: string; name: string; title: string; initials: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#ede6de] flex flex-col gap-4">
      <div className="text-sm text-gray-500 leading-relaxed italic">&ldquo;{quote}&rdquo;</div>
      <div className="flex items-center gap-3 mt-auto">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: TERRA }}>
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{name}</div>
          <div className="text-xs text-gray-500">{title}</div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdvertiseLanding() {
  const formRef = useRef<HTMLDivElement>(null)
  const [form, setForm]           = useState<LeadForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [leadId, setLeadId]         = useState<string | null>(null)

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const toggleInterest = (id: string) =>
    setForm(f => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter(i => i !== id)
        : [...f.interests, id],
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/advertise/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName:    form.firstName,
          lastName:     form.lastName || undefined,
          businessName: form.businessName,
          email:        form.email,
          phone:        form.phone || undefined,
          businessType: form.businessType !== 'Select business type' ? form.businessType : undefined,
          interests:    form.interests,
          notes:        form.notes || undefined,
        }),
      })
      const data = await res.json()
      setLeadId(data.id ?? null)
      setSubmitted(true)
    } catch {
      setSubmitted(true) // proceed even on network error
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-[#ddd4c8] rounded-lg outline-none focus:border-[#7d4535] focus:ring-2 focus:ring-[#7d453520] transition-all placeholder:text-gray-400'

  // ── After form submission: show "See Your Options →" CTA ──────────────────
  if (submitted) {
    const params = new URLSearchParams()
    if (form.businessName) params.set('biz',   form.businessName)
    if (form.firstName)    params.set('fname', form.firstName)
    if (form.email)        params.set('email', form.email)
    if (leadId)            params.set('lead',  leadId)

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: CREAM }}>
        <div className="bg-white rounded-2xl shadow-md border border-[#ede6de] max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: CREAM_2 }}>
            <Check size={24} style={{ color: TERRA }} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Great — you&apos;re one step closer.</h2>
          <p className="text-sm text-gray-500 mb-6">
            Now let&apos;s build your campaign. Choose your ad size, pick your commitment length, and see exactly what it costs.
          </p>
          <Link
            href={`/advertise/campaign?${params.toString()}`}
            className="block w-full py-3 text-sm font-bold text-white rounded-xl text-center transition-all hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: TERRA }}
          >
            See Advertising Options →
          </Link>
          <button onClick={() => setSubmitted(false)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: CREAM }}>

      {/* ── Sticky header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#ede6de] shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <div>
            <div className="text-base font-black text-gray-900 tracking-tight leading-none">River Region</div>
            <div className="text-xs font-bold tracking-widest uppercase leading-none" style={{ color: TERRA }}>Parents</div>
            <div className="text-[9px] text-gray-400 leading-none mt-0.5">The River Region&apos;s Go-To Resource For Families!</div>
          </div>
          <button
            onClick={scrollToForm}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: TERRA }}
          >
            Get Advertising Info
          </button>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 pt-12 pb-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">
            Get More Local Families Choosing Your Business
          </h1>
          <p className="text-base text-gray-600 mb-2 leading-relaxed">
            River Region Parents helps you stay in front of the moms who make buying decisions—so when they&apos;re ready, they choose you.
          </p>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Stop guessing with your marketing.<br />
            Start showing up in the resources local families already trust.
          </p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: TERRA }}
          >
            Get Advertising Info <ChevronRight size={15} />
          </button>
        </div>
        {/* Warm hero image placeholder */}
        <div className="rounded-2xl overflow-hidden aspect-[4/3] flex items-end justify-start p-5" style={{
          background: `linear-gradient(135deg, ${CREAM_2} 0%, #ddc8b5 40%, #c9a98a 100%)`,
        }}>
          <div className="text-xs text-[#9a7060] italic">River Region family photography</div>
        </div>
      </section>

      {/* ── Pain section ─────────────────────────────────────────────── */}
      <section className="py-14 px-5 text-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">
            If You&apos;re Not Reaching Moms...<br />You&apos;re Losing Business
          </h2>
          <p className="text-base text-gray-500 mb-3 leading-relaxed">
            Right now, moms in the River Region are choosing where to go, who to trust, and where to spend their money.
          </p>
          <p className="text-base text-gray-500 mb-6 leading-relaxed">
            If your business isn&apos;t in front of them at the right time, they&apos;re choosing someone else.
          </p>
          <p className="text-base md:text-lg font-bold text-gray-800 italic leading-relaxed">
            &ldquo;Most businesses don&apos;t struggle because they&apos;re not good.<br className="hidden md:block" /> They struggle because they&apos;re not seen—or not remembered.&rdquo;
          </p>
        </div>
      </section>

      {/* ── Value proposition ────────────────────────────────────────── */}
      <section className="py-14 px-5" style={{ backgroundColor: CREAM }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">
              We Put You Where Decisions Are Made
            </h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              River Region Parents connects your business directly with local moms through a proven, multi-touch advertising system designed to get you seen, build trust, and drive action.
            </p>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              <strong className="text-gray-800">Each month, your ad will be placed inside the magazine, shared on Instagram and Facebook</strong> through a targeted social media ad, plus on our website and sent to our email list.
            </p>
            {/* Feature cards */}
            <div className="space-y-3">
              {[
                { icon: '🗞', title: 'Print That Stays in Homes', body: "Reach families through our trusted publication. We use QR codes and built-in services to instantly connect moms to your business. Plus, our monthly guides keep parents returning, giving your ad repeated exposure alongside our most trusted content." },
                { icon: '📱', title: 'Targeted Social Media Campaigns', body: "Each of our multi-touch ad plans includes a targeted social media campaign to keep you visible where moms spend their time and discover local recommendations." },
                { icon: '💻', title: 'Digital & Email Exposure', body: "We feature your business on our website and embed your ad within our weekly emails alongside popular content—keeping eyeballs engaged and on your message longer." },
                { icon: '✏️', title: 'Free Ad Design Included', body: "Don't have an ad ready? Professional, conversion-focused ad design is always included at no extra cost." },
              ].map(f => (
                <div key={f.title} className="bg-white rounded-xl border border-[#ede6de] p-4 flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-gray-900 mb-0.5">{f.title}</div>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right image */}
          <div className="rounded-2xl overflow-hidden aspect-[3/4] flex items-end justify-start p-5" style={{
            background: `linear-gradient(160deg, #d4b8a2 0%, #c09a7e 50%, #a87d63 100%)`,
          }}>
            <div className="text-xs text-[#8a6050] italic">Families in the River Region community</div>
          </div>
        </div>
      </section>

      {/* ── Tagline divider ───────────────────────────────────────────── */}
      <section className="py-10 px-5 text-center" style={{ backgroundColor: '#ffffff' }}>
        <p className="text-xl md:text-2xl font-black text-gray-900">
          Visibility doesn&apos;t grow your business. Being chosen does.
        </p>
      </section>

      {/* ── Partner section ───────────────────────────────────────────── */}
      <section className="py-14 px-5" style={{ backgroundColor: CREAM }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">
              You Don&apos;t Need to Be a Marketing Expert.{' '}
              <span style={{ color: TERRA }}>You Just Need the Right Partner.</span>
            </h2>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              You&apos;re busy running your business, leading your organization, or serving your community.
            </p>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              You don&apos;t have time to figure out what works, create content, design ads, and stay consistent.
            </p>
            <p className="text-sm font-semibold text-gray-700 mb-5 leading-relaxed">
              We handle all of it—from message to design to placement—so your marketing feels simple, effective, and done for you.
            </p>
          </div>
          <div className="space-y-4">
            {/* Feature image */}
            <div className="rounded-2xl overflow-hidden aspect-[4/3] flex items-end justify-start p-4 mb-4" style={{
              background: `linear-gradient(135deg, #c8a888 0%, #b8906a 100%)`,
            }}>
              <div className="text-xs text-[#8a6040] italic">Local business owner</div>
            </div>
            <ul className="space-y-2">
              {[
                "We'll Help You Shape Your Offer",
                "We'll Design Your Ad and Share a Proof",
                "We'll Help You Stay Visible",
                "We'll Help You Move Families to Action",
              ].map(item => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Trust banner ─────────────────────────────────────────────── */}
      <section className="py-16 px-5 text-center text-white" style={{ backgroundColor: TERRA_DK }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black leading-tight mb-4">
            Most Advertising Gets Seen.<br />Ours Gets Remembered.
          </h2>
          <p className="text-sm opacity-80 mb-3 leading-relaxed">Anyone can run ads.</p>
          <p className="text-base mb-3 leading-relaxed">
            But placing your business inside a platform families already trust.
          </p>
          <p className="text-base font-bold mb-5">That&apos;s totally different!</p>
          <p className="text-sm opacity-75 leading-relaxed">
            When moms see your business through the River Region Parents suite of resources, you&apos;re not just another ad—you&apos;re a recommendation.
          </p>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-14 px-5" style={{ backgroundColor: CREAM }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-2">What Local Organizations Love About Working With Us</h2>
          <SectionDivider />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Testimonial
              quote="When it comes to reaching women in the community River Region Parents delivers. The exposure we have received from sponsoring their Mom to Mom interview has been amazing."
              name="Dr. Porcia Bradford Love"
              title="River Region Dermatology & Laser"
              initials="PL"
            />
            <Testimonial
              quote="Baptist Health has been a long advertiser with River Region Parents because it allows us to accomplish our marketing objectives by communicating information about Baptist Health Services, Health Screening and Health Education."
              name="Tommy McKinnon"
              title="Baptist Health"
              initials="TM"
            />
            <Testimonial
              quote="We love having a marketing option that feels both professional and local. It's an easy partnership for busy teams."
              name="Michael Chan"
              title="Pediatric Dentistry"
              initials="MC"
            />
          </div>
        </div>
      </section>

      {/* ── Industries ───────────────────────────────────────────────── */}
      <section className="py-14 px-5 text-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-2">If You Serve Families, This Is Built For You</h2>
          <p className="text-sm text-gray-500 mb-8">
            This works especially well for businesses and organizations that want to stay in front of moms in the River Region.
          </p>
          <div className="grid grid-cols-2 gap-2 text-left mb-8">
            {[
              'Education and Childcare', 'Community Events and Family Attractions',
              'Salons, Spas, and Aesthetic Services', 'Kids Activities and Sports Training Programs',
              'Clothing Boutiques for Women and Children', 'Fitness and Health Businesses',
              'Medical and Dental Providers', 'Churches and Ministries',
              'Summer Camps and After-School Programs', 'Family-Focused Local Businesses of All Kinds',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 border border-[#ede6de] bg-[#fdf9f5]">
                <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: CREAM_2 }}>
                  <Check size={10} style={{ color: TERRA }} strokeWidth={2.5} />
                </span>
                {item}
              </div>
            ))}
          </div>
          <p className="text-base font-semibold italic text-gray-700">
            If moms are your customer, this is where you need to be.
          </p>
        </div>
      </section>

      {/* ── Package benefits ─────────────────────────────────────────── */}
      <section className="py-14 px-5" style={{ backgroundColor: CREAM }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
            Simple. Affordable. Built to Bring You Customers.
          </h2>
          <p className="text-sm text-gray-500 mb-10 leading-relaxed">
            Our multi-touch advertising packages are designed to keep your business visible, build trust with local families, and create real engagement.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { icon: '👁', title: 'Stay Consistently Visible', body: 'Show up regularly so families remember your name when they\'re ready to choose.' },
              { icon: '🤝', title: 'Build Trust Faster', body: 'Appear within a local platform families already know and value.' },
              { icon: '📈', title: 'Make Growth Easier', body: 'Get expert help without having to become your own marketing department.' },
            ].map(b => (
              <div key={b.title} className="bg-white rounded-2xl border border-[#ede6de] p-6 text-center">
                <div className="text-3xl mb-3">{b.icon}</div>
                <div className="text-sm font-bold text-gray-900 mb-2">{b.title}</div>
                <p className="text-xs text-gray-500 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
          <p className="text-sm italic text-gray-500">No complicated strategies. Just a smarter way to grow.</p>
        </div>
      </section>

      {/* ── Process ──────────────────────────────────────────────────── */}
      <section className="py-14 px-5 text-center" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-2">We&apos;ll Help You Get It Right From the Start</h2>
          <p className="text-sm text-gray-500 mb-1">Not sure what you need? We&apos;ll guide you through it.</p>
          <p className="text-sm text-gray-500">
            We&apos;ll help you shape the right message, create the right ad, and choose the right placement so you can move forward with confidence.
          </p>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────── */}
      <section className="py-16 px-5 text-center text-white" style={{ backgroundColor: TERRA }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">
            Ready to Reach the Moms Who Make the Decisions?
          </h2>
          <p className="text-sm opacity-80 mb-6 leading-relaxed">
            Let&apos;s build something that helps your business or organization get noticed, trusted, and chosen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={scrollToForm}
              className="px-6 py-3 text-sm font-bold rounded-xl transition-all hover:opacity-90 bg-white"
              style={{ color: TERRA }}
            >
              Get Advertising Info
            </button>
            <a
              href="tel:+13343285189"
              className="px-6 py-3 text-sm font-bold rounded-xl border-2 border-white text-white transition-all hover:bg-white/10"
            >
              Schedule a Quick Call
            </a>
          </div>
        </div>
      </section>

      {/* ── Lead capture form ─────────────────────────────────────────── */}
      <section className="py-14 px-5" style={{ backgroundColor: CREAM }} ref={formRef}>
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Get Advertising Info and See Your Options</h2>
            <p className="text-sm text-gray-500">Tell us a little about your business and we&apos;ll show you the ad sizes, pricing, and options that fit best.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#ede6de] shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className={inputCls} placeholder="First" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputCls} placeholder="(334) 555-0100" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Business Type <span className="text-red-500">*</span></label>
                <select required value={form.businessType} onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))}
                  className={cn(inputCls, 'cursor-pointer')}>
                  {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">What are you most interested in? <span className="text-gray-400">(Optional)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {INTEREST_OPTIONS.map(opt => (
                  <label key={opt.id} className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all',
                    form.interests.includes(opt.id)
                      ? 'border-[#7d4535] bg-[#fdf3ef]'
                      : 'border-[#ddd4c8] bg-white hover:border-[#7d4535]/40'
                  )}>
                    <input type="checkbox" className="sr-only" checked={form.interests.includes(opt.id)}
                      onChange={() => toggleInterest(opt.id)} />
                    <div className={cn(
                      'w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-all',
                      form.interests.includes(opt.id) ? 'border-[#7d4535] bg-[#7d4535]' : 'border-[#ccc3ba]'
                    )}>
                      {form.interests.includes(opt.id) && <Check size={10} className="text-white" strokeWidth={2.5} />}
                    </div>
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Anything you&apos;d like us to know? <span className="text-gray-400">(Optional)</span></label>
              <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className={cn(inputCls, 'resize-none')} placeholder="Tell us a bit about your goals..." />
            </div>

            <button
              type="submit"
              disabled={submitting || !form.firstName || !form.businessName || !form.email || form.businessType === 'Select business type' || form.businessType === ''}
              className="w-full py-3.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: TERRA }}
            >
              {submitting
                ? <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                : <>See Advertising Options →</>}
            </button>
          </form>

          {/* Still not sure */}
          <div className="mt-10 text-center">
            <h3 className="text-base font-bold text-gray-900 mb-2">Still Not Sure? That&apos;s Okay.</h3>
            <p className="text-sm text-gray-500 mb-1">Most of our partners felt the same way before getting started.</p>
            <p className="text-sm text-gray-500 mb-1">You don&apos;t have to figure everything out today.</p>
            <p className="text-sm text-gray-500">Just take the first step—and we&apos;ll help you from there.</p>
            <div className="mt-4 space-y-1.5">
              {[
                'No pressure—just information and guidance',
                "We'll help you choose what actually fits your business",
              ].map(item => (
                <div key={item} className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Check size={12} style={{ color: TERRA }} /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-8 px-5 text-center" style={{ backgroundColor: TERRA_DK }}>
        <div className="text-white text-sm font-black mb-1">River Region Parents</div>
        <div className="text-white/50 text-xs">The River Region&apos;s Go-To Resource For Families!</div>
        <div className="text-white/40 text-xs mt-3">© 2026 River Region Parents. All rights reserved. Reaching 18,000 local families every month.</div>
      </footer>

    </div>
  )
}
