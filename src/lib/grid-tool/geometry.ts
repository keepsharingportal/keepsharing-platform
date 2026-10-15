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

export interface Placement {
  /** Drawn size of the image, before rotation. */
  dw: number
  dh: number
  /** Rotation in radians, applied about the frame's centre. */
  angle: number
  /** Image centre relative to the frame centre, in the ROTATED frame. */
  offsetX: number
  offsetY: number
  /** How far the image can travel on each axis before a gap appears. */
  overflowX: number
  overflowY: number
}

/**
 * The frame's bounding box measured in the image's own rotated axes.
 *
 * Rotating the image by θ is the same as rotating the frame by −θ and leaving
 * the image alone. A frame of w × h, so rotated, needs a box this big — which
 * is why a tilted photo has to be scaled UP to keep the corners covered.
 */
function rotatedFrameExtent(frameW: number, frameH: number, angleRad: number) {
  const c = Math.abs(Math.cos(angleRad))
  const s = Math.abs(Math.sin(angleRad))
  return { w: frameW * c + frameH * s, h: frameW * s + frameH * c }
}

/** The image's own bounding box once rotated — how much room it needs. */
function rotatedImageExtent(imgW: number, imgH: number, angleRad: number) {
  const c = Math.abs(Math.cos(angleRad))
  const s = Math.abs(Math.sin(angleRad))
  return { w: imgW * c + imgH * s, h: imgW * s + imgH * c }
}

/**
 * How far the zoom can travel, where 1 is "fills the frame".
 *
 * ── Why zooming out past 1 has to be allowed ────────────────────────────────
 * Cover was the floor at first, on the reasoning that a gap is a blank patch
 * with nothing useful to paint in. That is true of a gap you did not ask for
 * and wrong as a hard limit: a tall photo on a wide canvas is cropped to
 * ribbons at cover, and the artist cannot even SEE the composition they are
 * choosing between. Deciding what to leave out requires looking at the whole
 * picture first.
 *
 * So `min` is the scale at which the entire photo sits inside the frame —
 * letterboxed, deliberately, and visibly. Anything from there to 4x is the
 * artist's call.
 *
 * It is a ratio of two scales that both track the frame size, so it depends
 * on the frame's SHAPE and not its resolution: the preview and the export
 * agree about what "fit" means.
 */
export function zoomBounds(
  frameW: number, frameH: number, imgW: number, imgH: number, angleDeg = 0,
): { min: number; max: number } {
  const angle = (angleDeg * Math.PI) / 180
  const fext  = rotatedFrameExtent(frameW, frameH, angle)
  const iext  = rotatedImageExtent(imgW, imgH, angle)
  const cover   = Math.max(fext.w / imgW, fext.h / imgH)
  const contain = Math.min(frameW / iext.w, frameH / iext.h)
  if (!isFinite(cover) || cover <= 0) return { min: 1, max: 4 }
  return { min: Math.min(1, contain / cover), max: 4 }
}

/**
 * Place the photo inside the frame, at any rotation.
 *
 * zoom 1 covers exactly: no gap at any corner. Above 1 crops in further.
 * Below 1 is allowed down to zoomBounds().min, where the whole photo is
 * visible and the frame is letterboxed on purpose — see that function for
 * why refusing to zoom out was wrong.
 *
 * The cover at zoom 1 is computed against the rotated frame's bounding box.
 * A tilted photo is where a naive fit fails, because the corners swing
 * outside the frame long before the edges do; scaling to the bounding box is
 * slightly generous (at some angles you could pan a touch further) and is
 * never wrong, which is the right way round for this. Straightening a horizon
 * therefore pushes the photo in rather than opening a corner.
 *
 * panX/panY are 0..1 across whatever overflow is left, so the framing survives
 * a change of resolution — the preview and the exported file frame
 * identically. Zoomed out there is no overflow, so the photo simply centres.
 */
export function placeImage(
  frameW: number, frameH: number,
  imgW:   number, imgH:   number,
  zoom:   number, panX:   number, panY: number,
  angleDeg = 0,
): Placement {
  const angle = (angleDeg * Math.PI) / 180
  const ext   = rotatedFrameExtent(frameW, frameH, angle)
  const base  = Math.max(ext.w / imgW, ext.h / imgH)
  const { min } = zoomBounds(frameW, frameH, imgW, imgH, angleDeg)
  const s     = base * Math.max(min, zoom)
  const dw    = imgW * s
  const dh    = imgH * s
  const overflowX = Math.max(0, dw - ext.w)
  const overflowY = Math.max(0, dh - ext.h)
  return {
    dw, dh, angle, overflowX, overflowY,
    // 0.5 is centred; 0 pushes the image right to reveal its left edge.
    offsetX: (0.5 - clamp01(panX)) * overflowX,
    offsetY: (0.5 - clamp01(panY)) * overflowY,
  }
}

/**
 * Is a frame corner actually covered by the placed image?
 *
 * Used by the tests. Takes a point relative to the frame centre, undoes the
 * placement, and asks whether it lands inside the image rectangle.
 */
export function framePointIsCovered(
  p: Placement, x: number, y: number, tolerance = 1e-6,
): boolean {
  const cos = Math.cos(-p.angle)
  const sin = Math.sin(-p.angle)
  // Into the rotated frame, then relative to the image centre.
  const rx = x * cos - y * sin - p.offsetX
  const ry = x * sin + y * cos - p.offsetY
  return Math.abs(rx) <= p.dw / 2 + tolerance
      && Math.abs(ry) <= p.dh / 2 + tolerance
}

/**
 * Turn a drag in screen pixels into a change in pan.
 *
 * Pan lives in the image's rotated axes, so on a photo turned 90° a horizontal
 * drag is a vertical pan. Without this the picture slides sideways when you
 * pull it down, which feels broken immediately.
 */
export function dragToPan(
  dxScreen: number, dyScreen: number, angleDeg: number,
  overflowX: number, overflowY: number,
): { dPanX: number; dPanY: number } {
  const a   = (angleDeg * Math.PI) / 180
  const cos = Math.cos(-a)
  const sin = Math.sin(-a)
  const dx  = dxScreen * cos - dyScreen * sin
  const dy  = dxScreen * sin + dyScreen * cos
  return {
    dPanX: overflowX > 0 ? dx / overflowX : 0,
    dPanY: overflowY > 0 ? dy / overflowY : 0,
  }
}

/** Normalise any angle to 0..359.999. */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360
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
