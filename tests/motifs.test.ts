import test from 'node:test'
import assert from 'node:assert/strict'
import {
  motifPaths, flipPaths, motifHasOrientation, type MotifKind,
} from '@/lib/grid-tool/motifs'

const W = 1600, H = 1000
const ALL: MotifKind[] = ['ell', 's-curve', 'c-curve', 'triangle', 'cruciform', 'radial', 'circle', 'diagonal']

test('every motif produces at least one path with real points', () => {
  for (const k of ALL) {
    const paths = motifPaths(k, W, H)
    assert.ok(paths.length > 0, `${k}: no paths`)
    for (const p of paths) {
      assert.ok(p.length >= 2, `${k}: a path with fewer than 2 points`)
      for (const q of p) {
        assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y), `${k}: non-finite point`)
      }
    }
  }
})

test('motifs stay inside the frame — except radial, which is clipped when drawn', () => {
  // A motif poking outside reads as a frame rather than a path through the
  // picture. Radial is the deliberate exception: its spokes run past the
  // edge by design and the canvas clip handles them.
  for (const k of ALL) {
    if (k === 'radial') continue
    for (const p of motifPaths(k, W, H)) {
      for (const q of p) {
        assert.ok(q.x >= -1e-6 && q.x <= W + 1e-6, `${k}: x ${q.x.toFixed(1)} outside`)
        assert.ok(q.y >= -1e-6 && q.y <= H + 1e-6, `${k}: y ${q.y.toFixed(1)} outside`)
      }
    }
  }
})

test('motifs are inset — none of them hug the border', () => {
  // The masses should sit inside the composition, not jammed against its edge.
  const inset = Math.min(W, H) * 0.12
  for (const k of ALL) {
    if (k === 'radial') continue
    let touchesEdge = false
    for (const p of motifPaths(k, W, H)) {
      for (const q of p) {
        if (q.x < inset - 1 || q.x > W - inset + 1) touchesEdge = true
        if (q.y < inset - 1 || q.y > H - inset + 1) touchesEdge = true
      }
    }
    assert.ok(!touchesEdge, `${k} runs outside the inset margin`)
  }
})

test('motifs scale with the frame', () => {
  // Preview and export share these, exactly like the grid.
  const k = 3
  for (const kind of ALL) {
    const small = motifPaths(kind, W, H)
    const big   = motifPaths(kind, W * k, H * k)
    assert.equal(small.length, big.length, `${kind}: path count changed`)
    for (let i = 0; i < small.length; i++) {
      assert.equal(small[i].length, big[i].length, `${kind}: point count changed`)
      assert.ok(Math.abs(small[i][0].x * k - big[i][0].x) < 1e-6, `${kind}: not scaled`)
      assert.ok(Math.abs(small[i][0].y * k - big[i][0].y) < 1e-6, `${kind}: not scaled`)
    }
  }
})

test('the L really is an L — down one side, then across', () => {
  const [p] = motifPaths('ell', W, H)
  assert.equal(p.length, 3)
  assert.ok(Math.abs(p[0].x - p[1].x) < 1e-6, 'first leg should be vertical')
  assert.ok(Math.abs(p[1].y - p[2].y) < 1e-6, 'second leg should be horizontal')
  assert.ok(p[1].y > p[0].y, 'should run downward first')
  assert.ok(p[2].x > p[1].x, 'then rightward')
})

/** How many times the path changes turning direction. An S has one such
 *  inflection; a C has none. Crossing the midline is NOT the distinction —
 *  a backwards-C crosses it twice and is still a C, which is what my first
 *  version of these tests got wrong. */
function inflections(pts: { x: number; y: number }[]): number {
  let n = 0, prev = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const ax = pts[i].x - pts[i - 1].x, ay = pts[i].y - pts[i - 1].y
    const bx = pts[i + 1].x - pts[i].x, by = pts[i + 1].y - pts[i].y
    const z = ax * by - ay * bx
    if (Math.abs(z) < 1e-9) continue
    const sign = z > 0 ? 1 : -1
    if (prev !== 0 && sign !== prev) n++
    prev = sign
  }
  return n
}

test('the S bends both ways — that is what makes it an S', () => {
  assert.equal(inflections(motifPaths('s-curve', W, H)[0]), 1)
})

test('the C bends one way only — otherwise it is an S', () => {
  assert.equal(inflections(motifPaths('c-curve', W, H)[0]), 0)
})
test('the triangle closes', () => {
  const [p] = motifPaths('triangle', W, H)
  assert.ok(Math.abs(p[0].x - p[p.length - 1].x) < 1e-6)
  assert.ok(Math.abs(p[0].y - p[p.length - 1].y) < 1e-6)
})

test('the circle closes and is centred', () => {
  const [p] = motifPaths('circle', W, H)
  assert.ok(Math.abs(p[0].x - p[p.length - 1].x) < 1e-6)
  const xs = p.map(q => q.x), ys = p.map(q => q.y)
  assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - W / 2) < 1e-6)
  assert.ok(Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - H / 2) < 1e-6)
})

test('the cruciform crossing is off centre', () => {
  // A cross dead in the middle is the dullest version of it.
  const paths = motifPaths('cruciform', W, H)
  assert.equal(paths.length, 2)
  assert.ok(Math.abs(paths[0][0].x - W / 2) > W * 0.05, 'vertical arm is dead centre')
  assert.ok(Math.abs(paths[1][0].y - H / 2) > H * 0.05, 'horizontal arm is dead centre')
})

test('radial spokes all start from the same point', () => {
  const paths = motifPaths('radial', W, H)
  assert.ok(paths.length >= 6)
  const [ox, oy] = [paths[0][0].x, paths[0][0].y]
  for (const p of paths) {
    assert.ok(Math.abs(p[0].x - ox) < 1e-6 && Math.abs(p[0].y - oy) < 1e-6, 'spokes disagree on origin')
  }
  // And off centre, so it is not a starburst.
  assert.ok(Math.abs(ox - W / 2) > W * 0.05 || Math.abs(oy - H / 2) > H * 0.05)
})

test('flipping mirrors within the frame', () => {
  for (const kind of ALL) {
    const base = motifPaths(kind, W, H)
    const fx = flipPaths(base, W, H, true, false)
    for (let i = 0; i < base.length; i++) {
      for (let j = 0; j < base[i].length; j++) {
        assert.ok(Math.abs((W - base[i][j].x) - fx[i][j].x) < 1e-6, `${kind}: x not mirrored`)
        assert.ok(Math.abs(base[i][j].y - fx[i][j].y) < 1e-6, `${kind}: y should not move`)
      }
    }
  }
})

test('flipping nothing returns the same paths', () => {
  const base = motifPaths('ell', W, H)
  assert.strictEqual(flipPaths(base, W, H, false, false), base)
})

test('symmetric motifs are not offered a flip control', () => {
  // Offering one that visibly does nothing is worse than not offering it.
  assert.equal(motifHasOrientation('circle'), false)
  assert.equal(motifHasOrientation('cruciform'), false)
  assert.equal(motifHasOrientation('radial'), false)
  assert.equal(motifHasOrientation('ell'), true)
  assert.equal(motifHasOrientation('s-curve'), true)
  assert.equal(motifHasOrientation('diagonal'), true)
})

test('motifs work on a portrait frame too', () => {
  for (const k of ALL) {
    const paths = motifPaths(k, 1000, 1600)
    assert.ok(paths.length > 0)
    if (k === 'radial') continue
    for (const p of paths) for (const q of p) {
      assert.ok(q.x >= -1e-6 && q.x <= 1000 + 1e-6, `${k} portrait: x outside`)
      assert.ok(q.y >= -1e-6 && q.y <= 1600 + 1e-6, `${k} portrait: y outside`)
    }
  }
})
