// Grid maths for the drawing-grid tool.
//
// Pure functions, no DOM — the canvas drawing lives in the component, but
// everything that decides WHERE the lines go is here so it can be tested.
//
// ── The model ───────────────────────────────────────────────────────────────
// The canvas size is the source of truth. It fixes the frame's aspect ratio;
// the photo is panned and zoomed INSIDE that frame (never stretched); and the
// grid divides the frame into a plain number of columns and rows.
//
// ── Why square cells are not required ───────────────────────────────────────
// Grid tools tend to insist on square cells, which forces the artist to nudge
// the column count until the arithmetic happens to work and usually leaves a
// stub row along one edge.
//
// It is unnecessary. The frame is ALREADY the canvas's shape, so dividing it
// into 4 x 5 gives identical rectangles, and dividing the canvas into 4 x 5
// gives identical rectangles of the same proportion. The transfer is exact
// whether or not those rectangles happen to be square. Square cells are a
// convention, not a requirement.
//
// So the artist says "4 columns, 5 rows", gets exactly that, and never sees a
// partial cell. Square cells remain available as a convenience that picks the
// row count for them.

/** Units the artist thinks in. Everything internal is inches. */
export type Unit = 'in' | 'cm'

export const CM_PER_INCH = 2.54

export function toInches(value: number, unit: Unit): number {
  return unit === 'cm' ? value / CM_PER_INCH : value
}

export function fromInches(inches: number, unit: Unit): number {
  return unit === 'cm' ? inches * CM_PER_INCH : inches
}

/**
 * Where the interior lines fall along one edge.
 *
 * `divisions` cells means `divisions - 1` lines inside the border, evenly
 * spaced. Returned in the same unit as `size`.
 *
 * This is the number the artist actually needs: it is what they measure along
 * the edge of the canvas with a ruler before joining the marks up. Everything
 * else the tool shows is a means to this list.
 */
export function linePositions(size: number, divisions: number): number[] {
  const n = Math.max(1, Math.round(divisions))
  const step = size / n
  const out: number[] = []
  for (let i = 1; i < n; i++) out.push(i * step)
  return out
}

/**
 * Row count that makes the cells as close to square as whole rows allow.
 *
 * A convenience, not a constraint — see the note at the top of the file. The
 * rounding means the cells can be a touch off square; the UI quotes the real
 * cell size rather than claiming they are perfect.
 */
export function squareRowsFor(canvasW: number, canvasH: number, cols: number): number {
  const c = Math.max(1, Math.round(cols))
  return Math.max(1, Math.round(c * (canvasH / canvasW)))
}

export interface CoverTransform {
  /** Where to draw the image, relative to the frame's top-left corner. */
  dx: number
  dy: number
  dw: number
  dh: number
}

/**
 * Place the photo inside the frame.
 *
 * Always covers: the frame can never show a bare corner, because a gap would
 * become a blank patch on the reference and there is nothing useful to paint
 * there. zoom 1 is the tightest fit that still covers; panX/panY are 0..1
 * across whatever overflow that leaves, so the framing survives a change of
 * resolution — the on-screen preview and the exported file frame identically.
 */
export function coverTransform(
  frameW: number, frameH: number,
  imgW:   number, imgH:   number,
  zoom:   number, panX:   number, panY: number,
): CoverTransform {
  const base = Math.max(frameW / imgW, frameH / imgH)
  const s    = base * Math.max(1, zoom)
  const dw   = imgW * s
  const dh   = imgH * s
  return {
    dw, dh,
    dx: -(dw - frameW) * clamp01(panX),
    dy: -(dh - frameH) * clamp01(panY),
  }
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/** Trim trailing zeros so 2.0 reads "2" and 0.666 reads "0.67". */
export function formatSize(n: number): string {
  if (!isFinite(n)) return '—'
  const r = Math.round(n * 100) / 100
  return String(r)
}

/**
 * A measurement as it reads on a ruler.
 *
 * Inches in sixteenths, because an imperial ruler has no 3.2 on it — the
 * artist standing at the canvas wants 3 3/16, and converting in their head is
 * exactly the friction this tool exists to remove. Centimetres stay decimal,
 * which is how a metric ruler is marked.
 */
export function formatRuler(valueInUnit: number, unit: Unit): string {
  if (!isFinite(valueInUnit)) return '—'
  if (unit === 'cm') return `${Math.round(valueInUnit * 10) / 10} cm`

  const sixteenths = Math.round(valueInUnit * 16)
  const whole = Math.floor(sixteenths / 16)
  let num = sixteenths % 16
  if (num === 0) return `${whole}"`
  let den = 16
  while (num % 2 === 0) { num /= 2; den /= 2 }
  return whole === 0 ? `${num}/${den}"` : `${whole} ${num}/${den}"`
}

/**
 * Column labels: 1, 2, 3 … Row labels: A, B … Z, AA, AB.
 *
 * Numbers across and letters down is the convention printed grid guides use,
 * so a cell is "C4" to the artist without them having to learn anything.
 */
export function columnLabel(i: number): string {
  return String(i + 1)
}

export function rowLabel(i: number): string {
  let n = i, out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/**
 * Printed line width, in millimetres, for a line of `px` at the export width.
 *
 * The reason the tool asks for thickness at all is that the artist stands back
 * from the easel: a hairline that looks fine on a phone disappears on a sheet
 * pinned up across the room. Pixels mean nothing by themselves, so the UI
 * quotes the physical width the current settings will actually print.
 */
export function printedLineWidthMm(
  lineWidthPx: number, exportPxWide: number, printedWidthInches: number,
): number {
  if (exportPxWide <= 0) return 0
  return (lineWidthPx / exportPxWide) * printedWidthInches * 25.4
}
