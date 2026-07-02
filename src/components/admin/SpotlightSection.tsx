'use client'

// ── SpotlightSection ─────────────────────────────────────────────────────────
// Shared editor for any column that opts into structured spotlights — Play
// Ball (Athlete / Coach / Volunteer), Teacher of the Month, Mom to Mom.
// The type dropdown filters its options by column so editors only see
// relevant choices.
//
// Used by both /admin/articles/new and /admin/articles/[id]/edit so the
// spotlight fields appear on first-create as well as subsequent edits.

import {
  getSpotlightTemplate, getSpotlightOptionsForColumn,
} from '@/lib/articles/spotlight-templates'
import { HelpTip } from '@/components/admin/AdminHelp'

interface Props {
  columnSlug:    string
  spotlightType: string
  spotlightData: Record<string, string>
  onTypeChange:  (v: string) => void
  onDataChange:  (v: Record<string, string>) => void
}

export function SpotlightSection({
  columnSlug, spotlightType, spotlightData, onTypeChange, onDataChange,
}: Props) {
  const tpl     = getSpotlightTemplate(spotlightType || null)
  const options = getSpotlightOptionsForColumn(columnSlug)
  const sel     = 'block w-full text-sm rounded-lg border border-portal-border px-3 py-2 outline-none focus:border-portal-blue bg-white'
  const inp     = 'block w-full text-sm rounded-lg border border-portal-border px-3 py-2 outline-none focus:border-portal-blue bg-white'

  // Column-aware section label + emoji so each spotlight feels native.
  // NOTE: Teacher column slug is 'teacher-of-month' (no "the") to match
  // content-taxonomy.ts. Earlier this was 'teacher-of-the-month' and the
  // Teacher admin heading silently fell back to "Community Spotlight".
  const heading =
    columnSlug === 'play-ball'          ? '🏆 Play Ball Spotlight'
    : columnSlug === 'teacher-of-month' ? '🍎 Teacher of the Month'
    : columnSlug === 'mom-to-mom'       ? '💗 Mom to Mom Spotlight'
    : columnSlug === 'grands-greatest'  ? '💛 Grands Are the Greatest'
    :                                     'Community Spotlight'

  // Column-aware label + placeholder for the Featured Name field.
  // The article render uses this as the FIRST source for the section
  // header ("Debbie's Grand Story", "Phyllis Palmer: Her Story", etc.)
  // so an editor never has to hope the parser derives the right name
  // from the title. Falls back to title-before-colon / nickname /
  // author_name only when this field is blank.
  const subjectLabel =
    columnSlug === 'play-ball'          ? 'Featured Athlete / Coach / Volunteer'
    : columnSlug === 'teacher-of-month' ? 'Featured Teacher'
    : columnSlug === 'mom-to-mom'       ? 'Featured Mom'
    : columnSlug === 'grands-greatest'  ? 'Featured Grandparent'
    :                                     'Featured Person'
  const subjectPlaceholder =
    columnSlug === 'play-ball'          ? 'e.g. Harper Loves'
    : columnSlug === 'teacher-of-month' ? 'e.g. Beth Noble'
    : columnSlug === 'mom-to-mom'       ? 'e.g. Phyllis Palmer'
    : columnSlug === 'grands-greatest'  ? 'e.g. Jacqueline Fortson (or nickname like "Me Me")'
    :                                     'Featured person name'

  function setValue(key: string, value: string) {
    onDataChange({ ...spotlightData, [key]: value })
  }

  return (
    <div className="rounded-lg border border-portal-amber/30 bg-portal-amber-lt/40 p-4 space-y-4">
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
          {heading}
          <HelpTip text="When set, the article shows a magazine-style top strip + brand-colored eyebrow. Each spotlight type has its own field set." />
        </label>
        <select className={sel} value={spotlightType} onChange={e => onTypeChange(e.target.value)}>
          <option value="">— Regular article (no spotlight) —</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-[11px] text-amber-900/70 mt-1">
          When set, the article shows a magazine-style top strip{tpl && tpl.quickHits.length > 0 ? ' + Quick Hits sidebar' : ''}.
        </p>
      </div>

      {tpl && (
        <>
          {/* Featured Name — canonical place to record who the
              spotlight is about. Grands uses it as the Q&A section
              header ("Debbie's Grand Story"); Mom to Mom uses it for
              the "[Name]: Her Story" header. Teacher / Play Ball
              currently key off the article title on the hero but
              storing the name here means we can wire it into more
              places (SEO metadata, sidebar bio, cross-promo) without
              chasing editors down every time. */}
          <div>
            <label className="block text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1.5">
              {subjectLabel}
            </label>
            <input
              className={inp}
              value={spotlightData.subject_name ?? ''}
              onChange={e => setValue('subject_name', e.target.value)}
              placeholder={subjectPlaceholder}
            />
            <p className="text-[11px] text-amber-900/70 mt-1">
              {columnSlug === 'grands-greatest'
                ? `Renders as the Q&A section header — e.g. "${spotlightData.subject_name?.trim() || 'Name'}'s Grand Story".`
                : columnSlug === 'mom-to-mom'
                ? `Renders as the Q&A section header — e.g. "${spotlightData.subject_name?.trim() || 'Name'}: Her Story".`
                : columnSlug === 'teacher-of-month'
                ? 'Recorded for SEO + cross-promo. The article title still leads on the hero.'
                : 'Recorded for SEO + cross-promo. The article title still leads on the hero.'}
              {' '}Optional; falls back to the article title.
            </p>
          </div>

          {/* Top Strip vitals */}
          <div>
            <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-2">
              {tpl.topStrip.length === 4 ? 'Top Strip (4 vitals)' : 'Top Strip (5 vitals)'}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {tpl.topStrip.map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-semibold text-portal-sub mb-0.5">{f.label}</label>
                  <input
                    className={inp}
                    value={spotlightData[f.key] ?? ''}
                    onChange={e => setValue(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Hits Q&A — only when the template defines them (Play Ball). */}
          {tpl.quickHits.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-2">Quick Hits (Q&A sidebar)</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {tpl.quickHits.map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-semibold text-portal-sub mb-0.5">{f.label}</label>
                    <textarea
                      className={inp + ' min-h-[60px] resize-y'}
                      value={spotlightData[f.key] ?? ''}
                      onChange={e => setValue(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
