// /calendar/submit — public event submission.
//
// Server component on purpose. It renders the site chrome (<Navigation /> is
// async and queries the top-banner ad) and hands the interactive form to a
// client child. See SubmitEventForm.tsx for why they are separate.

import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { SubmitEventForm } from './SubmitEventForm'

export default function SubmitEventPage() {
  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />
      <SubmitEventForm />
      <PublicFooter />
    </div>
  )
}
