// MomBody — renders the Mom to Mom article body in the feature
// treatment:
//   1. Intro paragraphs as normal prose with a coral drop cap
//   2. Q&A pairs as a stack of MomQACards under a centered "Her Story"
//      section header (heart + hairlines flanking the subject name)
//   3. Rapid Fire section as a separate cream/blush card grid
//
// The lead pull quote was already lifted into MomPullQuote upstream so
// it doesn't render here.

import sanitizeHtml from 'sanitize-html'
import { Heart }         from 'lucide-react'
import { MomQACard }     from '@/components/articles/mom/MomQACard'
import { MomRapidFire }  from '@/components/articles/mom/MomRapidFire'
import { parseMomBody }  from '@/components/articles/mom/MomBodyParts'

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
  /** Subject's name (e.g. "Phyllis Palmer") — drives the Q&A section
   *  header ("Phyllis Palmer: Her Story"). When omitted, the heading
   *  falls back to a generic "Q&A". */
  subjectName?: string | null
  /** Structured Q&A pairs from spotlight_data.qa_pairs. When set (and
   *  non-empty) they render as the MomQACards VERBATIM — no body
   *  parsing, no heuristics. Canonical authoring path going forward;
   *  body parsing stays as backward compat for older content. */
  structuredPairs?: Array<{ q: string; a: string }> | null
}

function paragraphize(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

export function MomBody({ body, subjectName, structuredPairs }: Props) {
  const safeHtml = sanitizeHtml(body, SANITIZE_OPTS)
  const parsed   = parseMomBody(safeHtml)
  const { introParas, rapidFireItems } = parsed

  const cleanedStructured = (structuredPairs ?? [])
    .filter(p => (p.q?.trim() || p.a?.trim()))
  const qaPairs = cleanedStructured.length > 0
    ? cleanedStructured.map(p => ({
        question: p.q.trim(),
        answer:   paragraphize(p.a),
      }))
    : parsed.qaPairs

  const sectionTitle = subjectName?.trim()
    ? `${subjectName.trim()}: Her Story`
    : 'Q&A'

  return (
    <div className="mom-article max-w-none">
      {introParas.length > 0 && (
        <div className="mom-intro" dangerouslySetInnerHTML={{ __html: introParas.join('') }} />
      )}

      {qaPairs.length > 0 && (
        <section className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#E8C9C6]" />
            <h2 className="font-serif text-xl font-bold text-[#08264A] sm:text-2xl">
              {sectionTitle}
            </h2>
            <Heart className="h-5 w-5 text-[#C96F73]" strokeWidth={2.2} />
            <span className="h-px flex-1 bg-[#E8C9C6]" />
          </div>
          <div className="grid gap-4">
            {qaPairs.map((pair, i) => {
              const question = pair.question.replace(/<[^>]+>/g, '').trim()
              return (
                <MomQACard
                  key={i}
                  question={question}
                  answer={pair.answer}
                  answerIsHtml
                />
              )
            })}
          </div>
        </section>
      )}

      <MomRapidFire items={rapidFireItems} />

      <style>{`
        .mom-article .mom-intro p {
          color: #08264A;
          font-size: 1.05rem;
          line-height: 1.75;
          margin-bottom: 1.1rem;
        }
        @media (min-width: 768px) {
          .mom-article .mom-intro p { font-size: 1.125rem; }
        }
        .mom-article .mom-intro p:first-of-type::first-letter {
          float: left;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 4.5rem;
          font-weight: 900;
          line-height: 0.85;
          padding: 0.35rem 0.85rem 0 0;
          margin: 0.4rem 0 0 0;
          color: #C96F73;
        }
        @media (min-width: 768px) {
          .mom-article .mom-intro p:first-of-type::first-letter {
            font-size: 5.25rem;
            padding: 0.4rem 1rem 0 0;
            margin: 0.5rem 0 0 0;
          }
        }
      `}</style>
    </div>
  )
}
