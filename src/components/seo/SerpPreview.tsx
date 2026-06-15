'use client'

// ── Google SERP preview ────────────────────────────────────────────────────
//
// Shows the editor what the article's Google search result will look
// like: the URL breadcrumb, the title (truncated to ~60 chars per
// Google's CSS-pixel cap), and the description (truncated to ~160).
// Tracks pixel-width via a rough char count — close enough for editor
// guidance without a canvas measurer.

interface Props {
  /** Effective title — seo_title if set, else article title. */
  title:       string
  /** Effective description — seo_description if set, else excerpt. */
  description: string
  /** Page path on our site (e.g. /columns/play-ball/jane-doe). The
   *  preview synthesizes the breadcrumb from this. */
  urlPath:     string
}

const TITLE_PIXEL_LIMIT = 580   // ~60 chars in Arial 18
const DESC_PIXEL_LIMIT  = 920   // ~160 chars in Arial 14

function approxPixelWidth(text: string, perChar: number): number {
  return text.length * perChar
}

function truncateToPixels(text: string, perChar: number, limit: number): { shown: string; truncated: boolean } {
  if (approxPixelWidth(text, perChar) <= limit) return { shown: text, truncated: false }
  const maxChars = Math.floor(limit / perChar) - 1
  return { shown: text.slice(0, maxChars).trimEnd() + '…', truncated: true }
}

export function SerpPreview({ title, description, urlPath }: Props) {
  const titlePixels = approxPixelWidth(title, 9.6)   // Arial 18
  const descPixels  = approxPixelWidth(description, 5.7) // Arial 14
  const titleShown  = truncateToPixels(title,       9.6, TITLE_PIXEL_LIMIT)
  const descShown   = truncateToPixels(description, 5.7, DESC_PIXEL_LIMIT)

  // Breadcrumb — strip leading slash, replace separators with the
  // U+203A "single right-pointing angle quotation mark" Google uses.
  const trail = urlPath.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean)
  const breadcrumb = trail.length === 0
    ? 'riverregionparents.com'
    : `riverregionparents.com › ${trail.join(' › ')}`

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-portal-border)',
        background: 'var(--color-portal-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>Google search preview</div>
        <div className="text-portal-sub" style={{ fontSize: 11 }}>
          Title {Math.round(titlePixels)}px · Desc {Math.round(descPixels)}px
        </div>
      </div>

      <div style={{ padding: '20px 18px', background: 'white', maxWidth: 680 }}>
        {/* Favicon + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#f6f6f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#ef6442' }}>R</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 14, color: '#202124', fontWeight: 500 }}>River Region Parents</span>
            <span style={{ fontSize: 12, color: '#4d5156' }}>{breadcrumb}</span>
          </div>
        </div>

        {/* Title */}
        <a href="#" style={{
          display: 'block', marginTop: 8,
          fontSize: 20, lineHeight: '26px',
          color: '#1a0dab', textDecoration: 'none',
          fontFamily: 'arial, sans-serif',
          maxWidth: 600,
          overflow: 'hidden',
        }}>
          {titleShown.shown}
        </a>
        {titleShown.truncated && (
          <p style={{ fontSize: 11, color: 'var(--color-portal-amber)', marginTop: 4 }}>
            Title will truncate in the result.
          </p>
        )}

        {/* Description */}
        <p style={{
          marginTop: 4,
          fontSize: 14, lineHeight: '20px',
          color: '#4d5156',
          fontFamily: 'arial, sans-serif',
          maxWidth: 600,
        }}>
          {descShown.shown || <span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>(no description — Google will pick text from the page)</span>}
        </p>
        {descShown.truncated && (
          <p style={{ fontSize: 11, color: 'var(--color-portal-amber)', marginTop: 4 }}>
            Description will truncate in the result.
          </p>
        )}
      </div>
    </div>
  )
}
