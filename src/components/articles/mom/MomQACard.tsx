// MomQACard — single Q&A card for the Mom to Mom feature treatment.
// White background, blush border, large coral italic "Q." marker, navy
// uppercase question, blush divider, readable answer body.
//
// Accepts the answer as either a plain string OR pre-sanitized HTML
// (when piped through from MomBody) so links and inline formatting
// from the editor survive.

interface Props {
  question:   string
  /** Plain text OR sanitized HTML. When HTML, pass `answerIsHtml`. */
  answer:     string
  answerIsHtml?: boolean
}

export function MomQACard({ question, answer, answerIsHtml = false }: Props) {
  return (
    <article className="rounded-2xl border border-[#E8C9C6] bg-white p-5 shadow-[0_8px_24px_rgba(8,38,74,0.05)]">
      <div className="mb-3 flex items-start gap-3">
        <span className="font-serif text-3xl font-bold italic leading-none text-[#C96F73]">
          Q.
        </span>
        <h3 className="pt-1 text-base font-black uppercase tracking-[0.08em] text-[#08264A]">
          {question}
        </h3>
      </div>

      <div className="mb-4 h-px w-full bg-[#F1D8D5]" />

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
    </article>
  )
}
