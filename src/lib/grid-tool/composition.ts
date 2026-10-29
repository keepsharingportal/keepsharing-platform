// Composition overlays — the guides that help you decide WHERE things go.
//
// ── Why these are separate from the grid ────────────────────────────────────
// The grid is for TRANSFER: the composition is already settled and you are
// copying it accurately. These are for COMPOSITION: judging whether the
// picture is any good before you commit to it. Different job, different
// panel, and they are useful on a blank canvas with no photo at all —
// planning a painting from imagination rather than cropping a reference.
//
// Everything here is pure geometry in frame coordinates (0,0 top-left to
// w,h), so the preview and the export share it exactly like the grid does.

export interface Line { x1: number; y1: number; x2: number; y2: number }
export interface Point { x: number; y: number }

export const PHI = (1 + Math.sqrt(5)) / 2        // 1.618…
export const INV_PHI = 1 / PHI                    // 0.618…
export const INV_PHI2 = 1 / (PHI * PHI)           // 0.382…

export type OverlayKind =
  | 'thirds' | 'phi' | 'spiral' | 'armature' | 'diagonals' | 'center'

/** Rule of thirds: the familiar 3 × 3. */
export function thirdsLines(w: number, h: number): Line[] {
  return [
    { x1: w / 3,     y1: 0, x2: w / 3,     y2: h },
    { x1: 2 * w / 3, y1: 0, x2: 2 * w / 3, y2: h },
    { x1: 0, y1: h / 3,     x2: w, y2: h / 3 },
    { x1: 0, y1: 2 * h / 3, x2: w, y2: 2 * h / 3 },
  ]
}

/**
 * Phi grid — thirds, but divided at 0.382 and 0.618 instead of 1/3 and 2/3.
 *
 * The lines sit a little closer to the centre than thirds. Whether that is
 * BETTER is a matter of taste: the maths of the golden ratio is sound, while
 * the art-historical claims around it are mostly retrofitted. It is offered
 * because it is a useful alternative placement that many painters prefer,
 * not because Renaissance masters secretly used it.
 */
export function phiLines(w: number, h: number): Line[] {
  return [
    { x1: w * INV_PHI2, y1: 0, x2: w * INV_PHI2, y2: h },
    { x1: w * INV_PHI,  y1: 0, x2: w * INV_PHI,  y2: h },
    { x1: 0, y1: h * INV_PHI2, x2: w, y2: h * INV_PHI2 },
    { x1: 0, y1: h * INV_PHI,  x2: w, y2: h * INV_PHI },
  ]
}

export function centerLines(w: number, h: number): Line[] {
  return [
    { x1: w / 2, y1: 0, x2: w / 2, y2: h },
    { x1: 0, y1: h / 2, x2: w, y2: h / 2 },
  ]
}

export function diagonalLines(w: number, h: number): Line[] {
  return [
    { x1: 0, y1: 0, x2: w, y2: h },
    { x1: w, y1: 0, x2: 0, y2: h },
  ]
}

/**
 * Dynamic symmetry armature (Hambidge).
 *
 * Both diagonals, plus a "reciprocal" from each corner running perpendicular
 * to the diagonal it does not touch. Where those cross are the armature's
 * focal points.
 *
 * The thing that makes this different from thirds: thirds puts a line at 1/3
 * of ANY rectangle, ignoring its proportions. These lines are derived from
 * the canvas's own diagonals, so a 16 × 20 and a 24 × 36 get genuinely
 * different armatures — the structure belongs to that canvas.
 */
export function armatureLines(w: number, h: number): Line[] {
  if (w <= 0 || h <= 0) return []
  const out: Line[] = [...diagonalLines(w, h)]

  // Diagonal A→C has slope h/w, so its perpendicular has slope -w/h. The two
  // reciprocals of that diagonal pass through the corners it misses: B and D.
  const mPerpAC = -w / h
  out.push(...clipThrough(w, h, w, 0, mPerpAC))   // through B (w,0)
  out.push(...clipThrough(w, h, 0, h, mPerpAC))   // through D (0,h)

  // Diagonal B→D has slope -h/w, perpendicular slope w/h, through A and C.
  const mPerpBD = w / h
  out.push(...clipThrough(w, h, 0, 0, mPerpBD))   // through A (0,0)
  out.push(...clipThrough(w, h, w, h, mPerpBD))   // through C (w,h)

  return out
}

/** The infinite line y - py = m(x - px), clipped to the frame. */
function clipThrough(w: number, h: number, px: number, py: number, m: number): Line[] {
  const pts: Point[] = []
  const add = (x: number, y: number) => {
    if (x < -1e-9 || x > w + 1e-9 || y < -1e-9 || y > h + 1e-9) return
    if (pts.some(p => Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9)) return
    pts.push({ x, y })
  }
  // Against the two vertical edges, then the two horizontal ones.
  add(0, py + m * (0 - px))
  add(w, py + m * (w - px))
  if (Math.abs(m) > 1e-12) {
    add(px + (0 - py) / m, 0)
    add(px + (h - py) / m, h)
  }
  if (pts.length < 2) return []
  // Farthest-apart pair is the chord across the frame.
  let best: [Point, Point] = [pts[0], pts[1]]
  let bestD = -1
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = (pts[i].x - pts[j].x) ** 2 + (pts[i].y - pts[j].y) ** 2
      if (d > bestD) { bestD = d; best = [pts[i], pts[j]] }
    }
  }
  return [{ x1: best[0].x, y1: best[0].y, x2: best[1].x, y2: best[1].y }]
}

/**
 * Golden spiral, as a polyline.
 *
 * Built in a true golden rectangle (φ wide, 1 tall) by repeatedly cutting off
 * a square and drawing the quarter arc inside it, then scaled to the frame.
 * Returned as sampled points rather than canvas arcs: the arc-direction flags
 * are easy to get subtly wrong and impossible to see in a diff, whereas a
 * polyline can be asserted continuous by a test.
 *
 * Scaling to a frame that is not φ:1 stretches the spiral, which is what
 * every overlay of this kind does — the alternative is letterboxing it inside
 * the frame, which helps nobody composing to the frame's edges.
 */
export function goldenSpiralPath(
  w: number, h: number,
  { flipX = false, flipY = false, steps = 9, perArc = 12 } = {},
): Point[] {
  const pts: Point[] = []
  let x = 0, y = 0, rw = PHI, rh = 1

  for (let i = 0; i < steps; i++) {
    const s = Math.min(rw, rh)
    if (s <= 1e-9) break
    let cx: number, cy: number, sx: number, sy: number, ex: number, ey: number

    switch (i % 4) {
      case 0: // square off the LEFT
        cx = x + s; cy = y + s; sx = x;        sy = y + s; ex = x + s;      ey = y
        x += s; rw -= s; break
      case 1: // square off the TOP
        cx = x + s; cy = y;     sx = x;        sy = y;     ex = x + s;      ey = y + s
        y += s; rh -= s; break
      case 2: // square off the RIGHT
        cx = x + rw; cy = y + s; sx = x + rw;  sy = y;     ex = x + rw - s; ey = y + s
        rw -= s; break
      default: // square off the BOTTOM
        cx = x; cy = y + rh;     sx = x + s;   sy = y + rh; ex = x;         ey = y + rh - s
        rh -= s; break
    }

    const a0 = Math.atan2(sy - cy, sx - cx)
    let a1 = Math.atan2(ey - cy, ex - cx)
    // Take the quarter turn, not the three-quarter one going the other way.
    let d = a1 - a0
    while (d >  Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    a1 = a0 + d

    for (let k = (i === 0 ? 0 : 1); k <= perArc; k++) {
      const a = a0 + (a1 - a0) * (k / perArc)
      pts.push({ x: cx + s * Math.cos(a), y: cy + s * Math.sin(a) })
    }
  }

  // Unit golden rectangle → the frame, then optional mirroring.
  return pts.map(p => {
    const fx = (p.x / PHI) * w
    const fy = p.y * h
    return { x: flipX ? w - fx : fx, y: flipY ? h - fy : fy }
  })
}

/** Lines for any overlay that is made of straight lines. */
export function overlayLines(kind: Exclude<OverlayKind, 'spiral'>, w: number, h: number): Line[] {
  switch (kind) {
    case 'thirds':    return thirdsLines(w, h)
    case 'phi':       return phiLines(w, h)
    case 'center':    return centerLines(w, h)
    case 'diagonals': return diagonalLines(w, h)
    case 'armature':  return armatureLines(w, h)
  }
}
