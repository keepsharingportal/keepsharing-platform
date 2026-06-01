// GrandsQAItem — single Q&A row in the open editorial Grands style.
// No white box / no card frame — just a lavender-circle icon, a serif
// deep-purple question, and the answer flowing below. Items are
// separated by a soft lavender divider rule (added by the parent).
//
// Hover: the icon circle flips from lavender bg + purple icon to
// purple bg + white icon — keeps the layout warm and inviting rather
// than feeling boxed-in like a Q&A FAQ.

import type { LucideIcon } from 'lucide-react'

interface Props {
  Icon:        LucideIcon
  question:    string
  answer:      string
  /** When true, `answer` is treated as sanitized HTML. */
  answerIsHtml?: boolean
}

export function GrandsQAItem({ Icon, question, answer, answerIsHtml = false }: Props) {
  return (
    <article className="group border-b border-[#E6D3EC] py-6 last:border-b-0">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4EAF7] text-[#6F2C8F] ring-1 ring-[#E6D3EC] transition group-hover:bg-[#6F2C8F] group-hover:text-white">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl font-bold leading-snug text-[#4B1768]">
            {question}
          </h3>
          {answerIsHtml ? (
            <div
              className="mt-3 text-base leading-relaxed text-slate-700 [&_p]:mb-3 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          ) : (
            <p className="mt-3 text-base leading-relaxed text-slate-700">
              {answer}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
