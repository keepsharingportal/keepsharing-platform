// Pure coercion helpers shared by the CSV import endpoint and the
// import modal's mapping preview. Server uses these to normalize CSV
// strings into the values the DB CHECK constraints accept; client
// uses them to show '→ coerced' next to each sample value so the
// editor sees what every cell will become before committing.
//
// Every function takes an unknown (raw CSV cell) and returns either
// a validated typed value or null / a default. Verbose names so the
// import endpoint's payload is self-documenting.

// Sizes allowed by migration 129's CHECK constraint, ordered so
// snap-to-nearest picks the closest legal value (biggest first means
// when distance ties we round up — closer to magazine practice of
// 'I asked for 1/4 page, got something just over').
const ALLOWED_SIZES: number[] = [1, 0.66, 0.5, 0.33, 0.25, 0.16, 0.12]

const SIZE_WORDS: Record<string, number> = {
  // Full
  'full': 1, 'fullpage': 1, 'fullpg': 1, 'whole': 1, 'wholepage': 1,
  // 2/3
  'twothirds': 0.66, 'twothird': 0.66, '2thirds': 0.66, '23': 0.66,
  // Half
  'half': 0.5, 'halfpage': 0.5, 'halfpg': 0.5, '12': 0.5,
  // Third
  'third': 0.33, 'thirdpage': 0.33, 'onethird': 0.33, '13': 0.33,
  // Quarter
  'quarter': 0.25, 'qtr': 0.25, 'quarterpage': 0.25, 'onefourth': 0.25, 'fourth': 0.25, '14': 0.25,
  // Sixth
  'sixth': 0.16, 'onesixth': 0.16, '16': 0.16,
  // Eighth
  'eighth': 0.12, 'eight': 0.12, 'oneeighth': 0.12, '18': 0.12,
}

export function coerceSize(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return snapToAllowed(v)
  const raw = String(v ?? '').trim()
  if (!raw) return 0.25                                  // sensible default
  // Try the word table first (handles 'Quarter', 'Half Page', '1/4').
  const wordKey = raw.toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (wordKey in SIZE_WORDS) return SIZE_WORDS[wordKey]
  // Try numeric parse (handles '0.25', '.5', '1.0').
  const n = Number(raw.replace(/[^0-9.]/g, ''))
  if (Number.isFinite(n) && n > 0) return snapToAllowed(n)
  return 0.25
}

// Snap a freeform decimal to the closest allowed size. Used after
// numeric parse so e.g. '0.501' lands on 0.5 instead of failing the
// DB CHECK. Distance tiebreak is unnecessary because ALLOWED_SIZES
// elements are far enough apart.
function snapToAllowed(n: number): number {
  let best = ALLOWED_SIZES[0]
  let bestDist = Math.abs(n - best)
  for (const s of ALLOWED_SIZES) {
    const d = Math.abs(n - s)
    if (d < bestDist) { best = s; bestDist = d }
  }
  return best
}

export function coerceBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (v == null) return false
  const s = String(v).trim().toLowerCase()
  return s !== '' && s !== 'no' && s !== 'false' && s !== '0' && s !== '—' && s !== 'n'
}

export function coerceMoney(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(String(v).replace(/[$,]/g, '').trim())
  return Number.isFinite(n) ? n : null
}

export function coerceDesign(v: unknown): 'new' | 'pickup' {
  // Editor CSVs use 'New' / 'Pick-up' / 'Pickup'. Fold all variants:
  // strip non-alphanumerics, lowercase, look for the word 'new'.
  const s = String(v ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '')
  if (s === 'new' || s.startsWith('new')) return 'new'
  return 'pickup'                                       // safe historical default
}

export function coerceLayout(v: unknown): 'horizontal' | 'vertical' | 'square' | null {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return null
  // Word + prefix matching catches H/V/S single letters and 'horiz' / 'vert' / 'sq'.
  if (s === 'h' || s.startsWith('horiz')) return 'horizontal'
  if (s === 'v' || s.startsWith('vert'))  return 'vertical'
  if (s === 's' || s.startsWith('sq'))    return 'square'
  return null
}

export function coerceStatus(v: unknown): boolean {
  // is_ongoing is TRUE (every-month sponsor) unless the CSV row signals
  // 'this one needs verifying each issue' via a check/sporadic marker.
  const s = String(v ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '')
  if (!s) return true
  if (s.startsWith('check') || s === 'sporadic' || s === 'verify' || s === 'x' || s === 'n' || s === 'no') return false
  return true                                            // ongoing for blank / 'y' / 'yes' / 'ok' / etc.
}

// Convert freeform date-ish strings into YYYY-MM. Accepts:
//   '2026-07', '2026/07', '07/2026', '7/26', 'Jul 2026', 'July 26', etc.
// Returns null when the input doesn't resolve to a valid year+month.
export function coerceExpires(v: unknown): string | null {
  const raw = String(v ?? '').trim()
  if (!raw) return null

  // 1. Direct YYYY-MM (or YYYY/MM) — the canonical case.
  const direct = raw.match(/^([12][0-9]{3})[-/](0?[1-9]|1[0-2])$/)
  if (direct) return `${direct[1]}-${direct[2].padStart(2, '0')}`

  // 2. MM/YYYY or M/YYYY (US style).
  const us = raw.match(/^(0?[1-9]|1[0-2])[-/]([12][0-9]{3})$/)
  if (us) return `${us[2]}-${us[1].padStart(2, '0')}`

  // 3. M/YY — e.g. '7/26' (treat 00-69 as 2000s, 70-99 as 1900s; magazine
  //    audit windows never need pre-1970, so the cutoff is conservative).
  const shortUs = raw.match(/^(0?[1-9]|1[0-2])[-/]([0-9]{2})$/)
  if (shortUs) {
    const yy = parseInt(shortUs[2], 10)
    const yyyy = yy < 70 ? 2000 + yy : 1900 + yy
    return `${yyyy}-${shortUs[1].padStart(2, '0')}`
  }

  // 4. 'Mon YYYY' / 'Month YYYY' (e.g. 'Jul 2026', 'July 2026').
  const monthYear = raw.match(/^([a-zA-Z]+)\s+([12][0-9]{3})$/)
  if (monthYear) {
    const m = monthIndex(monthYear[1])
    if (m != null) return `${monthYear[2]}-${String(m + 1).padStart(2, '0')}`
  }

  // 5. 'Mon YY' (e.g. 'Jul 26').
  const monthYY = raw.match(/^([a-zA-Z]+)\s+([0-9]{2})$/)
  if (monthYY) {
    const m = monthIndex(monthYY[1])
    if (m != null) {
      const yy = parseInt(monthYY[2], 10)
      const yyyy = yy < 70 ? 2000 + yy : 1900 + yy
      return `${yyyy}-${String(m + 1).padStart(2, '0')}`
    }
  }

  return null
}

function monthIndex(name: string): number | null {
  const lookup: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  }
  const k = name.trim().toLowerCase()
  return k in lookup ? lookup[k] : null
}
