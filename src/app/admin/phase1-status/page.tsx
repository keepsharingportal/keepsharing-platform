import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, XCircle, ExternalLink, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

type Status = 'ok' | 'warn' | 'empty'

function StatusDot({ status }: { status: Status }) {
  if (status === 'ok')   return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
  if (status === 'warn') return <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
  return <XCircle className="h-5 w-5 text-red-400 shrink-0" />
}

function StatCard({ label, value, sub, status }: { label: string; value: number | string; sub?: string; status: Status }) {
  const bg = status === 'ok' ? 'bg-green-50 border-green-200' : status === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const txt = status === 'ok' ? 'text-green-700' : status === 'warn' ? 'text-amber-700' : 'text-red-600'
  return (
    <div className={`rounded-xl border px-5 py-4 ${bg}`}>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-black ${txt}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

interface DemoStep {
  label: string
  url: string
  status: Status
  note: string
  adminUrl?: string
}

export default async function Phase1StatusPage() {
  const supabase = getSupabase()

  const [
    { count: totalPublished },
    { count: totalPending },
    { count: missingImages },
    { count: schoolBitsPublished },
    { count: schoolBitsPending },
    { data: guideListingCounts },
    { count: events },
  ] = await Promise.all([
    supabase.from('guide_articles').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true }).in('editorial_review_status', ['pending', 'needs_edit']),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true }).eq('published', true).is('hero_image_url', null),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true }).eq('published', true).eq('column_slug', 'school-bits'),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true }).in('editorial_review_status', ['pending']).eq('column_slug', 'school-bits'),
    supabase.from('guide_listings').select('guide_type_slug').eq('is_published', true),
    supabase.from('calendar_events').select('id', { count: 'exact', head: true }).gte('start_date', new Date().toISOString()),
  ])

  // Count listings per guide
  const listingsByGuide: Record<string, number> = {}
  for (const row of guideListingCounts ?? []) {
    const g = row.guide_type_slug as string
    listingsByGuide[g] = (listingsByGuide[g] ?? 0) + 1
  }
  const totalListings = Object.values(listingsByGuide).reduce((a, b) => a + b, 0)
  const summerCampCount = listingsByGuide['summer-camp'] ?? 0
  const frgCount = (listingsByGuide['newcomer'] ?? 0) + (listingsByGuide['family-resource-guide'] ?? 0) + (listingsByGuide['family-resource'] ?? 0)
  const summerFunCount = listingsByGuide['summer-fun'] ?? 0

  // Demo path steps
  const demoSteps: DemoStep[] = [
    {
      label: 'Homepage',
      url: '/',
      status: (totalPublished ?? 0) > 0 ? 'ok' : 'warn',
      note: (totalPublished ?? 0) > 0 ? `${totalPublished} articles live` : 'No published articles yet',
    },
    {
      label: 'School Zone',
      url: '/school-zone',
      status: (schoolBitsPublished ?? 0) >= 5 ? 'ok' : (schoolBitsPublished ?? 0) > 0 ? 'warn' : 'empty',
      note: `${schoolBitsPublished ?? 0} School Bits published${(schoolBitsPending ?? 0) > 0 ? ` · ${schoolBitsPending} pending approval` : ''}`,
      adminUrl: '/admin/articles/review',
    },
    {
      label: 'Article View',
      url: '/articles',
      status: (totalPublished ?? 0) > 0 ? 'ok' : 'empty',
      note: (totalPublished ?? 0) > 0 ? `${totalPublished} articles available` : 'No articles published',
      adminUrl: '/admin/articles',
    },
    {
      label: 'Summer Camp Guide',
      url: '/summer-camp-guide',
      status: summerCampCount >= 5 ? 'ok' : summerCampCount > 0 ? 'warn' : 'empty',
      note: summerCampCount > 0 ? `${summerCampCount} listings live` : 'No listings yet — import CSV',
      adminUrl: '/admin/content/guide-listings-import',
    },
    {
      label: 'Family Resource Guide',
      url: '/family-resource-guide',
      status: frgCount >= 5 ? 'ok' : frgCount > 0 ? 'warn' : 'empty',
      note: frgCount > 0 ? `${frgCount} listings live` : 'No listings yet — import CSV',
      adminUrl: '/admin/content/guide-listings-import',
    },
    {
      label: 'Summer Fun Guide',
      url: '/summer-fun-guide',
      status: summerFunCount >= 3 ? 'ok' : summerFunCount > 0 ? 'warn' : 'empty',
      note: summerFunCount > 0 ? `${summerFunCount} listings live` : 'No listings yet',
    },
    {
      label: 'Events Calendar',
      url: '/calendar',
      status: (events ?? 0) >= 3 ? 'ok' : (events ?? 0) > 0 ? 'warn' : 'empty',
      note: `${events ?? 0} upcoming events`,
      adminUrl: '/admin/content/events-import',
    },
    {
      label: 'Advertise Page',
      url: '/advertise',
      status: 'ok',
      note: 'Lead capture form live',
    },
  ]

  const demoReady = demoSteps.filter(s => s.status === 'ok').length
  const demoTotal = demoSteps.length
  const overallStatus: Status = demoReady === demoTotal ? 'ok' : demoReady >= demoTotal * 0.75 ? 'warn' : 'empty'

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Phase 1 — Demo Readiness</h1>
        <p className="text-muted-foreground text-sm">
          Sales demo path: Homepage → School Zone → Article → Summer Camp Guide → FRG → Listing → Advertise
        </p>
      </div>

      {/* Overall score */}
      <div className={`rounded-2xl border-2 p-6 flex items-center gap-4 ${
        overallStatus === 'ok' ? 'border-green-400 bg-green-50' :
        overallStatus === 'warn' ? 'border-amber-400 bg-amber-50' :
        'border-red-300 bg-red-50'
      }`}>
        <StatusDot status={overallStatus} />
        <div>
          <p className="font-bold text-lg">
            {demoReady} / {demoTotal} demo steps ready
          </p>
          <p className="text-sm text-muted-foreground">
            {overallStatus === 'ok' ? '✅ Phase 1 demo ready to run' :
             overallStatus === 'warn' ? 'Almost ready — fix the amber items below before your demo' :
             'Several critical gaps — complete the import steps below'}
          </p>
        </div>
      </div>

      {/* Content health stats */}
      <section>
        <h2 className="text-lg font-bold mb-4">Content Health</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Published Articles"
            value={totalPublished ?? 0}
            status={(totalPublished ?? 0) >= 10 ? 'ok' : (totalPublished ?? 0) > 0 ? 'warn' : 'empty'}
          />
          <StatCard
            label="Pending Review"
            value={totalPending ?? 0}
            sub={(totalPending ?? 0) > 0 ? 'Need approval' : 'Queue clear'}
            status={(totalPending ?? 0) === 0 ? 'ok' : 'warn'}
          />
          <StatCard
            label="Missing Hero Images"
            value={missingImages ?? 0}
            sub="Published articles"
            status={(missingImages ?? 0) === 0 ? 'ok' : (missingImages ?? 0) <= 3 ? 'warn' : 'empty'}
          />
          <StatCard
            label="Total Listings"
            value={totalListings}
            status={totalListings >= 10 ? 'ok' : totalListings > 0 ? 'warn' : 'empty'}
          />
        </div>
      </section>

      {/* Demo path checklist */}
      <section>
        <h2 className="text-lg font-bold mb-4">Demo Path Checklist</h2>
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {demoSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-4 px-5 py-4 bg-card hover:bg-muted/30 transition-colors">
              <StatusDot status={step.status} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{step.label}</p>
                <p className="text-xs text-muted-foreground truncate">{step.note}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {step.adminUrl && step.status !== 'ok' && (
                  <Button asChild size="sm" variant="outline" className="rounded-full text-xs h-7 px-3">
                    <Link href={step.adminUrl}>
                      Fix <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
                <Link
                  href={step.url}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-portal-blue transition-colors"
                >
                  Preview <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Import actions */}
      <section>
        <h2 className="text-lg font-bold mb-4">Pending Import Actions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {(schoolBitsPending ?? 0) > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-bold text-amber-900 mb-1">{schoolBitsPending} School Bits articles pending</p>
              <p className="text-sm text-amber-700 mb-3">Review and bulk-approve to make them live on School Zone.</p>
              <Button asChild size="sm" className="rounded-full bg-amber-600 hover:bg-amber-700">
                <Link href="/admin/articles/review">Open Review Queue</Link>
              </Button>
            </div>
          )}
          {summerCampCount === 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-900 mb-1">Summer Camp Guide: no listings</p>
              <p className="text-sm text-red-700 mb-3">Import the summer camp CSV to populate the guide.</p>
              <Button asChild size="sm" variant="destructive" className="rounded-full">
                <Link href="/admin/content/guide-listings-import">Import CSV</Link>
              </Button>
            </div>
          )}
          {frgCount === 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-900 mb-1">Family Resource Guide: no listings</p>
              <p className="text-sm text-red-700 mb-3">Import the FRG priority CSV to populate the directory.</p>
              <Button asChild size="sm" variant="destructive" className="rounded-full">
                <Link href="/admin/content/guide-listings-import">Import CSV</Link>
              </Button>
            </div>
          )}
          {(events ?? 0) === 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-900 mb-1">Events calendar: no events</p>
              <p className="text-sm text-red-700 mb-3">Import events CSV to show upcoming family events.</p>
              <Button asChild size="sm" variant="destructive" className="rounded-full">
                <Link href="/admin/content/events-import">Import Events</Link>
              </Button>
            </div>
          )}
          {(schoolBitsPending ?? 0) === 0 && summerCampCount > 0 && frgCount > 0 && (events ?? 0) > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 col-span-full text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-bold text-green-900">All import actions complete</p>
              <p className="text-sm text-green-700 mt-1">Platform is ready for the sales demo.</p>
            </div>
          )}
        </div>
      </section>

      {/* Demo script */}
      <section>
        <h2 className="text-lg font-bold mb-4">Sales Demo Script</h2>
        <ol className="space-y-3 text-sm">
          {[
            { step: 1, action: 'Open homepage', url: '/', note: 'Show content pillar strip, Summer Fun block, School Zone block, guide discovery strip' },
            { step: 2, action: 'Click "School Zone"', url: '/school-zone', note: 'Show photo hero, area cards, article grid — editorial depth' },
            { step: 3, action: 'Open any School Bits article', url: '/articles', note: 'Show article body, related articles sidebar, clean reading experience' },
            { step: 4, action: 'Navigate to Summer Camp Guide', url: '/summer-camp-guide', note: 'Show listing cards with contact info, Featured Provider section, sponsor banner' },
            { step: 5, action: 'Open a listing detail page', url: '/summer-camp-guide', note: 'Show hero photo, key facts, gallery, contact sidebar, inquiry form' },
            { step: 6, action: 'Navigate to Family Resource Guide', url: '/family-resource-guide', note: 'Show full vertical layout, category directory, tier system' },
            { step: 7, action: 'Click "Get Listed Today"', url: '/advertise', note: 'Show lead capture form — close the loop on the advertiser journey' },
          ].map(({ step, action, url, note }) => (
            <li key={step} className="flex gap-4 items-start rounded-xl border border-border px-5 py-4 bg-card">
              <span className="h-6 w-6 rounded-full bg-portal-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
              </div>
              <Link
                href={url}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline shrink-0"
              >
                Open <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
