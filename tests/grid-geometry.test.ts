import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toInches, fromInches,
  gridFromColumns, gridFromSquareSize, perfectFitSquareSizes,
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

test('columns give square cells and the right row count', () => {
  // 16 x 20 canvas, 8 columns -> 2in squares -> exactly 10 rows.
  const g = gridFromColumns(16, 20, 8)
  assert.equal(g.cols, 8)
  assert.equal(g.cellSize, 2)
  assert.equal(g.rows, 10)
  assert.equal(g.exactFit, true)
  assert.equal(g.remainder, 0)
})

test('a stub row is reported, not hidden', () => {
  // 16 x 20 with 6 columns -> 2.667in squares -> 7.5 rows.
  const g = gridFromColumns(16, 20, 6)
  assert.equal(g.rows, 7)
  assert.ok(Math.abs(g.rowsExact - 7.5) < 1e-9)
  assert.equal(g.exactFit, false)
  assert.ok(g.remainder > 0)
})

test('square size is honoured to the nearest whole column', () => {
  // You cannot draw a third of a column, so 3in squares on 16in become 5
  // columns of 3.2in rather than a fractional grid.
  const g = gridFromSquareSize(16, 20, 3)
  assert.equal(g.cols, 5)
  assert.ok(Math.abs(g.cellSize - 3.2) < 1e-9)
})

test('an exact square size stays exact', () => {
  const g = gridFromSquareSize(16, 20, 2)
  assert.equal(g.cols, 8)
  assert.equal(g.cellSize, 2)
  assert.equal(g.rows, 10)
  assert.equal(g.exactFit, true)
})

test('perfect-fit suggestions divide both sides evenly', () => {
  const sizes = perfectFitSquareSizes(16, 20, 'in')
  assert.ok(sizes.length > 0, 'expected suggestions for 16x20')
  for (const s of sizes) {
    assert.ok(Math.abs((16 / s) - Math.round(16 / s)) < 1e-6, `${s} does not divide 16`)
    assert.ok(Math.abs((20 / s) - Math.round(20 / s)) < 1e-6, `${s} does not divide 20`)
  }
  // 2in is the obvious answer for 16x20 and must be offered.
  assert.ok(sizes.some(s => Math.abs(s - 2) < 1e-9), `2in missing from ${sizes.join(', ')}`)
})

test('suggestions stay inside a usable column count', () => {
  // Nobody wants a 200-column grid, or a 2-column one.
  for (const s of perfectFitSquareSizes(16, 20, 'in')) {
    const cols = 16 / s
    assert.ok(cols >= 3 && cols <= 40, `${s}in gives ${cols} columns`)
  }
})

test('fractional canvas sizes still produce suggestions', () => {
  // 11.5 x 16 — a real panel size, and the kind of number that breaks a
  // naive integer-divisor approach.
  const sizes = perfectFitSquareSizes(11.5, 16, 'in')
  for (const s of sizes) {
    assert.ok(Math.abs((11.5 / s) - Math.round(11.5 / s)) < 1e-6)
    assert.ok(Math.abs((16 / s) - Math.round(16 / s)) < 1e-6)
  }
})

test('a canvas with no common divisor reports none rather than lying', () => {
  // Nothing sensible divides both, so the UI must not claim a perfect fit.
  const sizes = perfectFitSquareSizes(7, 13, 'in', { minCols: 3, maxCols: 40 })
  for (const s of sizes) {
    assert.ok(Math.abs((7 / s) - Math.round(7 / s)) < 1e-6)
    assert.ok(Math.abs((13 / s) - Math.round(13 / s)) < 1e-6)
  }
})

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
