// GrandsBody — renders the article body for Grands Are The Greatest using
// the magazine feature treatment:
//   - Intro paragraphs render as normal prose (with a navy drop cap)
//   - Q&A pairs render as a stack of QAFeatureCards under a small section heading
//   - The lead pull quote was already lifted into the GrandsFeatureHero so
//     it isn't re-rendered here

import sanitizeHtml from 'sanitize-html'
import { QAFeatureCard } from '@/components/articles/grands/QAFeatureCard'
import { parseGrandsBody } from '@/components/articles/grands/GrandsBodyParts'

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
}

export function GrandsBody({ body }: Props) {
  const safeHtml = sanitizeHtml(body, SANITIZE_OPTS)
  const { qaPairs, introParas } = parseGrandsBody(safeHtml)

  return (
    <div className="grands-article max-w-none">
      {/* Intro prose with brand-colored drop cap */}
      {introParas.length > 0 && (
        <div className="grands-intro" dangerouslySetInnerHTML={{ __html: introParas.join('') }} />
      )}

      {/* Q&A section as stacked feature cards */}
      {qaPairs.length > 0 && (
        <section className="mt-8 md:mt-10">
          <h2 className="mb-4 md:mb-5 text-sm font-black uppercase tracking-[0.18em] text-[#6F2C8F]">
            Q&amp;A with the Grand
          </h2>
          <div className="grid gap-5">
            {qaPairs.map((pair, i) => (
              <QAFeatureCard key={i} question={pair.question} answer={pair.answer} />
            ))}
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
