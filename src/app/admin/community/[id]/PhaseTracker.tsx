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
    <div className="card">
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
        gap: 2,
        marginBottom: 12,
      }}>
        {stages.map((p, idx) => {
          const config = PHASES[p]
          const isPast    = idx < currentIdx
          const isCurrent = idx === currentIdx
          const tone      = toneColor(config.tone)
          return (
            <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                title={config.label}
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  background: isPast || isCurrent ? tone : 'var(--color-portal-border)',
                  opacity: isCurrent ? 1 : isPast ? 0.6 : 0.4,
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  fontWeight: isCurrent ? 800 : 500,
                  color: isCurrent ? tone : 'var(--color-portal-muted)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textTransform: 'uppercase',
                  letterSpacing: '.3px',
                }}
              >
                {isPast && <Check size={8} style={{ display: 'inline', marginRight: 2 }} />}
                {config.shortLabel}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span
          className="badge"
          style={{ background: toneColor(currentConfig.tone), color: 'white' }}
        >
          Phase: {currentConfig.label}
        </span>
        <span className="text-muted text-xs">{currentConfig.description}</span>
      </div>
    </div>
  )
}
