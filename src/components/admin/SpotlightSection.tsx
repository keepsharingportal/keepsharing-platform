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

export interface QaPair { q: string; a: string }

interface Props {
  columnSlug:    string
  spotlightType: string
  spotlightData: Record<string, string>
  /** Structured Q&A pairs for Grands + Mom. Managed as its own state
   *  because Record<string,string> can't hold arrays. Merged into
   *  spotlight_data.qa_pairs on save by the parent page. */
  qaPairs?:      QaPair[]
  onTypeChange:  (v: string) => void
  onDataChange:  (v: Record<string, string>) => void
  onQaPairsChange?: (v: QaPair[]) => void
}

export function SpotlightSection({
  columnSlug, spotlightType, spotlightData, qaPairs, onTypeChange, onDataChange, onQaPairsChange,
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

          {/* Q&A Cards — the reliable authoring path for Grands + Mom.
              Each pair renders as a styled Q&A card verbatim, in this
              order. Eliminates the "did I bold the question" and
              "does this end in ?" guesswork of body parsing.
              Leaving this empty falls back to parsing the article body
              (backward compat for older articles). */}
          {(columnSlug === 'grands-greatest' || columnSlug === 'mom-to-mom') && onQaPairsChange && (
            <div className="border-t border-amber-900/20 pt-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                  Q&amp;A Cards
                </p>
                <button
                  type="button"
                  onClick={() => onQaPairsChange([...(qaPairs ?? []), { q: '', a: '' }])}
                  className="text-[11px] font-semibold text-amber-900 hover:text-amber-950 underline"
                >
                  + Add Q&amp;A
                </button>
              </div>
              <p className="text-[11px] text-amber-900/70 mb-3">
                Copy the question or prompt into the Q box, the answer into the A box.
                Renders as styled Q&amp;A cards on the article in this order — no formatting tricks needed.
              </p>
              <div className="space-y-3">
                {(qaPairs ?? []).map((pair, i) => (
                  <div key={i} className="rounded-md border border-amber-900/20 bg-white/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                        Q&amp;A #{i + 1}
                      </span>
                      <div className="flex items-center gap-2 text-[10px]">
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(qaPairs ?? [])]
                              ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                              onQaPairsChange(next)
                            }}
                            className="text-amber-900 hover:text-amber-950"
                          >↑ Up</button>
                        )}
                        {i < (qaPairs ?? []).length - 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(qaPairs ?? [])]
                              ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
                              onQaPairsChange(next)
                            }}
                            className="text-amber-900 hover:text-amber-950"
                          >↓ Down</button>
                        )}
                        <button
                          type="button"
                          onClick={() => onQaPairsChange((qaPairs ?? []).filter((_, idx) => idx !== i))}
                          className="text-red-700 hover:text-red-900"
                        >Remove</button>
                      </div>
                    </div>
                    <textarea
                      className={inp + ' font-semibold min-h-[36px] resize-y'}
                      value={pair.q}
                      onChange={e => onQaPairsChange((qaPairs ?? []).map((p, idx) => idx === i ? { ...p, q: e.target.value } : p))}
                      placeholder="Question or prompt (e.g. Jacqueline, tell us about your grandchildren.)"
                      rows={1}
                    />
                    <textarea
                      className={inp + ' min-h-[80px] resize-y'}
                      value={pair.a}
                      onChange={e => onQaPairsChange((qaPairs ?? []).map((p, idx) => idx === i ? { ...p, a: e.target.value } : p))}
                      placeholder="Answer (paragraph breaks preserved — hit Enter twice for a new paragraph)"
                      rows={3}
                    />
                  </div>
                ))}
                {(!qaPairs || qaPairs.length === 0) && (
                  <p className="text-[11px] text-amber-900/60 italic bg-white/40 rounded-md p-3">
                    No Q&amp;A pairs yet. Click <strong>+ Add Q&amp;A</strong> to build the interview one pair at a time,
                    or leave empty to let the parser detect Q&amp;A from the article body.
                  </p>
                )}
              </div>
            </div>
          )}

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
