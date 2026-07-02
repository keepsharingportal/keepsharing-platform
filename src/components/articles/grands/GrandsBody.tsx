// GrandsBody — renders the article body in the Grands magazine feature
// treatment:
//   1. Intro prose with a purple drop cap (the lede before any Q&A)
//   2. Q&A section — cream wrapper, gold+lavender eyebrow rule, h2 with
//      the subject's name + "Grand Story", then a stack of GrandsQAItems
//      with the open editorial layout (icon + serif question + answer,
//      no white cards)
//   3. AGrandMoment break — inserted at the position where the editor
//      placed an <h3>A Grand Moment</h3> in the body
//
// Icons cycle through a Grands-appropriate rotation since staff content
// doesn't carry per-question icon hints. The lead pull quote is lifted
// upstream into GrandsPullQuote so it doesn't re-render here.

import type { LucideIcon } from 'lucide-react'
import sanitizeHtml from 'sanitize-html'
import {
  Baby, BookOpen, Heart, Home, Sparkles, Users,
  Calendar, Camera, Gift, MapPin, Music, Smile, Star, Sun,
} from 'lucide-react'
import { GrandsQAItem } from '@/components/articles/grands/GrandsQAItem'
import { AGrandMoment } from '@/components/articles/grands/AGrandMoment'
import { parseGrandsBody } from '@/components/articles/grands/GrandsBodyParts'

const QA_ICON_ROTATION: LucideIcon[] = [
  Baby, Heart, Home, BookOpen, Users, Sparkles,
]

// Editor-controlled icon override. When a question starts with
// `[name]`, the parser captures `name` here and we look it up in this
// map. Misses fall through to the index rotation, so a typo never
// breaks the page — it just gets the auto-rotated icon instead. Keys
// are lowercase; common aliases are mapped to the same icon so
// `[book]` and `[bookopen]` both work.
const ICON_BY_HINT: Record<string, LucideIcon> = {
  baby:       Baby,
  heart:      Heart,
  home:       Home,
  family:     Home,
  book:       BookOpen,
  bookopen:   BookOpen,
  books:      BookOpen,
  reading:    BookOpen,
  users:      Users,
  kids:       Users,
  grandkids:  Users,
  sparkles:   Sparkles,
  sparkle:    Sparkles,
  magic:      Sparkles,
  calendar:   Calendar,
  years:      Calendar,
  camera:     Camera,
  photo:      Camera,
  gift:       Gift,
  tradition:  Gift,
  traditions: Gift,
  map:        MapPin,
  pin:        MapPin,
  place:      MapPin,
  music:      Music,
  smile:      Smile,
  joy:        Smile,
  star:       Star,
  sun:        Sun,
}

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'span', 'div',
    'h2', 'h3', 'h4',
    'strong', 'em', 'b', 'i', 'u', 's',
    'a', 'ul', 'ol', 'li',
    'blockquote', 'figure', 'figcaption', 'img',
    'hr',
  ],
  allowedAttributes: {
    '*': ['class', 'style'],
    a:   ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: true,
}

interface Props {
  body: string
  /** Subject's first name(s) — drives the Q&A section h2
   *  ("Debbie's Grand Story"). When omitted, the heading falls back to
   *  "Their Grand Story". */
  subjectName?: string | null
  /** Structured Q&A pairs from spotlight_data.qa_pairs. When set (and
   *  non-empty) they render as the Q&A cards VERBATIM — no body parsing,
   *  no heuristic detection, no wondering whether the editor bolded the
   *  right thing. This is the new canonical authoring path for Grands
   *  articles; body parsing stays as backward compat for older content. */
  structuredPairs?: Array<{ q: string; a: string }> | null
}

function possessive(name: string): string {
  if (/s$/i.test(name)) return `${name}’`
  return `${name}’s`
}

// Convert plain-text answer to minimal HTML so paragraph breaks render.
// Structured Q&A comes in as newline-separated text; the QAItem component
// expects HTML for its answer content.
function paragraphize(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

export function GrandsBody({ body, subjectName, structuredPairs }: Props) {
  const safeHtml = sanitizeHtml(body, SANITIZE_OPTS)
  const parsed   = parseGrandsBody(safeHtml)
  const { introParas, grandMoment } = parsed

  // Structured pairs win when set. Falls back to body-parsed pairs
  // (the legacy path — still works for every existing article).
  const cleanedStructured = (structuredPairs ?? [])
    .filter(p => (p.q?.trim() || p.a?.trim()))
  const qaPairs = cleanedStructured.length > 0
    ? cleanedStructured.map(p => ({
        question: p.q.trim(),
        answer:   paragraphize(p.a),
        iconHint: null as string | null,
      }))
    : parsed.qaPairs

  const trimmedName = subjectName?.trim() ?? ''
  const sectionTitle = trimmedName
    ? `${possessive(trimmedName)} Grand Story`
    : 'Their Grand Story'

  return (
    <div className="grands-article max-w-none">
      {introParas.length > 0 && (
        <div className="grands-intro" dangerouslySetInnerHTML={{ __html: introParas.join('') }} />
      )}

      {qaPairs.length > 0 && (
        <section className="mt-10 rounded-3xl bg-[#FFFDF8] px-5 py-6 md:px-7 md:py-8">
          {/* Section eyebrow — gold accent stub keeps the spotlight system
              recognizable; long lavender rule extends to the right edge. */}
          <div className="mb-2 flex items-center gap-3">
            <span className="h-px w-10 bg-[#F4C21B]" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6F2C8F]">
              Q&amp;A with the Grand
            </p>
            <span className="h-px flex-1 bg-[#E6D3EC]" />
          </div>

          <h2 className="font-serif text-3xl font-bold leading-tight text-[#08264A]">
            {sectionTitle}
          </h2>

          <div className="mt-4">
            {qaPairs.map((pair, i) => {
              // Editor hint wins when present; otherwise auto-rotate so
              // a brand-new article with no hints still gets varied
              // icons every month with zero staff effort.
              const hintedIcon = pair.iconHint ? ICON_BY_HINT[pair.iconHint] : null
              const Icon = hintedIcon ?? QA_ICON_ROTATION[i % QA_ICON_ROTATION.length]
              const question = pair.question.replace(/<[^>]+>/g, '').trim()
              return (
                <div key={i}>
                  <GrandsQAItem
                    Icon={Icon}
                    question={question}
                    answer={pair.answer}
                    answerIsHtml
                  />
                  {grandMoment && grandMoment.afterQAIndex === i && (
                    <AGrandMoment text={grandMoment.text} />
                  )}
                </div>
              )
            })}
            {/* If the editor placed the marker before any Q&A (afterQAIndex
                = -1), render the moment at the very top of the section. */}
            {grandMoment && grandMoment.afterQAIndex === -1 && (
              <AGrandMoment text={grandMoment.text} />
            )}
          </div>
        </section>
      )}

      <style>{`
        .grands-article .grands-intro p {
          color: #08264A;
          font-size: 1.05rem;
          line-height: 1.75;
          margin-bottom: 1.1rem;
        }
        @media (min-width: 768px) {
          .grands-article .grands-intro p { font-size: 1.125rem; }
        }
        .grands-article .grands-intro p:first-of-type::first-letter {
          float: left;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 4.5rem;
          font-weight: 900;
          line-height: 0.85;
          padding: 0.35rem 0.85rem 0 0;
          margin: 0.4rem 0 0 0;
          color: #6F2C8F;
        }
        @media (min-width: 768px) {
          .grands-article .grands-intro p:first-of-type::first-letter {
            font-size: 5.25rem;
            padding: 0.4rem 1rem 0 0;
            margin: 0.5rem 0 0 0;
          }
        }
      `}</style>
    </div>
  )
}
