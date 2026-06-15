// ── ArticleGscPanel — what's-working snapshot for one article ─────────
//
// Reads from loadArticleGsc(). Renders:
//   - Totals strip: impressions, clicks, CTR, avg position over 28d
//   - Top queries table: top 8 by impressions
//   - Page-2 leverage callout: queries between 11-20 that should be
//     the editor's primary focus this session
//
// Server component (no interactivity needed) so it ships zero JS.

import Link from 'next/link'
import { TrendingUp, ArrowRight } from 'lucide-react'
import type { ArticleGscSummary } from '@/lib/seo/article-gsc'

export function ArticleGscPanel({ gsc, articleId }: { gsc: ArticleGscSummary; articleId: string }) {
  void articleId
  const hasData = gsc.totals.impressions > 0
  if (!hasData) {
    return (
      <div className="bg-white border border-portal-border rounded-lg p-3 mb-3.5" style={{ borderLeft: '3px solid var(--color-portal-sub)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-portal-sub)' }}>
          <strong>No GSC data yet</strong> for this article URL over the last {gsc.windowDays} days.
          Likely freshly published or below the impression threshold — check back next sync.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg p-3.5 mb-3.5" style={{ borderLeft: '3px solid var(--color-portal-blue)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong className="text-portal-text" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={13} color="var(--color-portal-blue)" />
          What&apos;s working · last {gsc.windowDays} days
        </strong>
        <span className="text-portal-sub" style={{ fontSize: 11 }}>
          <code style={{ fontSize: 10 }}>{gsc.pagePath}</code>
        </span>
      </div>

      {/* Totals strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
        <Mini label="Impressions" value={gsc.totals.impressions.toLocaleString()} />
        <Mini label="Clicks"      value={gsc.totals.clicks.toLocaleString()} />
        <Mini label="CTR"         value={`${(gsc.totals.ctr * 100).toFixed(2)}%`} />
        <Mini label="Avg pos"     value={gsc.totals.avgPosition.toFixed(1)} />
      </div>

      {/* Page-2 leverage callout */}
      {gsc.pageTwoQueries.length > 0 && (
        <div style={{
          background: 'var(--color-portal-amber-lt, #fef3c7)',
          padding: 10,
          borderRadius: 6,
          marginBottom: 10,
        }}>
          <strong style={{ fontSize: 12, color: 'var(--color-portal-text)' }}>
            🎯 Page-2 leverage ({gsc.pageTwoQueries.length}) — these are this session&apos;s biggest wins:
          </strong>
          <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 11, lineHeight: 1.6 }}>
            {gsc.pageTwoQueries.map(q => (
              <li key={q.query} className="text-portal-text">
                <strong>“{q.query}”</strong> · pos {q.avgPosition.toFixed(1)} · {q.impressions.toLocaleString()} imp
                <span className="text-portal-sub"> → add to title or first paragraph, build out an H2</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top queries table */}
      {gsc.topQueries.length > 0 && (
        <div>
          <div className="text-portal-sub fw-700" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>
            Top queries
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--color-portal-bg)' }}>
                <th style={th()}>Query</th>
                <th style={thR()}>Imp</th>
                <th style={thR()}>Clicks</th>
                <th style={thR()}>CTR</th>
                <th style={thR()}>Pos</th>
              </tr>
            </thead>
            <tbody>
              {gsc.topQueries.slice(0, 8).map(q => (
                <tr key={q.query} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                  <td style={td()}>{q.query}</td>
                  <td style={tdR()}>{q.impressions.toLocaleString()}</td>
                  <td style={tdR()}>{q.clicks.toLocaleString()}</td>
                  <td style={tdR()}>{(q.ctr * 100).toFixed(2)}%</td>
                  <td style={tdR()}><strong>{q.avgPosition.toFixed(1)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Link href="/admin/seo/query-briefs" className="text-portal-blue fw-700" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          See all query briefs <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-portal-bg)', borderRadius: 4, padding: '6px 8px', textAlign: 'center' }}>
      <div className="text-portal-sub" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
      <div className="text-portal-text fw-700" style={{ fontSize: 14 }}>{value}</div>
    </div>
  )
}

function th():  React.CSSProperties { return { textAlign: 'left',  padding: '6px 8px', fontSize: 11, color: 'var(--color-portal-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' } }
function thR(): React.CSSProperties { return { ...th(), textAlign: 'right' } }
function td():  React.CSSProperties { return { padding: '6px 8px' } }
function tdR(): React.CSSProperties { return { padding: '6px 8px', textAlign: 'right' } }
