import Link from 'next/link'
import { Check } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Campaign Confirmed — River Region Parents' }

const TERRA    = '#7d4535'
const TERRA_DK = '#5f3227'
const CREAM    = '#faf7f2'

export default function AdvertiseSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>

      {/* Header */}
      <header className="bg-white border-b border-[#ede6de]">
        <div className="max-w-4xl mx-auto px-5 py-3">
          <div className="text-base font-black text-gray-900 tracking-tight leading-none">River Region</div>
          <div className="text-xs font-bold tracking-widest uppercase leading-none" style={{ color: TERRA }}>Parents</div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-md border border-[#ede6de] max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#f0ece5', border: `2px solid ${TERRA}` }}>
            <Check size={28} style={{ color: TERRA }} strokeWidth={2.5} />
          </div>

          <h1 className="text-xl font-black text-gray-900 mb-2">
            You&apos;re in. Welcome to River Region Parents.
          </h1>
          <p className="text-sm text-gray-600 mb-2 leading-relaxed">
            Your spot is reserved and your payment is complete. We are glad to have you.
          </p>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            A member of our team will reach out within 1 business day to review your ad, finalize your design brief, and make sure everything looks great before it goes live.
          </p>

          <div className="space-y-2 text-left mb-7 bg-[#fdf9f5] rounded-xl p-4">
            {[
              "You'll receive a confirmation email shortly",
              "We'll design your ad and share a proof",
              "Your campaign goes live at the start of your selected month",
              "We'll be in touch every step of the way",
            ].map(item => (
              <div key={item} className="flex items-start gap-2 text-xs text-gray-600">
                <Check size={12} className="shrink-0 mt-0.5" style={{ color: TERRA }} strokeWidth={2.5} />
                {item}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Link
              href="/advertise/campaign"
              className="block w-full py-3 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: TERRA }}
            >
              Start Another Campaign
            </Link>
            <Link
              href="/advertise"
              className="block w-full py-3 text-sm font-semibold rounded-xl border border-[#ddd4c8] text-gray-600 hover:bg-[#fdf9f5] transition-all"
            >
              Back to Main Page
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-5 text-center" style={{ backgroundColor: TERRA_DK }}>
        <div className="text-white text-sm font-black mb-1">River Region Parents</div>
        <div className="text-white/40 text-xs">© 2026 River Region Parents. All rights reserved.</div>
      </footer>

    </div>
  )
}
