import { ComingSoon } from '@/components/ui/ComingSoon'

export default function ContentPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Content</h1>
      </div>
      <ComingSoon
        title="Content Operations"
        description="Full content pipeline: articles, spotlights, social queue, events, guides, school news, and voice AI interview management."
        phase="Phase 3 — Content Module"
        features={[
          'Business Spotlight queue: form → Claude API → article draft → publish',
          'Social post approval queue (one-tap, 10 min/day)',
          'Voice AI interview nominations and scheduling (Mom to Mom, Teacher of Month, Grands)',
          'School Bits intake: 4 channels, one approval queue',
          'Events calendar with Facebook Graph API auto-import',
          'Local Guide self-update portal',
          'Weekly email assembly and send via GHL',
          'Birthday Spotlight fulfillment queue',
        ]}
      />
    </div>
  )
}
