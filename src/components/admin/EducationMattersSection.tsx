'use client'

// ── Admin editor panel — Education Matters per-article overrides ───────
//
// Renders in the admin article editor when the selected column is one
// of the four Education Matters districts. Fields stored inside the
// article's spotlight_data JSONB so no schema migration is required
// (spotlight_data was already available and is unused for these
// non-spotlight columns).
//
// SPONSOR IS NO LONGER EDITED HERE. It's managed as a persistent
// contract at /admin/education-matters/sponsors (see column_sponsorships
// migration 218). One sponsor per district for a date range, auto-picks
// by article publish date. Removes monthly re-entry.
//
// Keys we write on this article's spotlight_data:
//   focus       — This Month's Focus (At a Glance card)
//   pull_quote  — override the auto-detected blockquote

import { GraduationCap, Info } from 'lucide-react'
import Link from 'next/link'
import { getDistrictForColumn } from '@/lib/education-matters/districts'

interface Props {
  columnSlug:     string
  spotlightData:  Record<string, string>
  onDataChange:   (next: Record<string, string>) => void
}

export function EducationMattersSection({ columnSlug, spotlightData, onDataChange }: Props) {
  const district = getDistrictForColumn(columnSlug)

  if (!district) return null

  function set(key: string, value: string) {
    onDataChange({ ...spotlightData, [key]: value })
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-portal-border outline-none focus:border-portal-blue bg-white'

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap size={16} className="text-teal-700" />
        <h3 className="text-[13px] font-bold text-teal-900">Education Matters — {district.shortName}</h3>
      </div>
      <p className="text-[11px] text-teal-900/70 -mt-2">
        District branding + <strong>{district.superintendent.name}</strong>&apos;s bio and photo auto-fill from
        the district config. Only fill in the per-month focus + pull quote here.
      </p>

      {/* Focus (At a Glance) */}
      <div>
        <label className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1.5">This Month&apos;s Focus</label>
        <input
          className={inp}
          value={spotlightData.focus ?? ''}
          onChange={e => set('focus', e.target.value)}
          placeholder={district.focusDefault}
        />
        <p className="text-[11px] text-teal-900/60 mt-1">Shown in the At a Glance card. Defaults to &ldquo;{district.focusDefault}&rdquo; when blank.</p>
      </div>

      {/* Pull quote override */}
      <div>
        <label className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1.5">Pull Quote (optional)</label>
        <textarea
          className={inp + ' min-h-[60px] resize-y'}
          value={spotlightData.pull_quote ?? ''}
          onChange={e => set('pull_quote', e.target.value)}
          placeholder="e.g. Together, we create the environment where every learner can thrive."
          rows={2}
        />
        <p className="text-[11px] text-teal-900/60 mt-1">If blank, the layout lifts the first blockquote from the body instead.</p>
      </div>

      {/* Sponsor management pointer */}
      <div className="rounded-md border border-teal-300 bg-white p-3 text-[11px] text-teal-900/80 flex items-start gap-2">
        <Info size={13} className="mt-0.5 shrink-0 text-teal-700" />
        <span>
          <strong>Sponsor</strong> is managed as an annual contract at{' '}
          <Link
            href="/admin/education-matters/sponsors"
            className="font-semibold text-teal-800 underline hover:text-teal-900"
          >
            /admin/education-matters/sponsors
          </Link>
          . Set it once per district for the contract period; every article in that district picks
          it up automatically based on publish date.
        </span>
      </div>
    </div>
  )
}
