// QAFeatureCard — clean white card holding one Q&A pair. Bold deep-purple
// question on top, body-tone slate answer below. Used by GrandsQASection
// to render a stack of cards instead of a long uninterrupted article.

interface Props {
  question: string
  answer:   string
}

export function QAFeatureCard({ question, answer }: Props) {
  return (
    <article className="rounded-2xl border border-[#E8D8EE] bg-white p-5 shadow-[0_8px_24px_rgba(75,23,104,0.06)]">
      <h3
        className="mb-3 text-base font-black leading-snug text-[#4B1768]"
        dangerouslySetInnerHTML={{ __html: question }}
      />
      <div
        className="text-base leading-relaxed text-slate-700 [&_p]:mb-2 [&_p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: answer }}
      />
    </article>
  )
}
