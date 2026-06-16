// Submit a vendor or tip — links to the existing /submit form
// pre-scoped to the birthday context. Lightweight bottom-of-page CTA.

import Link from 'next/link'
import { Send } from 'lucide-react'

export function SubmitVendorTip() {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white">
      <div className="max-w-xl">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff7a59] mb-2">Know a vendor we&apos;re missing?</div>
        <h3 className="text-2xl sm:text-3xl font-bold leading-tight">Tell us about your favorite River Region party spot</h3>
        <p className="text-[13px] text-slate-300 mt-3 leading-relaxed">
          We add vendors regularly. If your favorite cake artist, entertainer, or venue isn&apos;t on this list,
          let us know. We&apos;ll reach out, vet them, and add the listing.
        </p>
        <Link
          href="/submit?type=birthday-vendor"
          className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-slate-900 bg-white rounded-lg hover:opacity-90"
        >
          <Send size={13} /> Submit a vendor
        </Link>
      </div>
    </div>
  )
}
