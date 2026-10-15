import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toInches, fromInches,
  linePositions, squareRowsFor, formatRuler,
  placeImage, framePointIsCovered, dragToPan, normalizeAngle,
  rowLabel, columnLabel, printedLineWidthMm,
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

// ── Framing, at any rotation ──────────────────────────────────────────────
//
// Rotation is where a cover-fit quietly breaks: the CORNERS of a tilted photo
// swing outside the frame long before its edges do, leaving blank wedges that
// there is nothing useful to paint in. So these check the corners directly
// rather than trusting the width and height.

/** The four frame corners, relative to the frame centre. */
function corners(fw: number, fh: number): Array<[number, number]> {
  return [[-fw / 2, -fh / 2], [fw / 2, -fh / 2], [fw / 2, fh / 2], [-fw / 2, fh / 2]]
}

test('every frame corner stays covered at every angle', () => {
  const angles = [0, 1, 7, 15, 30, 45, 60, 89, 90, 91, 135, 180, 237, 270, 359, -12, -45]
  for (const [fw, fh] of [[800, 1000], [1000, 800], [900, 900]] as const) {
    for (const [iw, ih] of [[4032, 3024], [3024, 4032], [2000, 2000], [6000, 2000]] as const) {
      for (const deg of angles) {
        for (const zoom of [1, 1.6, 3]) {
          for (const pan of [0, 0.5, 1]) {
            const p = placeImage(fw, fh, iw, ih, zoom, pan, pan, deg)
            for (const [x, y] of corners(fw, fh)) {
              assert.ok(
                framePointIsCovered(p, x, y, 1e-6),
                `gap at corner (${x},${y}) — frame ${fw}x${fh} img ${iw}x${ih} ${deg}° zoom ${zoom} pan ${pan}`,
              )
            }
          }
        }
      }
    }
  }
})

test('a tilted photo is scaled up, not left with holes', () => {
  // The whole point: at 45° the image must grow to keep the corners inside.
  const flat    = placeImage(800, 1000, 4000, 3000, 1, 0.5, 0.5, 0)
  const tilted  = placeImage(800, 1000, 4000, 3000, 1, 0.5, 0.5, 45)
  assert.ok(tilted.dw > flat.dw, 'tilt should require a larger draw')
})

test('zero rotation matches the un-rotated placement', () => {
  // Backwards compatibility: adding rotation must not move an untilted photo.
  const p = placeImage(800, 1000, 4000, 3000, 1, 0.5, 0.5, 0)
  assert.ok(Math.abs(p.dh - 1000) < 1e-6 || p.dh >= 1000)
  assert.equal(p.angle, 0)
  assert.ok(Math.abs(p.offsetX) < 1e-9, 'centred pan should not offset')
})

test('a 90° turn swaps which dimension has to cover which', () => {
  // A landscape photo turned upright has to cover the frame's HEIGHT with its
  // width, so it is scaled very differently from flat.
  const flat = placeImage(800, 1000, 4000, 3000, 1, 0.5, 0.5, 0)
  const turned = placeImage(800, 1000, 4000, 3000, 1, 0.5, 0.5, 90)
  assert.notEqual(Math.round(flat.dw), Math.round(turned.dw))
  for (const [x, y] of corners(800, 1000)) {
    assert.ok(framePointIsCovered(turned, x, y), 'gap after a quarter turn')
  }
})

test('zoom below 1 is clamped — cover is the floor', () => {
  const a = placeImage(800, 1000, 4000, 3000, 0.2, 0.5, 0.5, 20)
  const b = placeImage(800, 1000, 4000, 3000, 1, 0.5, 0.5, 20)
  assert.equal(a.dw, b.dw)
})

test('framing is resolution independent, rotated too', () => {
  // The exported file must frame exactly like the preview, or the artist
  // composes one picture and downloads another.
  const k = 6
  const small = placeImage(400, 500, 4000, 3000, 1.7, 0.3, 0.8, 17)
  const big   = placeImage(400 * k, 500 * k, 4000, 3000, 1.7, 0.3, 0.8, 17)
  assert.ok(Math.abs(small.dw * k - big.dw) < 1e-6)
  assert.ok(Math.abs(small.offsetX * k - big.offsetX) < 1e-6)
  assert.ok(Math.abs(small.offsetY * k - big.offsetY) < 1e-6)
  assert.equal(small.angle, big.angle)
})

test('pan 0 and 1 reach opposite edges', () => {
  const lo = placeImage(800, 1000, 6000, 2000, 1, 0, 0.5, 0)
  const hi = placeImage(800, 1000, 6000, 2000, 1, 1, 0.5, 0)
  assert.ok(lo.offsetX > 0, 'pan 0 should push the image right')
  assert.ok(hi.offsetX < 0, 'pan 1 should push the image left')
  assert.ok(Math.abs(lo.offsetX + hi.offsetX) < 1e-9, 'should be symmetric')
})

// ── Dragging a rotated photo ──────────────────────────────────────────────

test('a drag on an unrotated photo pans on the matching axis', () => {
  const d = dragToPan(100, 0, 0, 200, 200)
  assert.ok(Math.abs(d.dPanX - 0.5) < 1e-9)
  assert.ok(Math.abs(d.dPanY) < 1e-9)
})

test('a horizontal drag on a 90° photo pans vertically', () => {
  // Without this the picture slides sideways when you pull it down, which
  // feels broken the instant you try it.
  const d = dragToPan(100, 0, 90, 200, 200)
  assert.ok(Math.abs(d.dPanX) < 1e-9, `expected no x pan, got ${d.dPanX}`)
  assert.ok(Math.abs(Math.abs(d.dPanY) - 0.5) < 1e-9, `expected y pan, got ${d.dPanY}`)
})

test('dragging with no overflow does nothing rather than dividing by zero', () => {
  const d = dragToPan(100, 100, 30, 0, 0)
  assert.equal(d.dPanX, 0)
  assert.equal(d.dPanY, 0)
})

test('angles normalise into one turn', () => {
  assert.equal(normalizeAngle(0), 0)
  assert.equal(normalizeAngle(360), 0)
  assert.equal(normalizeAngle(450), 90)
  assert.equal(normalizeAngle(-90), 270)
  assert.equal(normalizeAngle(-450), 270)
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
