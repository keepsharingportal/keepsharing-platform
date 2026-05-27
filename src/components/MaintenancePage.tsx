// Branded maintenance holding page. Shown to public visitors when
// maintenance_mode is toggled on. Staff sees this instead of a broken page
// while the team is making repairs. Matches the brand — coral accents,
// magazine feel, light and reassuring.

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        {/* Brand mark */}
        <div className="mb-8">
          <div className="text-xl font-bold text-[#1a2744] mb-0.5">
            River Region <span className="text-[#ef6442]">Parents</span>
          </div>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#ef6442]">
            The Go-To Resource for River Region Families
          </div>
        </div>

        {/* Message */}
        <div className="w-16 h-16 rounded-full bg-[#fdf0eb] flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef6442" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#1a2744] mb-3">
          Quick Tune-Up in Progress
        </h1>
        <p className="text-base text-gray-600 leading-relaxed mb-6">
          We&apos;re making a few improvements to give you a better experience.
          We&apos;ll be back in just a few minutes.
        </p>

        <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm ring-1 ring-gray-200 text-sm text-gray-600">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Back shortly
        </div>

        <p className="mt-10 text-xs text-gray-400">
          Questions? Email us at{' '}
          <a href="mailto:hello@riverregionparents.com" className="text-[#ef6442] hover:underline">
            hello@riverregionparents.com
          </a>
        </p>
      </div>
    </div>
  )
}
