// Grid maths for the drawing-grid tool.
//
// Pure functions, no DOM — the canvas drawing lives in the component, but
// everything that decides WHERE the lines go is here so it can be tested.
//
// ── The model ───────────────────────────────────────────────────────────────
// The canvas size is the source of truth. It fixes the frame's aspect ratio;
// the photo is panned and zoomed INSIDE that frame (never stretched); and the
// grid divides the frame. Because the frame is the canvas shape and the cells
// are square by construction, the grid on screen and the grid the artist
// pencils onto the canvas are the same grid at a different scale.
//
// This is the opposite of asking the artist to nudge the column count until
// the cells happen to come out square, which is what the tools that start
// from the PHOTO's shape have to do.

/** Units the artist thinks in. Everything internal is inches. */
export type Unit = 'in' | 'cm'

export const CM_PER_INCH = 2.54

export function toInches(value: number, unit: Unit): number {
  return unit === 'cm' ? value / CM_PER_INCH : value
}

export function fromInches(inches: number, unit: Unit): number {
  return unit === 'cm' ? inches * CM_PER_INCH : inches
}

export interface GridSpec {
  /** Columns across the canvas. Whole number. */
  cols:      number
  /** Full rows that fit. Whole number. */
  rows:      number
  /** Side of one cell, in the unit the caller passed in. */
  cellSize:  number
  /** Rows including the partial one, e.g. 10.67. */
  rowsExact: number
  /**
   * True when the squares divide the canvas height evenly, so there is no
   * stub row along the bottom.
   *
   * A stub is not an error — plenty of artists grid a canvas that way — but
   * it is worth telling them, because a perfect fit is usually one column
   * either side and makes counting squares on the canvas much easier.
   */
  exactFit:  boolean
  /** Height of the leftover strip along the bottom, in the caller's unit. */
  remainder: number
}

/** Tolerance for "divides evenly" — a sixty-fourth of an inch. */
const EPS = 1 / 64

/**
 * Grid from a column count.
 *
 * Cells are square, so the column count alone determines everything: the cell
 * is canvasW/cols on a side, and however many of those fit down the height is
 * the row count.
 */
export function gridFromColumns(
  canvasW: number, canvasH: number, cols: number,
): GridSpec {
  const c = Math.max(1, Math.round(cols))
  const cellSize = canvasW / c
  return finish(canvasW, canvasH, c, cellSize)
}

/**
 * Grid from a square size — "I want two-inch squares".
 *
 * The size artists reach for first, because it is the one they will actually
 * measure on the canvas with a ruler.
 */
export function gridFromSquareSize(
  canvasW: number, canvasH: number, size: number,
): GridSpec {
  const s = Math.max(1e-6, size)
  // Columns must be whole, so the requested size is honoured as closely as a
  // whole number of columns allows. Asking for 3in squares on a 16in canvas
  // gives 5 columns of 3.2in, not 5.33 columns of exactly 3in — you cannot
  // draw a third of a square.
  const cols = Math.max(1, Math.round(canvasW / s))
  return finish(canvasW, canvasH, cols, canvasW / cols)
}

function finish(canvasW: number, canvasH: number, cols: number, cellSize: number): GridSpec {
  const rowsExact = canvasH / cellSize
  const rows      = Math.floor(rowsExact + EPS)
  const remainder = canvasH - rows * cellSize
  return {
    cols,
    rows,
    cellSize,
    rowsExact,
    exactFit:  remainder < EPS || Math.abs(remainder - cellSize) < EPS,
    remainder: remainder < EPS ? 0 : remainder,
  }
}

function gcd(a: number, b: number): number {
  while (b) { [a, b] = [b, a % b] }
  return a
}

/**
 * Square sizes that divide the canvas evenly in BOTH directions.
 *
 * Offered as one-tap suggestions, because "what square size gives me whole
 * squares on a 16 × 20 canvas?" is arithmetic nobody should do by hand, and
 * getting it wrong is what produces the stub row.
 *
 * Works on a fine integer lattice (eighths of an inch, or millimetres) so
 * fractional canvas sizes like 11.5in still work, then keeps the sizes that
 * land in a usable column count.
 */
export function perfectFitSquareSizes(
  canvasW: number, canvasH: number, unit: Unit,
  { minCols = 3, maxCols = 40 }: { minCols?: number; maxCols?: number } = {},
): number[] {
  // Lattice fine enough to express the sizes artists use: 1/8in, or 1mm.
  const perUnit = unit === 'cm' ? 10 : 8
  const w = Math.round(canvasW * perUnit)
  const h = Math.round(canvasH * perUnit)
  if (w < 1 || h < 1) return []

  const g = gcd(w, h)
  const out: number[] = []
  for (let d = 1; d <= g; d++) {
    if (g % d !== 0) continue
    const cols = w / d
    if (cols < minCols || cols > maxCols) continue
    out.push(d / perUnit)
  }
  // Largest squares first: fewer, bigger cells is the friendlier default, and
  // it puts the sizes a painter actually wants at the front of the list.
  return out.sort((a, b) => b - a).slice(0, 6)
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
 * Column labels: 1, 2, 3 … Row labels: A, B … Z, AA, AB.
 *
 * Numbers across and letters down is the convention the printed grid guides
 * use, so a cell is "C4" to the artist without them having to learn anything.
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
