// /advertise/featured-success — landing page after a successful
// Stripe Checkout for a featured listing. The webhook does the
// real provisioning (creates the advertiser, mints the token,
// emails the wizard link) asynchronously; we just show a friendly
// "check your email" message here.

import type { Metadata } from 'next'
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title:  'Welcome aboard | River Region Parents',
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ session_id?: string; fake?: string }>
}

export default async function FeaturedSuccessPage({ searchParams }: Props) {
  const { fake } = await searchParams

  if (fake) {
    // Honeypot path — render nothing useful
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffaf5] via-white to-white flex items-center justify-center px-6 py-16">
      <div className="max-w-lg text-center space-y-5">
        <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
        <h1 className="text-3xl md:text-4xl font-black text-slate-900">You&apos;re in.</h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Payment confirmed — welcome to River Region Parents. We&apos;re setting up your featured listing right now.
        </p>
        <div className="bg-white border border-black/5 rounded-xl p-5 shadow-sm text-left">
          <div className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[#ff7a59] mb-2">
            <Mail size={13} /> Check your email
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Within a minute or two you&apos;ll receive an email with a private link to your listing editor.
            Click it to fill out your business details, photos, packages, and more — at your pace, save & exit any time.
          </p>
        </div>
        <p className="text-[12px] text-slate-500">
          Didn&apos;t see the email? Check spam, then reach out to{' '}
          <a href="mailto:hello@riverregionparents.com" className="text-[#ff7a59] font-semibold hover:underline inline-flex items-center gap-0.5">
            hello@riverregionparents.com <ArrowRight size={11} />
          </a>
        </p>
      </div>
    </div>
  )
}
