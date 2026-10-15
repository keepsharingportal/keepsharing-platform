import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toInches, fromInches,
  linePositions, squareRowsFor, formatRuler,
  coverTransform, rowLabel, columnLabel, printedLineWidthMm,
} from '@/lib/grid-tool/geometry'

// The whole point of the tool is that the grid on the screen and the grid the
// artist pencils onto the canvas are the same grid. If this maths is wrong the
// drawing is wrong, and they won't find out until the painting is half done.

test('units round-trip', () => {
  assert.equal(toInches(2.54, 'cm'), 1)
  assert.equal(toInches(5, 'in'), 5)
  assert.ok(Math.abs(fromInches(1, 'cm') - 2.54) < 1e-9)
})

// ── Line positions — the numbers the artist measures ──────────────────────

test('4 columns across 16in puts lines at 4, 8, 12', () => {
  assert.deepEqual(linePositions(16, 4), [4, 8, 12])
})

test('5 rows down 20in puts lines at 4, 8, 12, 16', () => {
  assert.deepEqual(linePositions(20, 5), [4, 8, 12, 16])
})

test('n divisions give n-1 interior lines, never a line on the border', () => {
  for (const n of [1, 2, 3, 7, 12, 24]) {
    const p = linePositions(16, n)
    assert.equal(p.length, n - 1, `${n} divisions`)
    for (const x of p) {
      assert.ok(x > 0 && x < 16, `line at ${x} is on or outside the border`)
    }
  }
})

test('one division has no interior lines', () => {
  assert.deepEqual(linePositions(16, 1), [])
})

test('positions are evenly spaced even when they do not divide evenly', () => {
  // 16 / 5 = 3.2 — a perfectly good grid, and the old square-cell model would
  // have refused it or left a stub.
  const p = linePositions(16, 5)
  assert.equal(p.length, 4)
  for (let i = 1; i < p.length; i++) {
    assert.ok(Math.abs((p[i] - p[i - 1]) - 3.2) < 1e-9)
  }
})

// ── Ruler formatting — an imperial ruler has no 3.2 on it ──────────────────

test('whole inches read as whole numbers', () => {
  assert.equal(formatRuler(4, 'in'), '4"')
  assert.equal(formatRuler(12, 'in'), '12"')
})

test('fractions reduce to the lowest terms a ruler is marked in', () => {
  assert.equal(formatRuler(2.5, 'in'),   '2 1/2"')
  assert.equal(formatRuler(3.25, 'in'),  '3 1/4"')
  assert.equal(formatRuler(1.125, 'in'), '1 1/8"')
  assert.equal(formatRuler(0.0625, 'in'), '1/16"')
})

test('3.2in becomes the number on the ruler, not the decimal', () => {
  // 3.2 * 16 = 51.2 -> 51/16 -> 3 3/16
  assert.equal(formatRuler(3.2, 'in'), '3 3/16"')
})

test('a bare fraction drops the leading zero', () => {
  assert.equal(formatRuler(0.5, 'in'), '1/2"')
})

test('centimetres stay decimal, because a metric ruler is', () => {
  assert.equal(formatRuler(8.128, 'cm'), '8.1 cm')
  assert.equal(formatRuler(10, 'cm'), '10 cm')
})

// ── Square cells as a convenience, not a constraint ────────────────────────

test('square rows match the canvas proportion', () => {
  assert.equal(squareRowsFor(16, 20, 4), 5)   // 4in cells, exactly square
  assert.equal(squareRowsFor(16, 20, 8), 10)
  assert.equal(squareRowsFor(12, 12, 6), 6)
})

test('square rows round rather than refuse', () => {
  // 11 x 14 with 4 columns -> 4 * 14/11 = 5.09 -> 5 rows. Slightly off square,
  // and the UI quotes the real cell size rather than claiming otherwise.
  assert.equal(squareRowsFor(11, 14, 4), 5)
  assert.ok(squareRowsFor(11, 14, 1) >= 1)
})

// ── Framing ────────────────────────────────────────────────────────────────

test('cover transform never leaves a gap in the frame', () => {
  // A landscape photo in a portrait frame is the case that exposes a
  // fit-instead-of-cover bug: it letterboxes, and the artist gets blank bands
  // to paint.
  for (const [fw, fh] of [[800, 1000], [1000, 800], [900, 900]] as const) {
    for (const [iw, ih] of [[4000, 3000], [3000, 4000], [2000, 2000]] as const) {
      for (const zoom of [1, 1.5, 3]) {
        for (const pan of [0, 0.5, 1]) {
          const t = coverTransform(fw, fh, iw, ih, zoom, pan, pan)
          assert.ok(t.dw >= fw - 1e-6 && t.dh >= fh - 1e-6, 'image smaller than frame')
          assert.ok(t.dx <= 1e-6 && t.dy <= 1e-6, 'gap at top/left')
          assert.ok(t.dx + t.dw >= fw - 1e-6, 'gap at right')
          assert.ok(t.dy + t.dh >= fh - 1e-6, 'gap at bottom')
        }
      }
    }
  }
})

test('zoom below 1 is clamped — cover is the floor', () => {
  const a = coverTransform(800, 1000, 4000, 3000, 0.2, 0.5, 0.5)
  const b = coverTransform(800, 1000, 4000, 3000, 1, 0.5, 0.5)
  assert.equal(a.dw, b.dw)
  assert.equal(a.dh, b.dh)
})

test('framing is resolution independent', () => {
  // The exported file must frame exactly like the preview, or the artist
  // composes one picture and downloads another.
  const small = coverTransform(400, 500, 4000, 3000, 1.7, 0.3, 0.8)
  const big   = coverTransform(2400, 3000, 4000, 3000, 1.7, 0.3, 0.8)
  const k = 6
  assert.ok(Math.abs(small.dx * k - big.dx) < 1e-6)
  assert.ok(Math.abs(small.dy * k - big.dy) < 1e-6)
  assert.ok(Math.abs(small.dw * k - big.dw) < 1e-6)
})

test('labels follow the printed-grid convention', () => {
  assert.equal(columnLabel(0), '1')
  assert.equal(columnLabel(11), '12')
  assert.equal(rowLabel(0), 'A')
  assert.equal(rowLabel(25), 'Z')
  assert.equal(rowLabel(26), 'AA')
  assert.equal(rowLabel(27), 'AB')
})

test('printed line width is quoted in real millimetres', () => {
  // 6px on a 3000px-wide export, printed 10in wide: 6/3000 * 10in = 0.02in.
  const mm = printedLineWidthMm(6, 3000, 10)
  assert.ok(Math.abs(mm - 0.508) < 1e-3, `got ${mm}`)
})
