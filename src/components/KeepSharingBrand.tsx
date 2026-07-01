// KeepSharing brand mark — soundwave icon + wordmark.
// Reusable across the distribution portal (login screen, driver
// dashboard, admin chrome). Georgia serif matches the historic wordmark;
// two-tone coloring (dark navy "Keep" + blue "Sharing") is the standing
// brand rule.
//
// Props:
//   size:  'sm' | 'md' | 'lg' — controls the wordmark type size + icon
//   theme: 'light' | 'dark'   — 'dark' inverts the wordmark colors for
//                              placement on dark backgrounds

import type { CSSProperties } from 'react'

interface Props {
  size?:   'sm' | 'md' | 'lg'
  theme?:  'light' | 'dark'
  showLLC?: boolean
  style?:  CSSProperties
}

const SIZE_MAP = {
  sm: { icon: 22, font: 20, gap: 8,  llc: 8  },
  md: { icon: 30, font: 26, gap: 10, llc: 10 },
  lg: { icon: 40, font: 36, gap: 12, llc: 11 },
} as const

export function KeepSharingBrand({ size = 'md', theme = 'light', showLLC = false, style }: Props) {
  const s = SIZE_MAP[size]
  const keepColor    = theme === 'dark' ? '#FFFFFF'         : '#0F2640'
  const sharingColor = theme === 'dark' ? '#60A5FA'         : '#1A5FA8'
  const iconColor    = theme === 'dark' ? '#60A5FA'         : '#1A5FA8'
  const llcColor     = theme === 'dark' ? 'rgba(255,255,255,.55)' : '#94A3B8'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        fontFamily: 'Georgia, "Times New Roman", serif',
        lineHeight: 1,
        ...style,
      }}
    >
      <SoundwaveIcon size={s.icon} color={iconColor} />
      <span style={{ fontSize: s.font, fontWeight: 700, letterSpacing: '-0.02em', color: keepColor }}>
        Keep<span style={{ color: sharingColor }}>Sharing</span>
        {showLLC && (
          <sup style={{ fontSize: s.llc, marginLeft: 3, fontWeight: 400, color: llcColor, letterSpacing: 0 }}>
            LLC
          </sup>
        )}
      </span>
    </div>
  )
}

// ── Soundwave icon ────────────────────────────────────────────────────
// 5 vertical bars with rounded caps, symmetric heights around the middle
// bar. Matches the historic brand mark.
function SoundwaveIcon({ size, color }: { size: number; color: string }) {
  const h = size
  const w = size * 1.15
  return (
    <svg width={w} height={h} viewBox="0 0 46 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="1"  y="14" width="6" height="12" rx="3" fill={color} />
      <rect x="10" y="8"  width="6" height="24" rx="3" fill={color} />
      <rect x="19" y="2"  width="6" height="36" rx="3" fill={color} />
      <rect x="28" y="8"  width="6" height="24" rx="3" fill={color} />
      <rect x="37" y="14" width="6" height="12" rx="3" fill={color} />
    </svg>
  )
}
