// MomBody — renders the Mom to Mom article body in the magazine feature
// treatment:
//   - Intro paragraphs render as normal prose with a coral drop cap
//   - Q&A pairs render as a stack of MomQACards under a small heading
//   - The lead pull quote was already lifted into MomPullQuote so it
//     isn't re-rendered here

import sanitizeHtml from 'sanitize-html'
import { MomQACard }   from '@/components/articles/mom/MomQACard'
import { parseMomBody } from '@/components/articles/mom/MomBodyParts'

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

export function MomBody({ body }: Props) {
  const safeHtml = sanitizeHtml(body, SANITIZE_OPTS)
  const { qaPairs, introParas } = parseMomBody(safeHtml)

  return (
    <div className="mom-article max-w-none">
      {/* Intro prose with a coral drop cap */}
      {introParas.length > 0 && (
        <div className="mom-intro" dangerouslySetInnerHTML={{ __html: introParas.join('') }} />
      )}

      {/* Q&A section as stacked feature cards */}
      {qaPairs.length > 0 && (
        <section className="mt-8 md:mt-10">
          <h2 className="mb-4 md:mb-5 text-sm font-black uppercase tracking-[0.18em] text-[#C96F73]">
            Q&amp;A with this Mom
          </h2>
          <div className="grid gap-5">
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
