// /advertise/get-started — public self-serve signup. Captures
// business name + email + which guide, then emails the business
// owner a magic link to the onboarding wizard. Listings created this
// way default to is_published=false so the editor reviews before
// they appear on the public guide.
//
// For paid featured listings later, this same page becomes the
// Stripe Checkout funnel (purchase → webhook → magic link).

import type { Metadata } from 'next'
import { SignupForm } from './SignupForm'

export const metadata: Metadata = {
  title:       'Get listed on River Region Parents',
  description: 'Sign up your business for a listing in the River Region Parents directory.',
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

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffaf5] via-white to-white">
      <div className="max-w-4xl mx-auto px-6 py-14">
        <header className="text-center mb-10">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#ff7a59] mb-3">
            Get Listed on River Region Parents
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
            Put your business in front of every River Region parent searching for you.
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Sign up, get an email with a private editor link, and fill out your listing one section at a time. Photos, packages, hours — all yours to control.
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr,300px] gap-8">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 md:p-8">
            <SignupForm guides={GUIDE_OPTIONS} />
          </div>

          <aside className="space-y-4">
            <ValueCard icon="✨" title="Self-serve editor"
              body="Fill it out at your pace. Save & exit any time, come back via the same link." />
            <ValueCard icon="📷" title="Photos that sell"
              body="Hero image, gallery, package shots — all uploaded straight into your listing." />
            <ValueCard icon="🎂" title="Built for your business"
              body="Birthday vendors get packages and themes; pediatricians get specialty + insurance. Every guide knows what matters." />
            <ValueCard icon="✉️" title="Direct inquiries"
              body="Parents send questions through our listing form; we forward to your inbox within a business day." />
          </aside>
        </div>

        <footer className="text-center mt-12 text-[12px] text-slate-500">
          Questions? Email{' '}
          <a href="mailto:hello@riverregionparents.com" className="text-[#ff7a59] font-semibold hover:underline">hello@riverregionparents.com</a>
          {' '}— we read every message.
        </footer>
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
