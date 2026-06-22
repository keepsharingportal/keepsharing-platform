'use client'

// Onboarding Step — FAQ
// section_type='faq'. faqs[] of { question, answer }.

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { TextField, TextareaField } from './_shared'
import type { SectionStepProps } from './types'

interface FaqPair { question: string; answer: string }

export function FAQStep({ section, onSave }: SectionStepProps) {
  const headline   = (section?.headline ?? '') as string
  const savedFaqs  = (section?.faqs ?? []) as FaqPair[]
  const [list, setList] = useState<FaqPair[]>(savedFaqs)
  useEffect(() => setList(savedFaqs), [JSON.stringify(savedFaqs)]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit(next: FaqPair[]) {
    setList(next)
    onSave({ faqs: next })
  }
  function add()                       { commit([...list, { question: '', answer: '' }]) }
  function remove(i: number)           { commit(list.filter((_, ix) => ix !== i)) }
  function patch(i: number, p: Partial<FaqPair>) {
    const next = list.map((x, ix) => ix === i ? { ...x, ...p } : x)
    setList(next)
  }
  function fieldCommit()               { commit(list) }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Frequently asked</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The questions parents actually ask before booking. Answering
          them here saves you a hundred email replies.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Frequently Asked"
      />

      <div className="space-y-3">
        {list.map((q, i) => (
          <div key={i} className="bg-white border border-portal-border rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <TextField label="Question" value={q.question}
                  onCommit={v => { patch(i, { question: v }); fieldCommit() }}
                  placeholder="How far in advance should we book?" />
                <TextareaField label="Answer" rows={3} value={q.answer}
                  onCommit={v => { patch(i, { answer: v }); fieldCommit() }}
                  placeholder="For Saturdays, 4 – 8 weeks out." />
              </div>
              <button type="button" onClick={() => remove(i)}
                className="text-portal-red hover:text-portal-text shrink-0 mt-1">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-[11px] text-portal-muted italic">Nothing yet.</p>
        )}
      </div>
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-portal-blue border border-portal-blue/30 rounded hover:bg-portal-blue-lt">
        <Plus size={11} /> Add Q&A
      </button>
    </div>
  )
}
