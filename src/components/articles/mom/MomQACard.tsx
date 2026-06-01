// MomQACard — single Q&A "question block" for Mom to Mom. White card,
// blush border, soft shadow. The Q. marker lives in a blush-tint circle
// at the top-left; the question reads in navy serif, then a faint blush
// divider, then the answer body. Hover lifts the shadow slightly.
//
// Accepts the answer as either a plain string OR pre-sanitized HTML so
// links and inline formatting from the editor survive when MomBody
// pipes parsed paragraphs through.

interface Props {
  question:      string
  answer:        string
  /** When true, `answer` is treated as sanitized HTML. */
  answerIsHtml?: boolean
}

export function MomQACard({ question, answer, answerIsHtml = false }: Props) {
  return (
    <article className="group rounded-2xl border border-[#E8C9C6] bg-white p-5 shadow-[0_8px_24px_rgba(8,38,74,0.05)] transition hover:shadow-[0_12px_30px_rgba(8,38,74,0.08)] md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FCF4F2] text-[#C96F73] ring-1 ring-[#E8C9C6]">
          <span className="font-serif text-2xl font-bold italic leading-none">
            Q.
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-bold leading-snug text-[#08264A] md:text-xl">
            {question}
          </h3>

          <div className="my-3 h-px w-full bg-[#F1D8D5]" />

          {answerIsHtml ? (
            <div
              className="text-base leading-relaxed text-slate-700 [&_p]:mb-3 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: answer }}
            />
          ) : (
            <p className="text-base leading-relaxed text-slate-700">
              {answer}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
