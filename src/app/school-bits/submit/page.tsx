// ── /school-bits/submit ────────────────────────────────────────────────────
// Public-facing School Bits submission form. Lives on the main site so any
// school staff member or parent can submit news from their school. The school
// list is preloaded from Supabase and rendered via the typeahead — public
// submitters CANNOT create new schools (admin-only); if their school isn't
// listed, they're told to contact the editor.
//
// Submissions land in the admin review queue at /admin/school-news. Editor
// gets a notification via the configured webhook so they know to look.

import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Camera, Sparkles, Mail } from 'lucide-react'
import { SchoolBitsLogo } from '@/components/school-zone/SchoolBitsLogo'
import { SubmitForm } from './SubmitForm'

export const metadata: Metadata = {
  title:       'Submit School News — River Region Parents',
  description: 'Share your school\'s news, achievements, and events with River Region Parents readers.',
}
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const MARKET = 'rrp'

export interface PublicSchoolOption {
  id:         string
  name:       string
  area:       string
  is_private: boolean
}

interface PageProps {
  searchParams: Promise<{ school?: string }>
}

export default async function SubmitSchoolBitPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const prefilledSchoolId = sp.school?.trim() || null

  const supabase = supabaseAdmin()

  // Probe — graceful fallback if migration 085 isn't applied
  const probe = await supabase.from('schools').select('id').limit(1)
  const tableMissing = Boolean(probe.error)

  let schools: PublicSchoolOption[] = []
  if (!tableMissing) {
    const { data } = await supabase
      .from('schools')
      .select('id, name, area, is_private')
      .eq('market', MARKET)
      .eq('status', 'active')
      .order('name', { ascending: true })
    schools = (data ?? []) as PublicSchoolOption[]
  }

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40 bg-muted">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-foreground) 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        <div className="container relative z-10 py-12 md:py-16 text-center max-w-3xl">
          {/* SchoolBits wordmark logo sits above the title — same
              treatment used on every supporting card in the rest of
              the section, so the form reads as part of the brand
              rather than a generic submission page. Replaces the
              old green "School Bits" pill badge. */}
          <div className="mb-5 flex justify-center">
            <SchoolBitsLogo size="md" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4 leading-tight">
            Share Your School&apos;s News
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 leading-snug mb-2">
            Got a Purple Star award, a science fair winner, a band championship, or a community service story to celebrate?
            Submit it here — we&apos;ll feature it on the site and in the next print issue.
          </p>
        </div>
      </section>

      <main className="container py-10 md:py-12 max-w-2xl">
        {tableMissing ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-6 py-6 text-center">
            <p className="text-base font-bold text-amber-900 mb-1">Submission system not yet activated</p>
            <p className="text-sm text-amber-800">
              We&apos;re still setting up School Bits — check back soon, or email{' '}
              <a href="mailto:editor@riverregionparents.com" className="underline font-semibold">editor@riverregionparents.com</a>{' '}
              to submit your news directly.
            </p>
          </div>
        ) : (
          <>
            <SubmitForm schools={schools} prefilledSchoolId={prefilledSchoolId} />

            {/* Footnotes */}
            <div className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
              <FootCard
                icon={<Camera className="h-5 w-5" />}
                title="Image quality"
                body="We use the original for our print magazine. Higher resolution = better print quality. Up to 25 MB."
              />
              <FootCard
                icon={<Sparkles className="h-5 w-5" />}
                title="What gets featured"
                body="Real student/school accomplishments and community-facing events. We don't run promotional copy or political content."
              />
              <FootCard
                icon={<Mail className="h-5 w-5" />}
                title="Need help?"
                body={<>Email <a href="mailto:editor@riverregionparents.com" className="text-primary hover:underline">editor@riverregionparents.com</a> if you can&apos;t find your school or have questions.</>}
              />
            </div>
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}

function FootCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    // min-w-0 + overflow-hidden on the card + break-words on the body
    // text so long email addresses (editor@riverregionparents.com) wrap
    // INSIDE the card instead of spilling over the right edge.
    <div className="bg-card border border-border/50 rounded-2xl p-5 min-w-0 overflow-hidden">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="font-bold text-foreground mb-1">{title}</p>
      <p className="text-muted-foreground leading-relaxed text-[13px] break-words">{body}</p>
    </div>
  )
}
