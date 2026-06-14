'use client'

// Visual progress bar across the nomination workflow phases. The
// current phase is highlighted in its tone color, completed phases are
// filled, future phases are outlined. For submission types that DON'T
// need outreach (school-news, birthday, parent-picks), the outreach +
// interview phases are filtered out so the tracker isn't padded with
// irrelevant steps.

import { Check } from 'lucide-react'
import {
  PHASES, TRACKER_PHASES, NON_OUTREACH_TRACKER,
  trackerIndex, toneColor,
  type Phase,
} from '@/lib/submissions/phases'

interface Props {
  currentPhase: Phase
  needsOutreach: boolean
}

export function PhaseTracker({ currentPhase, needsOutreach }: Props) {
  const stages = needsOutreach ? TRACKER_PHASES : NON_OUTREACH_TRACKER
  const currentIdx = stages.indexOf(currentPhase)
  const currentConfig = PHASES[currentPhase]

  // Off-track phases get a separate badge instead of disrupting the
  // canonical progression display.
  if (currentIdx === -1) {
    return (
      <div className="card" style={{ background: 'var(--color-portal-bg)', borderLeft: `3px solid ${toneColor(currentConfig.tone)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="text-xs fw-700" style={{ color: toneColor(currentConfig.tone), textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {currentConfig.label}
            </div>
            <div className="text-muted text-xs" style={{ marginTop: 2 }}>{currentConfig.description}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ background: 'linear-gradient(180deg, var(--color-portal-bg) 0%, white 80%)' }}>

      {/* Dominant current-phase callout — what phase + the editor's
          decision context, large and high-contrast so it's the first
          thing the eye lands on. */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '4px 0 12px',
        borderBottom: '1px solid var(--color-portal-border)',
        marginBottom: 12,
      }}>
        <div
          style={{
            background: toneColor(currentConfig.tone),
            color: 'white',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '.6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {currentConfig.label}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-sm" style={{ color: 'var(--color-portal-text)', lineHeight: 1.4 }}>
            {currentConfig.description}
          </div>
        </div>
      </div>

      {/* Tracker — past phases checked, current phase highlighted,
          future phases faded. Larger labels + bigger pills so it's
          actually readable at a glance. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
        gap: 3,
      }}>
        {stages.map((p, idx) => {
          const config = PHASES[p]
          const isPast    = idx < currentIdx
          const isCurrent = idx === currentIdx
          const tone      = toneColor(config.tone)
          return (
            <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div
                title={config.label}
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  background: isCurrent ? tone : isPast ? 'var(--color-portal-green)' : 'var(--color-portal-border)',
                  opacity: isCurrent ? 1 : isPast ? 0.85 : 0.5,
                  border: isCurrent ? `1px solid ${tone}` : 'none',
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: isCurrent ? 800 : isPast ? 700 : 600,
                  // Future-phase labels were 'var(--color-portal-muted)'
                  // (#94A3B8) which the user correctly called out as
                  // unreadable. Bumped to portal-sub (#64748B) which
                  // is the same token used for secondary text across
                  // the rest of admin and is comfortably legible on
                  // white.
                  color: isCurrent ? tone : isPast ? 'var(--color-portal-text)' : 'var(--color-portal-sub)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textTransform: 'uppercase',
                  letterSpacing: '.3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                {isPast && <Check size={9} color="var(--color-portal-green)" strokeWidth={3} />}
                {config.shortLabel}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
