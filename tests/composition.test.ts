import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PHI, INV_PHI, INV_PHI2,
  thirdsLines, phiLines, centerLines, diagonalLines, armatureLines,
  goldenSpiralPath, overlayLines, type Line, type Point,
} from '@/lib/grid-tool/composition'

const W = 1600, H = 1000

/** Every line must stay inside the frame — an overlay that runs off the
 *  edge is drawn wrong, and clipping hides it instead of fixing it. */
function assertInside(lines: Line[], w = W, h = H, label = '') {
  for (const l of lines) {
    for (const [x, y] of [[l.x1, l.y1], [l.x2, l.y2]] as const) {
      assert.ok(x >= -1e-6 && x <= w + 1e-6, `${label}: x ${x} outside 0..${w}`)
      assert.ok(y >= -1e-6 && y <= h + 1e-6, `${label}: y ${y} outside 0..${h}`)
    }
  }
}

// ── Thirds and phi ─────────────────────────────────────────────────────────

test('thirds divides into exact thirds', () => {
  const l = thirdsLines(W, H)
  assert.equal(l.length, 4)
  assert.ok(Math.abs(l[0].x1 - W / 3) < 1e-9)
  assert.ok(Math.abs(l[1].x1 - 2 * W / 3) < 1e-9)
  assert.ok(Math.abs(l[2].y1 - H / 3) < 1e-9)
  assertInside(l, W, H, 'thirds')
})

test('phi divides at 0.382 and 0.618, not at thirds', () => {
  const l = phiLines(W, H)
  assert.ok(Math.abs(l[0].x1 - W * INV_PHI2) < 1e-9)
  assert.ok(Math.abs(l[1].x1 - W * INV_PHI) < 1e-9)
  // The whole point: phi sits nearer the centre than thirds.
  assert.ok(l[0].x1 > W / 3, 'first phi line should be inside the first third')
  assert.ok(l[1].x1 < 2 * W / 3, 'second phi line should be inside the second third')
  assertInside(l, W, H, 'phi')
})

test('phi constants are the real ones', () => {
  assert.ok(Math.abs(PHI - 1.6180339887) < 1e-9)
  assert.ok(Math.abs(INV_PHI - 0.6180339887) < 1e-9)
  assert.ok(Math.abs(INV_PHI2 - 0.3819660113) < 1e-9)
  // phi's defining property, as a guard against a typo'd literal.
  assert.ok(Math.abs(PHI * PHI - (PHI + 1)) < 1e-12)
})

test('centre and diagonals are what they say', () => {
  const c = centerLines(W, H)
  assert.ok(Math.abs(c[0].x1 - W / 2) < 1e-9)
  assert.ok(Math.abs(c[1].y1 - H / 2) < 1e-9)
  const d = diagonalLines(W, H)
  assert.deepEqual([d[0].x1, d[0].y1, d[0].x2, d[0].y2], [0, 0, W, H])
  assertInside([...c, ...d], W, H, 'centre/diagonals')
})

// ── Dynamic symmetry ───────────────────────────────────────────────────────

test('armature is 2 diagonals plus 4 reciprocals, all inside the frame', () => {
  const a = armatureLines(W, H)
  assert.equal(a.length, 6, `expected 6 lines, got ${a.length}`)
  assertInside(a, W, H, 'armature')
})

test('reciprocals are perpendicular to the diagonal they belong to', () => {
  // This is the defining property. If it fails the armature is decorative
  // rather than correct, and it would still look plausible on screen.
  const a = armatureLines(W, H)
  const slope = (l: Line) => (l.y2 - l.y1) / (l.x2 - l.x1)
  const mAC = slope(a[0])          // 0,0 -> W,H
  const mBD = slope(a[1])          // W,0 -> 0,H
  for (const l of a.slice(2, 4)) assert.ok(Math.abs(slope(l) * mAC + 1) < 1e-9, 'not perpendicular to AC')
  for (const l of a.slice(4, 6)) assert.ok(Math.abs(slope(l) * mBD + 1) < 1e-9, 'not perpendicular to BD')
})

test('the armature changes with the canvas — unlike thirds', () => {
  // The reason to offer it at all: thirds puts a line at 1/3 of ANY
  // rectangle; these come from the canvas's own diagonals.
  const a = armatureLines(1600, 1000)
  const b = armatureLines(1000, 1600)
  const sig = (ls: Line[]) => ls.map(l => [l.x1 / 1600, l.y1 / 1000].map(n => n.toFixed(4)).join()).join('|')
  assert.notEqual(sig(a), sig(b))
  // Thirds, by contrast, is the same fractions whatever the shape. Compared
  // with a tolerance because 1600/3/1600 and 1000/3/1000 differ in the last
  // bit — a float artefact, not a difference anyone could see.
  const t1 = thirdsLines(1600, 1000).map(l => l.x1 / 1600)
  const t2 = thirdsLines(1000, 1600).map(l => l.x1 / 1000)
  assert.equal(t1.length, t2.length)
  t1.forEach((v, i) => assert.ok(Math.abs(v - t2[i]) < 1e-12, `thirds fraction ${i} moved`))
})

test('a square canvas still produces a usable armature', () => {
  const a = armatureLines(1000, 1000)
  assert.equal(a.length, 6)
  assertInside(a, 1000, 1000, 'square armature')
})

test('a degenerate canvas returns nothing rather than NaN', () => {
  assert.deepEqual(armatureLines(0, 100), [])
  assert.deepEqual(armatureLines(100, 0), [])
})

// ── Golden spiral ──────────────────────────────────────────────────────────

test('the spiral is continuous — no jumps between arcs', () => {
  // Returned as a polyline precisely so this is assertable. A gap here is a
  // wrong arc direction, which looks almost right and reads as a broken
  // spiral.
  const pts = goldenSpiralPath(W, H)
  assert.ok(pts.length > 40, `too few points: ${pts.length}`)
  const span = Math.hypot(W, H)
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    assert.ok(d < span * 0.12, `jump of ${d.toFixed(1)}px at point ${i}`)
  }
})

test('the spiral stays inside the frame', () => {
  for (const [w, h] of [[1600, 1000], [1000, 1600], [1000, 1000]] as const) {
    for (const flipX of [false, true]) {
      for (const flipY of [false, true]) {
        for (const p of goldenSpiralPath(w, h, { flipX, flipY })) {
          assert.ok(p.x >= -1e-6 && p.x <= w + 1e-6, `x ${p.x} outside`)
          assert.ok(p.y >= -1e-6 && p.y <= h + 1e-6, `y ${p.y} outside`)
        }
      }
    }
  }
})

test('the spiral winds inward', () => {
  // Each successive arc is smaller, so the path should converge rather than
  // wander. Distance from the first point to the last should exceed the
  // spread of the final few points.
  const pts = goldenSpiralPath(W, H)
  const tail = pts.slice(-10)
  let spread = 0
  for (let i = 1; i < tail.length; i++) {
    spread = Math.max(spread, Math.hypot(tail[i].x - tail[0].x, tail[i].y - tail[0].y))
  }
  const overall = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y)
  assert.ok(spread < overall, 'spiral does not appear to converge')
})

test('flipping mirrors the spiral about the frame', () => {
  const a = goldenSpiralPath(W, H, { flipX: false })
  const b = goldenSpiralPath(W, H, { flipX: true })
  assert.equal(a.length, b.length)
  for (let i = 0; i < a.length; i++) {
    assert.ok(Math.abs((W - a[i].x) - b[i].x) < 1e-6, `point ${i} not mirrored`)
    assert.ok(Math.abs(a[i].y - b[i].y) < 1e-6, `point ${i} y should not move`)
  }
})

test('four orientations are four distinct paths', () => {
  const key = (p: Point[]) => p.slice(0, 6).map(q => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join('|')
  const seen = new Set<string>()
  for (const flipX of [false, true]) for (const flipY of [false, true]) {
    seen.add(key(goldenSpiralPath(W, H, { flipX, flipY })))
  }
  assert.equal(seen.size, 4)
})

// ── Dispatch ───────────────────────────────────────────────────────────────

test('overlayLines dispatches every straight-line kind', () => {
  for (const k of ['thirds', 'phi', 'center', 'diagonals', 'armature'] as const) {
    const l = overlayLines(k, W, H)
    assert.ok(l.length > 0, `${k} produced nothing`)
    assertInside(l, W, H, k)
  }
})

test('overlays are resolution independent', () => {
  // Preview and export must agree, exactly as the grid does.
  const k = 3
  for (const kind of ['thirds', 'phi', 'armature', 'diagonals', 'center'] as const) {
    const small = overlayLines(kind, W, H)
    const big   = overlayLines(kind, W * k, H * k)
    assert.equal(small.length, big.length)
    for (let i = 0; i < small.length; i++) {
      assert.ok(Math.abs(small[i].x1 * k - big[i].x1) < 1e-6, `${kind} line ${i} not scaled`)
      assert.ok(Math.abs(small[i].y2 * k - big[i].y2) < 1e-6, `${kind} line ${i} not scaled`)
    }
  }
})
