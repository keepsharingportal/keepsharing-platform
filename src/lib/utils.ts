import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatSize(size: number): string {
  const labels: Record<number, string> = {
    0.12: '1/8 Page',
    0.16: '1/6 Page',
    0.25: '1/4 Page',
    0.33: '1/3 Page',
    0.5: '1/2 Page',
    0.66: '2/3 Page',
    1: 'Full Page',
    2: '2-Pg Spread',
  }
  return labels[size] ?? `${size}pg`
}

export function issueLabel(issue: string): string {
  // "RRP MAR26" → "RRP · March 2026"
  const parts = issue.split(' ')
  if (parts.length !== 2) return issue
  const [pub, monthYear] = parts
  const monthAbbrevs: Record<string, string> = {
    JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April',
    MAY: 'May', JUN: 'June', JUL: 'July', AUG: 'August',
    SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December',
  }
  const mon = monthYear.slice(0, 3)
  const yr = monthYear.slice(3)
  return `${pub} · ${monthAbbrevs[mon] ?? mon} 20${yr}`
}

export function nextIssue(issue: string): string {
  const parts = issue.split(' ')
  if (parts.length !== 2) return issue
  const [pub, monthYear] = parts
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const mon = monthYear.slice(0, 3)
  const yr = parseInt(monthYear.slice(3), 10)
  const idx = months.indexOf(mon)
  if (idx === -1) return issue
  const nextIdx = (idx + 1) % 12
  const nextYr = nextIdx === 0 ? yr + 1 : yr
  return `${pub} ${months[nextIdx]}${String(nextYr).padStart(2, '0')}`
}
