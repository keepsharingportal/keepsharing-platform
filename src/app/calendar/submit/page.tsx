import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { CalendarDays, ArrowLeft, CheckCircle, Clock, MapPin, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Submit an Event — River Region Parents',
  description: 'Submit your family-friendly event to the River Region Parents community calendar. Free for community events.',
}

const WHAT_TO_INCLUDE = [
  { icon: CalendarDays, label: 'Event date and time'   },
  { icon: MapPin,       label: 'Location (name + address)' },
  { icon: Users,        label: 'Who is it for (ages, families, etc.)' },
  { icon: Clock,        label: 'Cost (free vs. paid, registration required)' },
]

export default function SubmitEventPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-10 md:py-14">
        {/* Back nav */}
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Calendar
        </Link>

        <div className="grid lg:grid-cols-3 gap-10 max-w-5xl">
          {/* Main */}
          <div className="lg:col-span-2">
            <div className="mb-7">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-2">
                <CalendarDays className="h-3.5 w-3.5" />
                Community Calendar
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-3">
                Submit an Event
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                Share your family-friendly event with thousands of River Region families. Community events are free to submit. Promoted event listings are available for businesses and organizations.
              </p>
            </div>

            {/* Submission form embed — wire to GHL or Typeform */}
            <div className="bg-muted/30 border border-border/50 rounded-2xl p-8 text-center">
              <CalendarDays className="h-10 w-10 text-primary/40 mx-auto mb-4" />
              <p className="font-bold text-foreground mb-2">Event Submission Form</p>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed max-w-md mx-auto">
                Our event submission form is being finalized. In the meantime, email your event details directly to us and we'll get it on the calendar.
              </p>
              <a
                href="mailto:hello@riverregionparents.com?subject=Event Submission"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Email Your Event
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                We typically publish submitted events within 2 business days.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* What to include */}
            <div className="bg-card border border-border/50 rounded-2xl p-5">
              <h2 className="font-bold text-base text-foreground mb-4">What to Include</h2>
              <div className="space-y-3">
                {WHAT_TO_INCLUDE.map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-muted/30 border border-border/40 rounded-2xl p-5">
              <h2 className="font-bold text-base text-foreground mb-3">Submission Guidelines</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  'Events must be family-friendly and open to the River Region community',
                  'Commercial events or ongoing promotions may not qualify for free listings',
                  'We reserve the right to edit submissions for clarity and space',
                  'Events are typically published within 2 business days of receipt',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Promoted listing upsell */}
            <div className="bg-secondary/8 border border-secondary/25 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">For Businesses</p>
              <h3 className="font-bold text-sm text-foreground mb-2">Want Premium Event Placement?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Promoted events get featured placement at the top of the calendar, social sharing, and newsletter inclusion.
              </p>
              <Link
                href="/advertise"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary hover:text-secondary/80 transition-colors"
              >
                Learn About Promoted Listings <CalendarDays className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
