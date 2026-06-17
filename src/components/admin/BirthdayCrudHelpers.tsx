// Shared UI primitives for the Birthday admin CRUDs. Keeps each
// individual admin page small + consistent.

'use client'

import { Trash2, Loader2 } from 'lucide-react'

export function CrudInput({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <p className="text-[10px] text-portal-sub mb-1">{hint}</p>}
      <input
        {...props}
        className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
      />
    </div>
  )
}

export function CrudTextarea({ label, hint, ...props }: { label: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <p className="text-[10px] text-portal-sub mb-1">{hint}</p>}
      <textarea
        {...props}
        className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue resize-vertical"
      />
    </div>
  )
}

export function CrudSelect({ label, hint, options, ...props }: { label: string; hint?: string; options: Array<{ value: string; label: string }> } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <p className="text-[10px] text-portal-sub mb-1">{hint}</p>}
      <select {...props}
        className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function CrudActiveToggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
        active ? 'bg-portal-green-lt text-portal-green' : 'bg-portal-bg text-portal-sub'
      }`}
    >{active ? 'active' : 'paused'}</button>
  )
}

export function CrudDeleteButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="text-portal-red hover:text-portal-text disabled:opacity-50">
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
    </button>
  )
}

export const BRAND_OPTIONS = [
  { value: '',         label: 'All brands' },
  { value: 'rrp',      label: 'RRP' },
  { value: 'rr50plus', label: 'River Region 50+' },
  { value: 'aop',      label: 'AOP' },
  { value: 'mbp',      label: 'MBP' },
  { value: 'esp',      label: 'ESP' },
  { value: 'gpp',      label: 'GPP' },
]
