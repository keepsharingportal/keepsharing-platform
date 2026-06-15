// Seasonal alerts — surfaces the brand's current + next month editorial
// calendar themes on the audit-reports page. Reminds the editor to
// publish on time-sensitive themes before they pass.

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadBrandProfile } from '@/lib/seo/brand-profile'
import { CalendarClock, ArrowRight } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export async function SeasonalAlerts({ brandSlug }: { brandSlug: string }) {
  const sb = createAdminClient()
  const profile = await loadBrandProfile(sb, brandSlug)

  const now      = new Date()
  const month    = now.getUTCMonth() + 1
  const next     = month === 12 ? 1 : month + 1
  const thisCal  = profile.editorialCalendar[String(month)] ?? { themes: [] }
  const nextCal  = profile.editorialCalendar[String(next)]  ?? { themes: [] }

  // When no calendar is set, prompt the editor to fill it in.
  if (thisCal.themes.length === 0 && nextCal.themes.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 14, borderLeft: '3px solid var(--color-portal-amber)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarClock size={16} color="var(--color-portal-amber)" />
          <strong style={{ fontSize: 13, color: 'var(--color-portal-text)' }}>No editorial calendar set</strong>
        </div>
        <p className="text-portal-sub" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
          The audit can&apos;t flag seasonal gaps without a calendar. Open the brand profile and add this month + next month&apos;s themes.
        </p>
        <Link href={`/admin/seo/brand-profile?brand=${brandSlug}`} className="text-portal-blue fw-700" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, marginTop: 6 }}>
          Open brand profile <ArrowRight size={12} />
        </Link>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: 14, borderLeft: '3px solid var(--color-portal-blue)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <CalendarClock size={16} color="var(--color-portal-blue)" />
        <strong style={{ fontSize: 13, color: 'var(--color-portal-text)' }}>Seasonal radar</strong>
        <Link href={`/admin/seo/brand-profile?brand=${brandSlug}`} className="text-portal-sub" style={{ marginLeft: 'auto', fontSize: 11, textDecoration: 'underline' }}>
          Edit calendar
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <SlotCard month={MONTHS[month - 1]} subtitle="this month" themes={thisCal.themes} notes={thisCal.notes} accent="var(--color-portal-blue)" />
        <SlotCard month={MONTHS[next - 1]}  subtitle="next month — prep now" themes={nextCal.themes} notes={nextCal.notes} accent="var(--color-portal-amber)" />
      </div>
    </div>
  )
}

function SlotCard({ month, subtitle, themes, notes, accent }: { month: string; subtitle: string; themes: string[]; notes?: string; accent: string }) {
  return (
    <div style={{ padding: 10, background: 'var(--color-portal-bg)', borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>{subtitle}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-portal-text)', marginBottom: 6 }}>{month}</div>
      {themes.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--color-portal-sub)', fontStyle: 'italic' }}>No themes set.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {themes.map(t => (
            <span key={t} style={{ display: 'inline-flex', padding: '2px 8px', background: 'white', border: '1px solid var(--color-portal-border)', borderRadius: 10, fontSize: 11, fontWeight: 600, color: 'var(--color-portal-text)' }}>
              {t}
            </span>
          ))}
        </div>
      )}
      {notes && <p style={{ fontSize: 11, color: 'var(--color-portal-sub)', marginTop: 6, lineHeight: 1.4 }}>{notes}</p>}
    </div>
  )
}
