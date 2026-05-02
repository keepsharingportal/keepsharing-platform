'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown } from 'lucide-react'
import type { ListingSection } from './types'

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left hover:text-primary transition-colors"
      >
        <span className="font-semibold text-foreground text-sm leading-snug">{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-4">
          {a}
        </p>
      )}
    </div>
  )
}

export function FAQSection({ section }: { section: ListingSection }) {
  const faqs = section.faqs ?? []
  if (!section.headline && faqs.length === 0) return null
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {section.headline && (
          <h3 className="text-xl font-bold text-foreground mb-2">{section.headline}</h3>
        )}
        {faqs.length > 0 && (
          <div className="mt-2">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.question} a={faq.answer} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
