// Public "Share your party" submission page. Mom uploads photo +
// fills out the form; submission lands in birthday_real_parties as
// status='pending' for editor moderation.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ShareYourPartyClient } from './ShareYourPartyClient'

export const metadata: Metadata = { title: 'Share your party — The Big Birthday Bash' }
export const dynamic = 'force-dynamic'

export default function ShareYourPartyPage() {
  return (
    <main className="bg-[#fffaf5] min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/birthday-party-guide" className="text-[12px] font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-3">
          <ArrowLeft size={12} /> Back to the Birthday Bash
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
          Share your kid&apos;s last birthday
        </h1>
        <p className="text-[14px] text-slate-600 mt-3 leading-relaxed">
          Photos + a couple sentences. We feature submissions on the Real River Region Parties wall after a quick editor review.
          Your email is for follow-up only — never displayed.
        </p>
        <div className="mt-8">
          <ShareYourPartyClient />
        </div>
      </div>
    </main>
  )
}
