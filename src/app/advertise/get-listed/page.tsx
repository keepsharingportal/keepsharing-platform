// /advertise/get-listed — paid featured-listing funnel. Same form as
// /advertise/get-started but redirects through Stripe Checkout before
// provisioning the account. Webhook handles provisioning on success.

import type { Metadata } from 'next'
import { GetListedForm } from './GetListedForm'

export const metadata: Metadata = {
  title:       'Get featured on River Region Parents',
  description: 'Become a featured partner in the River Region Parents directory — annual subscription, self-serve setup.',
}

const GUIDE_OPTIONS = [
  { value: 'birthday-party', label: 'Birthday Party Guide' },
  { value: 'summer-camp',    label: 'Summer Camp Guide' },
  { value: 'summer-fun',     label: 'Summer Fun Guide' },
  { value: 'private-school', label: 'Private School Guide' },
  { value: 'childcare',      label: 'Childcare Guide' },
  { value: 'healthy-kids',   label: 'Healthy Kids Guide' },
  { value: 'special-needs',  label: 'Special Needs Guide' },
  { value: 'afterschool',    label: 'After-School Guide' },
  { value: 'newcomer',       label: 'Family Resource Guide' },
]

interface Props {
  searchParams: Promise<{ canceled?: string }>
}

export default async function GetListedPage({ searchParams }: Props) {
  const { canceled } = await searchParams
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffaf5] via-white to-white">
      <div className="max-w-4xl mx-auto px-6 py-14">
        <header className="text-center mb-10">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#ff7a59] mb-3">
            Become a Featured Partner
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
            Top placement, photos, packages, direct inquiries.
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Featured listings sit above the standard directory, get the full magazine treatment (hero photo, packages, FAQ, gallery), and convert parents into bookings.
          </p>
        </header>

        {canceled && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-[12px] text-amber-800">
            Checkout canceled — no charge was made. Fill the form again any time to retry.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr,300px] gap-8">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 md:p-8">
            <GetListedForm guides={GUIDE_OPTIONS} />
          </div>

          <aside className="space-y-4">
            <ValueCard icon="⭐" title="Above the directory"
              body="Featured listings render first on every category page, with a Featured Partner badge." />
            <ValueCard icon="📷" title="Full magazine layout"
              body="Hero photo, blurb, packages, hours, FAQ, gallery — every section the canonical listing supports." />
            <ValueCard icon="✏️" title="Self-serve editor"
              body="After payment we email you a private editing link. Fill it out at your pace, edit any time." />
            <ValueCard icon="✉️" title="Direct inquiries"
              body="Parents send questions through the listing form; we forward to your inbox within a business day." />
          </aside>
        </div>

        <p className="text-center mt-8 text-[12px] text-slate-500">
          Looking for a free directory listing instead?{' '}
          <a href="/advertise/get-started" className="text-[#ff7a59] font-semibold hover:underline">Sign up here</a>.
        </p>
      </div>
    </div>
  )
}

function ValueCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-white border border-black/5 rounded-xl p-4 shadow-sm">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-[13px] font-bold text-slate-900 mb-1">{title}</div>
      <p className="text-[12px] text-slate-600 leading-snug">{body}</p>
    </div>
  )
}
