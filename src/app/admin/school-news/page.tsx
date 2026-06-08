// ── /admin/school-news ─────────────────────────────────────────────────────
// School News review queue. Pending bits land here from:
//   - Staff Quick Add (this page)
//   - The public submission form (Phase 2)
//   - Email-to-editor and Facebook-paste workflows (also Phase 2)
//
// Reads from Supabase via service role (admin-only data, RLS-resistant).
// All mutations go through /api/admin/school-news/* routes.

import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { SchoolNewsClient } from './SchoolNewsClient'

export const metadata: Metadata = { title: 'School Bits — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const MARKET = 'rrp'

export interface SchoolBitRow {
  id:                 string
  school_id:          string | null
  school_name:        string
  title:              string
  blurb:              string
  image_web_url:      string | null
  source_type:        string
  source_url:         string | null
  submitted_by_name:  string | null
  submitted_by_email: string | null
  status:             string
  issue_month:        string | null
  published_at:       string | null
  created_at:         string
}

export interface SchoolOption {
  id:         string
  name:       string
  area:       string
  is_private: boolean
}

interface PageProps { searchParams: Promise<{ status?: string }> }

export default async function SchoolNewsPage({ searchParams }: PageProps) {
  const supabase = supabaseAdmin()
  const sp = await searchParams
  // status query param ('pending', 'active', etc.) lets the sidebar's
  // "Submitted School Bits" link land on a pre-filtered view without us
  // duplicating the page. SchoolNewsClient already supports an initial
  // status filter prop — we just thread it through.
  const initialStatus = sp.status ?? null

  // Probe — graceful fallback if migration 085 isn't applied yet
  const probe = await supabase.from('school_bits').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="flex-1 overflow-y-auto">
        <main className="p-6 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 mb-4">School Bits</h1>
          <div className="rounded-xl border border-amber-300 bg-portal-amber-lt px-5 py-4">
            <p className="text-sm font-bold text-amber-900 mb-1">Migration needed</p>
            <p className="text-sm text-portal-amber leading-relaxed">
              Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/085_schools_and_bits.sql</code> in the Supabase SQL editor to activate School News.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Load bits + schools in parallel.
  // Note: limit 1000 covers MVP comfortably. Filtering + pagination happen
  // client-side over this window. When bit count exceeds ~1000, swap this
  // for a server-side cursor query keyed off published_at/created_at and
  // pipe the filter inputs through query params.
  const [bitsRes, schoolsRes] = await Promise.all([
    supabase
      .from('school_bits')
      .select('id, school_id, school_name, title, blurb, image_web_url, source_type, source_url, submitted_by_name, submitted_by_email, status, issue_month, published_at, created_at')
      .eq('market', MARKET)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('schools')
      .select('id, name, area, is_private')
      .eq('market', MARKET)
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ])

  if (bitsRes.error)    console.error('[school-news] load bits failed:',    bitsRes.error)
  if (schoolsRes.error) console.error('[school-news] load schools failed:', schoolsRes.error)

  const bits    = (bitsRes.data    ?? []) as SchoolBitRow[]
  const schools = (schoolsRes.data ?? []) as SchoolOption[]

  return (
    <div className="flex-1 overflow-y-auto">
      <SchoolNewsClient initialBits={bits} schools={schools} initialStatus={initialStatus} />
    </div>
  )
}
