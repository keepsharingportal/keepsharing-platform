// Compositional motifs — the shapes you lay a picture's masses along.
//
// ── Why shapes and not more grids ───────────────────────────────────────────
// A grid tells you WHERE to put a thing: on this line, at that crossing. A
// motif tells you HOW the picture should FLOW — the eye enters here, travels
// along this path, and settles there. They answer different questions, and
// for a painter deciding a composition the second one usually comes first.
//
// This is not invented vocabulary. Edgar Payne's "Composition of Outdoor
// Painting" is the standard reference for landscape composition and lists
// these as motifs: the ell, the S-curve, the cross, the circle, radiating
// lines, the triangle. Painters already know these names, so the overlay
// reads as "ah, the L" rather than "what is this shape".
//
// Returned as polylines in frame coordinates. Drawn thick and translucent
// rather than as hairlines: a motif is a river to arrange things along, not
// a measurement to align to, and it should not look like the transfer grid.

import type { Point } from './composition'

export type MotifKind =
  | 'ell' | 's-curve' | 'c-curve' | 'triangle'
  | 'cruciform' | 'radial' | 'circle' | 'diagonal'

/** Each motif is one or more open paths. */
export type MotifPath = Point[]

/** Quadratic bezier, sampled. Enough for a smooth curve at any size. */
function quad(p0: Point, c: Point, p1: Point, steps = 24): Point[] {
  const out: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, m = 1 - t
    out.push({
      x: m * m * p0.x + 2 * m * t * c.x + t * t * p1.x,
      y: m * m * p0.y + 2 * m * t * c.y + t * t * p1.y,
    })
  }
  return out
}

/** Cubic bezier, sampled — needed for the S, which has two bends. */
function cubic(p0: Point, c1: Point, c2: Point, p1: Point, steps = 36): Point[] {
  const out: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, m = 1 - t
    out.push({
      x: m * m * m * p0.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * p1.x,
      y: m * m * m * p0.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * p1.y,
    })
  }
  return out
}

/**
 * Paths for a motif, in a frame of w × h.
 *
 * Inset from the edges: a motif that touches the border reads as a frame
 * rather than as a path through the picture, and in practice you want the
 * masses sitting inside the composition, not jammed against its edge.
 */
export function motifPaths(kind: MotifKind, w: number, h: number): MotifPath[] {
  const m = Math.min(w, h) * 0.12          // breathing room from the edges
  const l = m, r = w - m, t = m, b = h - m
  const cx = w / 2, cy = h / 2

  switch (kind) {
    case 'ell':
      // A strong vertical meeting a horizontal: the classic landscape L,
      // a tree or building on one side grounded by a shore or path.
      return [[{ x: l, y: t }, { x: l, y: b }, { x: r, y: b }]]

    case 's-curve':
      // A road, river or shoreline winding back into depth. Enters bottom,
      // leaves top, crossing the centre twice.
      return [cubic(
        { x: l + (r - l) * 0.25, y: b },
        { x: r, y: h * 0.70 },
        { x: l, y: h * 0.32 },
        { x: l + (r - l) * 0.70, y: t },
      )]

    case 'c-curve':
      // Wraps around the centre, holding the subject in the hollow.
      return [quad({ x: r, y: t }, { x: l - (r - l) * 0.22, y: cy }, { x: r, y: b })]

    case 'triangle':
      // Three points of interest, or a pyramid mass. Stable and classical.
      return [[{ x: cx, y: t }, { x: r, y: b }, { x: l, y: b }, { x: cx, y: t }]]

    case 'cruciform':
      // A cross. Reads better with the crossing off-centre, which is why
      // the arms are not placed at the exact middle.
      return [
        [{ x: w * 0.38, y: t }, { x: w * 0.38, y: b }],
        [{ x: l, y: h * 0.58 }, { x: r, y: h * 0.58 }],
      ]

    case 'radial': {
      // Lines spreading from a focal point — light breaking through, a road
      // junction, branches. Focus off-centre so it is not a starburst.
      const fx = w * 0.38, fy = h * 0.42
      const out: MotifPath[] = []
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3
        out.push([{ x: fx, y: fy }, {
          x: fx + Math.cos(a) * w, y: fy + Math.sin(a) * h,
        }])
      }
      return out
    }

    case 'circle': {
      // A contained, self-enclosed composition — the eye circulates rather
      // than leaving. Elliptical so it suits the frame's shape.
      const pts: Point[] = []
      const rx = (r - l) / 2 * 0.92, ry = (b - t) / 2 * 0.92
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2
        pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
      }
      return [pts]
    }

    case 'diagonal':
      // One decisive slash. The most energetic arrangement, and the easiest
      // to get wrong — it wants something to stop the eye leaving the corner.
      return [[{ x: l, y: b }, { x: r, y: t }]]
  }
}

/**
 * Flip a motif's paths within the frame.
 *
 * An L in the other corner is a different composition, not the same one
 * mirrored — which is why these are controls rather than a fixed drawing.
 */
export function flipPaths(
  paths: MotifPath[], w: number, h: number, flipX: boolean, flipY: boolean,
): MotifPath[] {
  if (!flipX && !flipY) return paths
  return paths.map(p => p.map(q => ({
    x: flipX ? w - q.x : q.x,
    y: flipY ? h - q.y : q.y,
  })))
}

/**
 * Which mirror axes actually change this motif.
 *
 * Not every motif cares about every axis, and a button that visibly does
 * nothing is worse than no button. The triangle sits apex-up on the centre
 * line, so mirroring it left-to-right is a no-op; the C-curve is symmetric
 * about the horizontal centre, so up-down is. The diagonal has only two
 * states, and either flip reaches the other one, so it is offered once.
 *
 * The off-centre motifs — the cross and the radiating lines — DO care about
 * both, which the earlier version of this got wrong: it called them
 * symmetric and hid their controls, leaving no way to move the focal point
 * to the other side of the canvas.
 */
export function motifFlipAxes(kind: MotifKind): { x: boolean; y: boolean } {
  switch (kind) {
    case 'circle':    return { x: false, y: false }  // centred ellipse
    case 'triangle':  return { x: false, y: true  }  // apex on the centre line
    case 'c-curve':   return { x: true,  y: false }  // symmetric top to bottom
    case 'diagonal':  return { x: true,  y: false }  // two states, one control
    default:          return { x: true,  y: true  }
  }
}

/** Does this motif read differently when mirrored at all? */
export function motifHasOrientation(kind: MotifKind): boolean {
  const a = motifFlipAxes(kind)
  return a.x || a.y
}
