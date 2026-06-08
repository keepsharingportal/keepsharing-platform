// ── /admin/school-news/schools ─────────────────────────────────────────────
// Manage the schools registry for River Region. Add/edit/archive schools
// individually, or bulk-upload a CSV (one row per school) to seed the list.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, School as SchoolIcon } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { AREAS, AREA_LABELS, type Area } from '@/lib/school-news/areas'
import { SchoolsManagerClient } from './SchoolsManagerClient'

export const metadata: Metadata = { title: 'Schools Manager — School News Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const MARKET = 'rrp'

export interface SchoolRow {
  id:            string
  name:          string
  area:          Area
  is_private:    boolean
  district:      string | null
  grade_band:    string | null
  contact_email: string | null
  facebook_url:  string | null
  city:          string | null
  address:       string | null
  status:        string
  created_at:    string
}

export default async function SchoolsManagerPage() {
  const supabase = supabaseAdmin()

  // Probe for the migration first — graceful fallback if 085 isn't applied
  const probe = await supabase.from('schools').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="flex-1 overflow-y-auto">
        <main className="p-6 max-w-3xl mx-auto">
          <BackLink />
          <div className="mt-4 rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
            <p className="text-sm font-bold text-portal-amber mb-1">Migration needed</p>
            <p className="text-sm text-portal-amber leading-relaxed">
              Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/085_schools_and_bits.sql</code> in the Supabase SQL editor to enable the schools manager.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const { data: schoolsData, error } = await supabase
    .from('schools')
    .select('id, name, area, is_private, district, grade_band, contact_email, facebook_url, city, address, status, created_at')
    .eq('market', MARKET)
    .order('name', { ascending: true })
  if (error) console.error('[schools-manager] load failed:', error)
  const schools = (schoolsData ?? []) as SchoolRow[]

  // Quick stats for the header
  const byArea: Record<string, { total: number; private: number }> = {}
  for (const a of AREAS) byArea[a] = { total: 0, private: 0 }
  for (const s of schools) {
    if (s.status !== 'active') continue
    const bucket = byArea[s.area] ?? (byArea[s.area] = { total: 0, private: 0 })
    bucket.total++
    if (s.is_private) bucket.private++
  }
  const total = schools.filter(s => s.status === 'active').length

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-6 max-w-[1200px] mx-auto space-y-6 pb-16">
        <BackLink />

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SchoolIcon size={20} className="text-portal-blue" />
              <h1 className="text-xl font-bold text-portal-text tracking-tight">Schools Manager</h1>
            </div>
            <p className="text-sm text-portal-sub">
              {total} active school{total === 1 ? '' : 's'} across {AREAS.length} areas.
              Used by the School News submission form + admin queue + public filters.
            </p>
          </div>
        </header>

        {/* Stats by area */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AREAS.map(a => {
            const stat = byArea[a]
            return (
              <div key={a} className="bg-white border border-portal-border rounded-lg px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">{AREA_LABELS[a]}</p>
                <p className="text-2xl font-bold text-portal-text mt-1">{stat.total}</p>
                {stat.private > 0 && (
                  <p className="text-[11px] text-portal-sub mt-0.5">{stat.private} private</p>
                )}
              </div>
            )
          })}
        </div>

        <SchoolsManagerClient initialSchools={schools} />
      </main>
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/admin/school-news" className="inline-flex items-center gap-1 text-sm font-semibold text-portal-sub hover:text-portal-text">
      <ArrowLeft size={14} /> Back to School News queue
    </Link>
  )
}
