// src/lib/import/vc-cleanup.ts
// Strips Visual Composer shortcodes from WordPress post content and converts
// basic HTML to markdown-lite suitable for the body_content field.
// Runs entirely in the browser — no server dependency.

// ── Step 1: extract actual text content from VC wrappers ─────────────────────

function extractVcContent(raw: string): string {
  // Pull inner text from [vc_column_text]...[/vc_column_text] blocks first.
  // These are the actual article paragraphs VC wraps.
  const vcTextMatches = [...raw.matchAll(/\[vc_column_text[^\]]*\]([\s\S]*?)\[\/vc_column_text\]/gi)]
  if (vcTextMatches.length > 0) {
    return vcTextMatches.map(m => m[1]).join('\n\n')
  }
  return raw
}

// ── Step 2: strip all remaining shortcodes ────────────────────────────────────

function stripShortcodes(html: string): string {
  // [caption ...]image[/caption] → preserve just the caption text after the image tag
  html = html.replace(/\[caption[^\]]*\][\s\S]*?<\/a>([^[]*)\[\/caption\]/gi, '$1')
  html = html.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, '$1')

  // Strip all remaining paired shortcodes, keeping inner content
  // e.g. [blockquote]...[/blockquote] → the inner text
  html = html.replace(/\[(\w[\w-]*)[^\]]*\]([\s\S]*?)\[\/\1\]/gi, '$2')

  // Strip all self-closing or opening shortcodes (no inner content worth keeping)
  html = html.replace(/\[[^\]]+\]/g, '')

  return html
}

// ── Step 3: HTML entities ─────────────────────────────────────────────────────

function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#160;/g,  ' ')
    .replace(/&nbsp;/g,  ' ')
    .replace(/&#\d+;/g,  '')
    .replace(/&[a-z]+;/g, '')
}

// ── Step 4: HTML → markdown-lite ─────────────────────────────────────────────

function htmlToMarkdown(html: string): string {
  let md = html

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')

  // Bold / italic
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi,          '**$1**')
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi,        '*$1*')
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi,          '*$1*')

  // Links — keep hrefs, strip img-only links
  md = md.replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const clean = text.replace(/<[^>]+>/g, '').trim()
    if (!clean) return ''
    if (clean.startsWith('http') || clean.length < 4) return clean
    return `[${clean}](${href})`
  })

  // Images → strip entirely (WP image URLs become stale; handled separately)
  md = md.replace(/<img[^>]*>/gi, '')

  // Block quotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) =>
    inner.split('\n').map((l: string) => `> ${l.trim()}`).filter(Boolean).join('\n') + '\n'
  )

  // Unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    return '\n' + items.map(m => `- ${m[1].replace(/<[^>]+>/g, '').trim()}`).join('\n') + '\n'
  })

  // Ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    return '\n' + items.map((m, i) => `${i + 1}. ${m[1].replace(/<[^>]+>/g, '').trim()}`).join('\n') + '\n'
  })

  // Paragraphs → double newline
  md = md.replace(/<\/p>/gi, '\n\n')
  md = md.replace(/<p[^>]*>/gi, '')

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n')

  // Divs and other block elements → newline
  md = md.replace(/<\/div>/gi, '\n')
  md = md.replace(/<div[^>]*>/gi, '')

  // Strip any remaining HTML tags
  md = md.replace(/<[^>]+>/g, '')

  // Clean up whitespace
  md = md
    .replace(/\*\*\s+\*\*/g, '')   // empty bold spans
    .replace(/\*\s+\*/g, '')        // empty italic spans
    .replace(/\n{4,}/g, '\n\n\n')   // max triple newline
    .replace(/[ \t]+\n/g, '\n')     // trailing spaces
    .replace(/\n[ \t]+/g, '\n')     // leading spaces on lines
    .trim()

  return md
}

// ── Step 5: final passes ──────────────────────────────────────────────────────

function finalClean(md: string): string {
  // Remove lines that are just image filenames (WP attachment leftovers)
  const lines = md.split('\n').filter(line => {
    const t = line.trim()
    if (!t) return true
    if (/^\[!\[.*\]\(.*\)\]\(.*\)$/.test(t)) return false // markdown image links
    if (/\.(jpg|jpeg|png|gif|webp)\s*$/i.test(t)) return false
    return true
  })

  return lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim()
}

// ── Main export ───────────────────────────────────────────────────────────────

export function cleanWpContent(raw: string): string {
  const extracted  = extractVcContent(raw)
  const stripped   = stripShortcodes(extracted)
  const decoded    = decodeEntities(stripped)
  const markdown   = htmlToMarkdown(decoded)
  return finalClean(markdown)
}

export function cleanWpExcerpt(raw: string): string {
  const stripped = stripShortcodes(raw)
  const decoded  = decodeEntities(stripped)
  const text     = decoded.replace(/<[^>]+>/g, '').trim()
  return text.slice(0, 300).replace(/\s+/g, ' ').trim()
}

/**
 * Clean an imported post title.
 *
 * Titles previously went in raw while bodies and excerpts were cleaned, so
 * artifacts that never reached article copy still landed in headlines — the
 * homepage was rendering "You've Made It to August---Your Parenting Survival
 * Award is in the Mail" with a literal triple hyphen.
 *
 * Deliberately lighter than cleanWpContent: no markdown conversion, no
 * shortcode extraction. Decode entities, normalize ASCII dash runs to real
 * typographic dashes, collapse whitespace.
 */
export function cleanWpTitle(raw: string): string {
  return decodeEntities(raw)
    .replace(/<[^>]+>/g, '')
    // 3+ hyphens → em dash; exactly 2 → en dash. Ordered longest-first so
    // the 2-hyphen rule can't chew a 3-hyphen run first.
    .replace(/-{3,}/g, '—')
    .replace(/(?<![-\w])--(?!-)/g, '–')
    // " - " used as a sentence break → em dash (leave hyphenated words alone)
    .replace(/\s+-\s+/g, ' — ')
    .replace(/\.{3,}/g, '…')
    .replace(/\s+/g, ' ')
    .trim()
}
