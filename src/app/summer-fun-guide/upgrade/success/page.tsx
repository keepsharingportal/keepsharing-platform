import Link from 'next/link'

export const metadata = { title: 'Enhanced Listing Confirmed — River Region Parents' }

export default function UpgradeSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5 py-16">
      <div className="max-w-lg text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">✓</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Your Enhanced Listing is Confirmed!
        </h1>
        <p className="text-base text-gray-600 mb-6">
          Thank you for upgrading. Your listing has been marked as Enhanced and will display
          above community listings for the entire 2026 summer season.
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-left mb-8 space-y-3">
          <div className="text-sm font-bold text-gray-900">What happens next</div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>You&apos;ll receive an email with a link to complete your enhanced profile (full description, ages, pricing, registration status).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Our team reviews and publishes your enhanced listing within 1 business day.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Your listing shows with the &ldquo;Enhanced&rdquo; badge and sorts above community listings automatically.</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Questions? Email{' '}
          <a href="mailto:jason@keepsharing.com" className="text-blue-600 hover:underline">
            jason@keepsharing.com
          </a>
        </p>

        <Link
          href="/summer-fun-guide"
          className="inline-block px-8 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Back to Summer Fun Guide →
        </Link>
      </div>
    </div>
  )
}
