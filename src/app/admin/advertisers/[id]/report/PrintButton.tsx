'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      type="button"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 print:hidden"
    >
      <Printer size={12} /> Print / Save as PDF
    </button>
  )
}
