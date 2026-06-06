import type { ReactNode } from 'react'
import Image from 'next/image'
import { GraduationCap } from 'lucide-react'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { ClaimSpotButton } from '@/components/ClaimSpotButton'

interface SchoolBit {
  id: string
  heading: string
  schoolName?: string
  imageUrl?: string
  text: string
}

interface Props {
  body: string
  pullQuotes?: string[]
  inlineAd?: ReactNode
}

// ── HTML / markdown detection ──────────────────────────────────────────

function isHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s)
}

// ── HTML entity decoder ────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

// ── HTML → parser-friendly text normalization ──────────────────────────
// Converts WordPress HTML body to the same line-based format the
// markdown parser expects, so we only need one downstream parser.

function normalizeHtmlToText(html: string): string {
  let text = html

  // Remove Visual Composer / Gutenberg wrapper divs + comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')
  text = text.replace(/\[[\s\S]*?\]/g, '') // WP shortcodes

  // Heading tags → ## markers
  text = text.replace(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim()
    return clean ? `\n## ${decodeEntities(clean)}\n` : ''
  })

  // A paragraph that contains ONLY bold text → treat as a heading
  // e.g. <p><strong>Jordan Smith</strong></p>
  text = text.replace(/<p[^>]*>\s*<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>\s*<\/p>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim()
    return clean ? `\n## ${decodeEntities(clean)}\n` : ''
  })

  // Extract images from <figure> blocks (WordPress standard)
  text = text.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, (_, inner) => {
    const srcMatch = inner.match(/src="([^"]+)"/)
    return srcMatch ? `\n!(${srcMatch[1]})\n` : ''
  })

  // Standalone <img> tags
  text = text.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi, (_, src) => `\n!(${src})\n`)

  // <p> and <div> content → plain text lines
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim()
    return clean ? `${decodeEntities(clean)}\n` : ''
  })
  text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim()
    return clean ? `${decodeEntities(clean)}\n` : ''
  })

  // <br> → newline
  text = text.replace(/<br\s*\/?>/gi, '\n')

  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, '')

  return decodeEntities(text).replace(/\n{3,}/g, '\n\n').trim()
}

// ── Text utilities ─────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '')
}

function applyInline(text: string): string {
  return stripHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
}

// ── Image line detection ───────────────────────────────────────────────

function extractImageUrl(line: string): string | null {
  const t = line.trim()
  // Standard markdown: ![alt](url)
  const m1 = t.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/)
  if (m1) return m1[2]
  // Bare: !(url)
  const m2 = t.match(/^!\((https?:\/\/[^\s)]+)\)/)
  if (m2) return m2[1]
  // Raw image URL line
  const m3 = t.match(/^(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)\s*$/i)
  if (m3) return m3[1]
  return null
}

// ── School name extraction ─────────────────────────────────────────────

const SCHOOL_RE = /\b(?:at|from|of|attending|attends)\s+([A-Z][A-Za-z0-9\s'&.,-]+?(?:School|Academy|Elementary|Middle|High|University|College|Institute|Charter))\b/

function extractSchoolName(text: string): string | undefined {
  return text.match(SCHOOL_RE)?.[1]?.trim()
}

// ── Core parser ────────────────────────────────────────────────────────
// Works on line-based text. Input must be markdown or already normalized HTML.

function parseSchoolBits(rawBody: string): { intro: string; bits: SchoolBit[] } {
  // Normalize HTML to text if needed
  const body = isHtml(rawBody) ? normalizeHtmlToText(rawBody) : rawBody

  const lines = body.split('\n')
  const segments: { heading: string; rawLines: string[] }[] = []
  const introLines: string[] = []
  let current: { heading: string; rawLines: string[] } | null = null

  for (const line of lines) {
    const t = line.trim()
    if (/^#{1,3}\s+./.test(t)) {
      if (current) segments.push(current)
      current = { heading: t.replace(/^#+\s+/, ''), rawLines: [] }
    } else if (!current) {
      introLines.push(line)
    } else {
      current.rawLines.push(line)
    }
  }
  if (current) segments.push(current)

  const intro = introLines
    .map(l => l.trim())
    .filter(Boolean)
    .map(applyInline)
    .join(' ')

  const bits: SchoolBit[] = segments
    .filter(seg => seg.heading)
    .map((seg, i) => {
      let imageUrl: string | undefined
      const textLines: string[] = []

      for (const line of seg.rawLines) {
        const img = extractImageUrl(line)
        if (img && !imageUrl) {
          imageUrl = img
        } else if (line.trim()) {
          textLines.push(line.trim())
        }
      }

      const rawText = textLines.join(' ')
      return {
        id:         `bit-${i}`,
        heading:    decodeEntities(seg.heading),
        schoolName: extractSchoolName(rawText),
        imageUrl,
        text:       applyInline(rawText),
      }
    })
    .filter(bit => bit.text || bit.imageUrl)

  return { intro, bits }
}

// ── Inline sponsor placeholder ─────────────────────────────────────────

function InlineSponsorCard() {
  return (
    <div className="sm:col-span-2 p-5 sm:p-6 rounded-2xl relative text-center overflow-hidden border border-dashed border-secondary/30 bg-secondary/4">
      <span className="absolute top-2.5 right-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background/80 px-2 py-0.5 rounded border border-border/50">
        Education Partner
      </span>
      <div className="max-w-md mx-auto pt-1">
        <p className="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1.5">
          Supporting Student Achievement
        </p>
        <h4 className="text-base font-bold text-foreground mb-2">Advertise with School Bits</h4>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Reach River Region families and educators. Contact us to become an Education Partner.
        </p>
        <ClaimSpotButton
          as="a"
          href="/advertise"
          placementType="school_bits_inline"
          placementLabel="School Bits — Education Partner"
          className="inline-block px-5 py-2 rounded-full bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors"
        >
          Become an Education Partner
        </ClaimSpotButton>
      </div>
    </div>
  )
}

// ── School Bit card ────────────────────────────────────────────────────

function SchoolBitCard({ bit }: { bit: SchoolBit }) {
  return (
    <article className="flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Brand label + school name pill */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-0">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-secondary shrink-0">
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          School Bits
        </span>
        {bit.schoolName && (
          <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 truncate max-w-[55%] text-right leading-none">
            {bit.schoolName}
          </span>
        )}
      </div>

      {/* Image */}
      {bit.imageUrl && (
        <div className="relative mx-4 mt-3 aspect-[4/3] rounded-xl overflow-hidden border border-border/40">
          <Image
            src={bit.imageUrl}
            alt={bit.heading}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        </div>
      )}

      {/* Headline + body text */}
      <div className="flex flex-col flex-1 p-4 pt-3 gap-2">
        <h3 className="font-bold text-sm leading-snug text-foreground">{bit.heading}</h3>
        {bit.text && (
          <p
            className="text-sm text-muted-foreground leading-relaxed flex-1"
            dangerouslySetInnerHTML={{ __html: bit.text }}
          />
        )}
      </div>
    </article>
  )
}

// ── Roundup header ─────────────────────────────────────────────────────

function RoundupHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border/50">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-secondary shrink-0" />
        <span className="text-sm font-bold text-secondary uppercase tracking-wider">Student Spotlights</span>
      </div>
      <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
        {count} {count === 1 ? 'spotlight' : 'spotlights'} this roundup
      </span>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────

export function SchoolBitsRoundupArticle({ body, pullQuotes = [], inlineAd }: Props) {
  const { intro, bits } = parseSchoolBits(body)

  // Fewer than 2 parseable segments → fall back to normal article rendering
  if (bits.length < 2) {
    return <ArticleBody body={body} pullQuotes={pullQuotes} inlineAd={inlineAd} />
  }

  return (
    <div>
      <RoundupHeader count={bits.length} />

      {intro && (
        <p
          className="text-lg text-foreground/85 leading-relaxed mb-8 font-medium"
          dangerouslySetInnerHTML={{ __html: intro }}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bits.flatMap((bit, idx): ReactNode[] => {
          const showSponsor = (idx + 1) % 4 === 0 && idx < bits.length - 1
          const items: ReactNode[] = [<SchoolBitCard key={bit.id} bit={bit} />]
          if (showSponsor) items.push(<InlineSponsorCard key={`sponsor-${idx}`} />)
          return items
        })}
      </div>
    </div>
  )
}
