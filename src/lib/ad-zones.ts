// Ad zone definitions, pricing, and visual layout positions
// Positions are expressed as percentages of the page container

export type ZoneType = 'print' | 'web'
export type PrintZoneId =
  | 'full_page' | 'ifc' | 'ibc' | 'bc'
  | 'half_h_top' | 'half_h_bot' | 'half_v_left' | 'half_v_right'
  | 'third_top' | 'third_mid' | 'third_bot'
  | 'quarter_tl' | 'quarter_tr' | 'quarter_bl' | 'quarter_br'
  | 'sixth_1' | 'sixth_2' | 'sixth_3' | 'sixth_4' | 'sixth_5' | 'sixth_6'
  | 'eighth_1' | 'eighth_2' | 'eighth_3' | 'eighth_4'
  | 'eighth_5' | 'eighth_6' | 'eighth_7' | 'eighth_8'

export type WebZoneId =
  | 'header_leaderboard' | 'article_inline_top' | 'article_inline_mid'
  | 'article_inline_bot' | 'guide_sidebar' | 'email_banner'

export type ZoneId = PrintZoneId | WebZoneId

// Print zone visual layout (percentages within a 8.375×10.875 page container)
// Each zone: { x, y, w, h } as percentage
type VisualPos = { x: number; y: number; w: number; h: number }

const P = 4  // page margin %

export type PrintZoneDef = {
  id: PrintZoneId
  displayName: string
  shortName: string
  price: number           // per month
  dimensions: string
  page: 'premium' | 'interior'
  pos: VisualPos          // layout position in page preview
  groupLabel: string      // pricing group name
}

export type WebZoneDef = {
  id: WebZoneId
  displayName: string
  shortName: string
  price: number
  dimensions: string
  placement: string
  description: string
}

export const PRINT_ZONES: PrintZoneDef[] = [
  // Premium positions (shown on dedicated page panels)
  { id: 'bc',       displayName: 'Back Cover',           shortName: 'BC',    price: 625, dimensions: '8.375 × 10.875"', page: 'premium',  pos: { x:0, y:0, w:100, h:100 }, groupLabel: 'Back Cover' },
  { id: 'ifc',      displayName: 'Inside Front Cover',   shortName: 'IFC',   price: 575, dimensions: '8.375 × 10.875"', page: 'premium',  pos: { x:0, y:0, w:100, h:100 }, groupLabel: 'Inside Front Cover' },
  { id: 'ibc',      displayName: 'Inside Back Cover',    shortName: 'IBC',   price: 575, dimensions: '8.375 × 10.875"', page: 'premium',  pos: { x:0, y:0, w:100, h:100 }, groupLabel: 'Inside Back Cover' },
  { id: 'full_page',displayName: 'Full Page',            shortName: 'Full',  price: 480, dimensions: '8.375 × 10.875"', page: 'premium',  pos: { x:0, y:0, w:100, h:100 }, groupLabel: 'Full Page' },

  // Interior page zones
  { id: 'half_h_top',   displayName: 'Half Page Horizontal (Top)',    shortName: '½ H Top', price: 285, dimensions: '8.375 × 5.25"',  page: 'interior', pos: { x:P, y:P, w:100-P*2, h:46-P }, groupLabel: 'Half Page' },
  { id: 'half_h_bot',   displayName: 'Half Page Horizontal (Bottom)', shortName: '½ H Bot', price: 285, dimensions: '8.375 × 5.25"',  page: 'interior', pos: { x:P, y:54, w:100-P*2, h:42 }, groupLabel: 'Half Page' },
  { id: 'half_v_left',  displayName: 'Half Page Vertical (Left)',     shortName: '½ V L',   price: 285, dimensions: '4.0625 × 10.875"', page: 'interior', pos: { x:P, y:P, w:44-P, h:100-P*2 }, groupLabel: 'Half Page' },
  { id: 'half_v_right', displayName: 'Half Page Vertical (Right)',    shortName: '½ V R',   price: 285, dimensions: '4.0625 × 10.875"', page: 'interior', pos: { x:54, y:P, w:42, h:100-P*2 }, groupLabel: 'Half Page' },

  { id: 'third_top', displayName: 'Third Page (Top)',    shortName: '⅓ Top', price: 240, dimensions: '8.375 × 3.5"',   page: 'interior', pos: { x:P, y:P, w:100-P*2, h:30-P }, groupLabel: 'Third Page' },
  { id: 'third_mid', displayName: 'Third Page (Middle)', shortName: '⅓ Mid', price: 240, dimensions: '8.375 × 3.5"',   page: 'interior', pos: { x:P, y:36, w:100-P*2, h:28 }, groupLabel: 'Third Page' },
  { id: 'third_bot', displayName: 'Third Page (Bottom)', shortName: '⅓ Bot', price: 240, dimensions: '8.375 × 3.5"',   page: 'interior', pos: { x:P, y:68, w:100-P*2, h:28 }, groupLabel: 'Third Page' },

  { id: 'quarter_tl', displayName: 'Quarter Page (Top Left)',     shortName: '¼ TL', price: 175, dimensions: '4.0625 × 5.25"', page: 'interior', pos: { x:P, y:P, w:44-P, h:44-P }, groupLabel: 'Quarter Page' },
  { id: 'quarter_tr', displayName: 'Quarter Page (Top Right)',    shortName: '¼ TR', price: 175, dimensions: '4.0625 × 5.25"', page: 'interior', pos: { x:54, y:P, w:42, h:44-P }, groupLabel: 'Quarter Page' },
  { id: 'quarter_bl', displayName: 'Quarter Page (Bottom Left)',  shortName: '¼ BL', price: 175, dimensions: '4.0625 × 5.25"', page: 'interior', pos: { x:P, y:54, w:44-P, h:42 }, groupLabel: 'Quarter Page' },
  { id: 'quarter_br', displayName: 'Quarter Page (Bottom Right)', shortName: '¼ BR', price: 175, dimensions: '4.0625 × 5.25"', page: 'interior', pos: { x:54, y:54, w:42, h:42 }, groupLabel: 'Quarter Page' },

  { id: 'sixth_1', displayName: 'Sixth Page (1)', shortName: '⅙-1', price: 148, dimensions: '4.0625 × 3.5"', page: 'interior', pos: { x:P, y:P, w:44-P, h:28-P }, groupLabel: 'Sixth Page' },
  { id: 'sixth_2', displayName: 'Sixth Page (2)', shortName: '⅙-2', price: 148, dimensions: '4.0625 × 3.5"', page: 'interior', pos: { x:54, y:P, w:42, h:28-P }, groupLabel: 'Sixth Page' },
  { id: 'sixth_3', displayName: 'Sixth Page (3)', shortName: '⅙-3', price: 148, dimensions: '4.0625 × 3.5"', page: 'interior', pos: { x:P, y:36, w:44-P, h:28 }, groupLabel: 'Sixth Page' },
  { id: 'sixth_4', displayName: 'Sixth Page (4)', shortName: '⅙-4', price: 148, dimensions: '4.0625 × 3.5"', page: 'interior', pos: { x:54, y:36, w:42, h:28 }, groupLabel: 'Sixth Page' },
  { id: 'sixth_5', displayName: 'Sixth Page (5)', shortName: '⅙-5', price: 148, dimensions: '4.0625 × 3.5"', page: 'interior', pos: { x:P, y:68, w:44-P, h:28 }, groupLabel: 'Sixth Page' },
  { id: 'sixth_6', displayName: 'Sixth Page (6)', shortName: '⅙-6', price: 148, dimensions: '4.0625 × 3.5"', page: 'interior', pos: { x:54, y:68, w:42, h:28 }, groupLabel: 'Sixth Page' },

  { id: 'eighth_1', displayName: 'Eighth Page (1)', shortName: '⅛-1', price: 90, dimensions: '4.0625 × 2.625"', page: 'interior', pos: { x:P, y:P, w:44-P, h:20-P }, groupLabel: 'Eighth Page' },
  { id: 'eighth_2', displayName: 'Eighth Page (2)', shortName: '⅛-2', price: 90, dimensions: '4.0625 × 2.625"', page: 'interior', pos: { x:54, y:P, w:42, h:20-P }, groupLabel: 'Eighth Page' },
  { id: 'eighth_3', displayName: 'Eighth Page (3)', shortName: '⅛-3', price: 90, dimensions: '4.0625 × 2.625"', page: 'interior', pos: { x:P, y:26, w:44-P, h:22 }, groupLabel: 'Eighth Page' },
  { id: 'eighth_4', displayName: 'Eighth Page (4)', shortName: '⅛-4', price: 90, dimensions: '4.0625 × 2.625"', page: 'interior', pos: { x:54, y:26, w:42, h:22 }, groupLabel: 'Eighth Page' },
  { id: 'eighth_5', displayName: 'Eighth Page (5)', shortName: '⅛-5', price: 90, dimensions: '4.0625 × 2.625"', page: 'interior', pos: { x:P, y:52, w:44-P, h:22 }, groupLabel: 'Eighth Page' },
  { id: 'eighth_6', displayName: 'Eighth Page (6)', shortName: '⅛-6', price: 90, dimensions: '4.0625 × 2.625"', page: 'interior', pos: { x:54, y:52, w:42, h:22 }, groupLabel: 'Eighth Page' },
  { id: 'eighth_7', displayName: 'Eighth Page (7)', shortName: '⅛-7', price: 90, dimensions: '4.0625 × 2.625"', page: 'interior', pos: { x:P, y:78, w:44-P, h:18 }, groupLabel: 'Eighth Page' },
  { id: 'eighth_8', displayName: 'Eighth Page (8)', shortName: '⅛-8', price: 90, dimensions: '4.0625 × 2.625"', page: 'interior', pos: { x:54, y:78, w:42, h:18 }, groupLabel: 'Eighth Page' },
]

export const WEB_ZONES: WebZoneDef[] = [
  { id: 'header_leaderboard', displayName: 'Header Leaderboard',   shortName: 'Leaderboard', price: 200, dimensions: '728 × 90',  placement: 'Site header — maximum visibility', description: 'Top of every page, above the fold' },
  { id: 'article_inline_top', displayName: 'Article Inline Top',   shortName: 'Inline Top',  price: 150, dimensions: '600 × 300', placement: 'Top of article content area', description: 'First thing readers see when opening an article' },
  { id: 'article_inline_mid', displayName: 'Article Inline Mid',   shortName: 'Inline Mid',  price: 150, dimensions: '600 × 300', placement: 'Middle of article body', description: 'High dwell-time position — readers are engaged' },
  { id: 'article_inline_bot', displayName: 'Article Inline Bottom',shortName: 'Inline Bot',  price: 100, dimensions: '600 × 150', placement: 'End of article, before comments', description: 'Captures readers at natural article end' },
  { id: 'guide_sidebar',      displayName: 'Guide Sidebar',        shortName: 'Sidebar',     price: 125, dimensions: '300 × 250', placement: 'Sidebar in Local Guides section', description: 'Targets guide-browsing, high purchase intent' },
  { id: 'email_banner',       displayName: 'Email Newsletter Banner', shortName: 'Email',    price: 175, dimensions: '600 × 200', placement: 'Top of weekly email newsletter', description: `Reaches ${'>'}2,000 River Region Parents subscribers` },
]

// Group labels for pricing display
export const PRINT_GROUP_PRICES: Record<string, number> = {
  'Back Cover': 625,
  'Inside Front Cover': 575,
  'Inside Back Cover': 575,
  'Full Page': 480,
  'Half Page': 285,
  'Third Page': 240,
  'Quarter Page': 175,
  'Sixth Page': 148,
  'Eighth Page': 90,
}

export const PUBLICATIONS = [
  { abbrev: 'RRP', name: 'River Region Parents',      market: 'Montgomery, AL' },
  { abbrev: 'RRB', name: 'River Region Boom',         market: 'Montgomery, AL' },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents',    market: 'Auburn-Opelika, AL' },
  { abbrev: 'MBP', name: 'Mobile Bay Parents',        market: 'Mobile, AL' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents',     market: 'Eastern Shore, AL' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', market: 'Pensacola, FL' },
]

// Month helpers
const MO_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
export function currentIssueName(pub = 'RRP'): string {
  const d = new Date()
  return `${pub} ${MO_LABELS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`
}

export function getNextSixMonths(pub = 'RRP'): string[] {
  const d = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const m = (d.getMonth() + i) % 12
    const y = d.getFullYear() + Math.floor((d.getMonth() + i) / 12)
    return `${pub} ${MO_LABELS[m]}${String(y).slice(2)}`
  })
}
