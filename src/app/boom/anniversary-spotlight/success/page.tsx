import Link from 'next/link'

export const metadata = { title: 'Thank You — River Region Boom' }

export default function AnniversarySpotlightSuccessPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 text-center"
      style={{ backgroundColor: '#0B1829', color: '#F4EFE4', fontFamily: 'Georgia, serif' }}
    >
      <div className="max-w-lg">
        <div className="text-6xl mb-6">💍</div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#C9A84B' }}>
          River Region Boom
        </div>
        <h1 className="text-3xl font-bold mb-4">Your Spotlight is Submitted!</h1>
        <p className="text-lg leading-relaxed mb-3" style={{ color: '#D8D0C0' }}>
          Thank you for sharing your love story with the River Region.
          We{"'"}ll review your submission and reach out to confirm details.
        </p>
        <p className="text-base mb-8" style={{ color: '#9A9288' }}>
          For Premium Keepsake orders, your digital PDF will be emailed to you within 3–5 business days.
          Print placement will be confirmed for the next available issue.
        </p>
        <div className="space-y-3">
          <div
            className="rounded-2xl border p-4 text-sm text-left"
            style={{ borderColor: '#1E3558', backgroundColor: '#112035' }}
          >
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#C9A84B' }}>Next Steps</div>
            <ul className="space-y-1.5" style={{ color: '#D8D0C0' }}>
              <li>✓ Confirmation email sent to your address</li>
              <li>✓ Our team reviews your submission</li>
              <li>✓ Featured & Premium: AI social post generated</li>
              <li>✓ Premium: Digital keepsake PDF created</li>
              <li>✓ Your story published on RiverRegionBoom.com</li>
            </ul>
          </div>
          <p className="text-xs" style={{ color: '#9A9288' }}>
            Have a photo to share? Email it to{' '}
            <span style={{ color: '#C9A84B' }}>jason@keepsharing.com</span>
          </p>
        </div>
        <Link
          href="/boom"
          className="inline-block mt-8 px-8 py-3 text-base font-bold rounded-xl transition-all hover:opacity-90"
          style={{ backgroundColor: '#C9A84B', color: '#0B1829' }}
        >
          Return to Boom →
        </Link>
      </div>
    </div>
  )
}
