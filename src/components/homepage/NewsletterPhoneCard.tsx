// Sidebar newsletter signup with a phone-mockup illustration — inspired
// by the KC Parent layout. The phone shows a faux preview of what the
// newsletter looks like in a reader's inbox so the value is visual, not
// just a wall of text.
//
// Renders as a single card: phone graphic on top, email form below.
// All-CSS phone (no asset dependency) so it scales cleanly on retina
// and never gates the build on a missing image file.

import { NewsletterSignup } from '@/components/NewsletterSignup'
import { Mail, Sparkles } from 'lucide-react'

export function NewsletterPhoneCard() {
  return (
    <div id="newsletter" className="rounded-3xl overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-secondary/8 shadow-sm">

      {/* ── Phone mockup ───────────────────────────────────────────── */}
      <div className="relative px-6 pt-7 pb-3">
        {/* Decorative sparkles in the corners */}
        <Sparkles className="absolute top-3 left-4 h-4 w-4 text-primary/40" />
        <Sparkles className="absolute top-5 right-5 h-3 w-3 text-secondary/50" />

        <div className="mx-auto w-[150px]">
          {/* Phone outer shell */}
          <div className="relative aspect-[9/19] rounded-[2rem] bg-foreground p-1.5 shadow-xl">
            {/* Screen */}
            <div className="relative h-full w-full rounded-[1.65rem] overflow-hidden bg-white flex flex-col">

              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-foreground rounded-b-xl z-10" />

              {/* Status bar */}
              <div className="flex items-center justify-between px-3 pt-1.5 pb-1 text-[7px] font-semibold text-foreground/80">
                <span>9:41</span>
                <span className="flex items-center gap-0.5">
                  <span className="w-0.5 h-0.5 bg-foreground/70 rounded-full" />
                  <span className="w-0.5 h-0.5 bg-foreground/70 rounded-full" />
                  <span className="w-0.5 h-0.5 bg-foreground/70 rounded-full" />
                </span>
              </div>

              {/* Mail app header */}
              <div className="px-2.5 pt-2 pb-1.5 bg-primary/10 border-b border-primary/15">
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                    <Mail className="h-2 w-2 text-primary-foreground" />
                  </div>
                  <span className="text-[8px] font-bold text-foreground tracking-tight">RRP Weekly</span>
                </div>
                <p className="text-[6.5px] text-muted-foreground mt-0.5 truncate">This week in River Region…</p>
              </div>

              {/* Fake email body */}
              <div className="flex-1 px-2 py-1.5 space-y-1.5 overflow-hidden">
                {/* Hero "image" */}
                <div className="h-7 w-full rounded-md bg-gradient-to-br from-secondary/40 to-primary/40 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-white">SUMMER FUN</span>
                </div>
                {/* Lines */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded bg-foreground/15" />
                  <div className="h-1.5 w-5/6 rounded bg-foreground/15" />
                  <div className="h-1.5 w-4/6 rounded bg-foreground/15" />
                </div>
                {/* "Event card" */}
                <div className="rounded-md border border-foreground/10 p-1 mt-1">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded bg-accent/40" />
                    <div className="flex-1 space-y-0.5">
                      <div className="h-1 w-3/4 rounded bg-foreground/20" />
                      <div className="h-1 w-1/2 rounded bg-foreground/10" />
                    </div>
                  </div>
                </div>
                {/* Lines */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded bg-foreground/15" />
                  <div className="h-1.5 w-3/6 rounded bg-foreground/15" />
                </div>
                {/* CTA pill */}
                <div className="mx-auto mt-1 h-3 w-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[5.5px] font-bold text-primary-foreground tracking-wide">READ MORE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Copy + form ────────────────────────────────────────────── */}
      <div className="px-6 pb-6 pt-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Free Weekly</p>
        <h3 className="text-lg font-black text-foreground leading-tight mb-1">
          The Best of River Region — in Your Inbox
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Local events, parenting stories, and the guides moms ask about. One short email, every week.
        </p>
        <NewsletterSignup variant="inline" source="homepage-sidebar" />
        <p className="text-[10px] text-muted-foreground/80 mt-2">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  )
}
