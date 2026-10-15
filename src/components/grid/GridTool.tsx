'use client'

// ── Drawing grid tool ───────────────────────────────────────────────────────
//
// Put a grid over a reference photo so it can be copied square-by-square onto
// a canvas.
//
// ── Why the canvas size drives everything ───────────────────────────────────
// Most grid tools start from the photo: they grid the image, then discover the
// cells aren't square and ask the artist to nudge the column count until they
// are. That is backwards. The grid has to match the CANVAS, because the canvas
// is where the drawing happens.
//
// So the canvas dimensions fix the frame's aspect ratio, the photo is panned
// and zoomed inside that frame (never stretched), and the grid divides the
// frame into a plain number of columns and rows.
//
// ── Why there is no "square cells" requirement ──────────────────────────────
// The frame is ALREADY the canvas's shape, so 4 x 5 cells on the photo and
// 4 x 5 cells on the canvas are rectangles of the same proportion. The
// transfer is exact whether or not they happen to be square. Insisting on
// square cells is what forces the column-nudging and the leftover stub row;
// dropping it means the artist asks for four rows and gets four rows.
//
// ── The output that matters ─────────────────────────────────────────────────
// Not the gridded picture — the MEASUREMENTS. The artist is standing at a
// canvas with a ruler, so the tool lists exactly where each line falls along
// each edge, in sixteenths of an inch, because no ruler is marked 3.2.
//
// ── Everything stays on the device ──────────────────────────────────────────
// The photo is read with FileReader and drawn to a <canvas>. It is never sent
// anywhere. Faster, works offline, and a reference photo of someone's family
// doesn't land on a server.
//
// ── One draw function ───────────────────────────────────────────────────────
// The preview and the exported file call the same drawScene() at different
// resolutions, with the transform stored in resolution-independent terms. They
// cannot drift apart: what you compose is what you download.
//
// ── Neutral by design ───────────────────────────────────────────────────────
// Explicit slate colours rather than the app's brand tokens, so the tool
// carries no publication's identity wherever it is mounted.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Upload, Download, Printer, RotateCcw, RotateCw, RefreshCw, Ruler,
  FlipHorizontal, FlipVertical,
  Image as ImageIcon, ChevronDown, Maximize2, Check,
} from 'lucide-react'
import {
  type Unit, toInches, fromInches,
  linePositions, squareRowsFor, formatRuler,
  placeImage, dragToPan, zoomBounds, clamp01, formatSize, columnLabel, rowLabel,
  printedLineWidthMm,
} from '@/lib/grid-tool/geometry'

// Stretcher-bar and paper sizes people actually buy. Stored in inches; the cm
// view converts, so a metric artist sees 30.5 x 40.6 rather than a different
// and subtly wrong set of "metric" sizes.
const PRESETS: { label: string; w: number; h: number }[] = [
  { label: '5 × 7',   w: 5,     h: 7     },
  { label: '8 × 10',  w: 8,     h: 10    },
  { label: '9 × 12',  w: 9,     h: 12    },
  { label: '11 × 14', w: 11,    h: 14    },
  { label: '12 × 16', w: 12,    h: 16    },
  { label: '16 × 20', w: 16,    h: 20    },
  { label: '18 × 24', w: 18,    h: 24    },
  { label: '24 × 30', w: 24,    h: 30    },
  { label: '24 × 36', w: 24,    h: 36    },
  { label: '12 × 12', w: 12,    h: 12    },
  { label: '20 × 20', w: 20,    h: 20    },
  { label: 'Letter',  w: 8.5,   h: 11    },
  { label: 'A4',      w: 8.27,  h: 11.69 },
  { label: 'A3',      w: 11.69, h: 16.54 },
]

/** Long edge of the exported PNG. 3000px prints cleanly to ~10in at 300dpi. */
const EXPORT_LONG_EDGE = 3000

const SETTINGS_KEY = 'ks-grid-tool-settings-v2'

interface Settings {
  unit:        Unit
  canvasW:     number   // always stored in inches
  canvasH:     number
  cols:        number
  rows:        number
  /** Convenience: picks the row count that makes cells nearest to square. */
  squareCells: boolean
  lineWidth:   number   // px against a 1000px-wide frame; scales with output
  lineColor:   string
  lineOpacity: number   // 0..1
  showLabels:  boolean
  showDiagonals: boolean
  bw:          boolean
  valueIntensity: number // contrast %, 100 = untouched
  brightness:  number    // %, 100 = untouched
  posterize:   number    // 0 = off, else 2..10 tonal steps
}

const DEFAULTS: Settings = {
  unit: 'in', canvasW: 16, canvasH: 20,
  cols: 4, rows: 5, squareCells: false,
  lineWidth: 4, lineColor: '#ff0000', lineOpacity: 1,
  showLabels: true, showDiagonals: false,
  bw: false, valueIntensity: 100, brightness: 100, posterize: 0,
}

// ── Drawing ─────────────────────────────────────────────────────────────────

interface SceneOpts extends Settings {
  frameW: number
  frameH: number
  gutter: number
  zoom:   number
  panX:   number
  panY:   number
  /** Total rotation in degrees: quarter turns plus the straighten tilt. */
  angle:  number
  flipH:  boolean
  flipV:  boolean
}

/**
 * Draw the whole thing — photo, effects, grid, labels — at any resolution.
 *
 * Shared by the preview and the export so they cannot disagree. Every size is
 * derived from frameW, so doubling the resolution doubles the line weight and
 * the label size along with it.
 */
function drawScene(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  o: SceneOpts,
) {
  const { frameW, frameH, gutter } = o
  const totalW = frameW + gutter * 2
  const totalH = frameH + gutter * 2

  ctx.clearRect(0, 0, totalW, totalH)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, totalW, totalH)

  const k  = frameW / 1000
  const lw = Math.max(0.5, o.lineWidth * k)

  if (!img) {
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(gutter, gutter, frameW, frameH)
  } else {
    ctx.save()
    ctx.beginPath()
    ctx.rect(gutter, gutter, frameW, frameH)
    ctx.clip()

    // Grayscale, brightness and contrast go through the canvas filter: it is
    // hardware-accelerated, and both the preview and the export use it, so any
    // browser quirk applies equally to what you see and what you save.
    const parts: string[] = []
    if (o.bw) parts.push('grayscale(1)')
    if (o.brightness !== 100) parts.push(`brightness(${o.brightness}%)`)
    if (o.valueIntensity !== 100) parts.push(`contrast(${o.valueIntensity}%)`)
    ctx.filter = parts.length ? parts.join(' ') : 'none'

    // Rotate about the FRAME centre, then offset, then flip about the
    // image centre. placeImage has already scaled the photo up enough that
    // the rotated corners still cover — see its header.
    const p = placeImage(frameW, frameH, img.naturalWidth, img.naturalHeight,
                         o.zoom, o.panX, o.panY, o.angle)
    ctx.translate(gutter + frameW / 2, gutter + frameH / 2)
    ctx.rotate(p.angle)
    ctx.translate(p.offsetX, p.offsetY)
    ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1)
    ctx.drawImage(img, -p.dw / 2, -p.dh / 2, p.dw, p.dh)
    ctx.filter = 'none'
    ctx.restore()

    // Posterise needs per-pixel work — no canvas filter does it. Flattening
    // the photo to a few tones is how a painter reads VALUE rather than
    // detail, which is most of what the grid is for.
    if (o.posterize >= 2) {
      posterizeRegion(ctx, gutter, gutter, frameW, frameH, o.posterize)
    }
  }

  // ── Grid ──────────────────────────────────────────────────────────────────
  // Columns and rows are independent, so every cell is a full cell and the
  // lines land exactly where the measurement list says they do.
  const cols = Math.max(1, Math.round(o.cols))
  const rows = Math.max(1, Math.round(o.rows))
  const cw = frameW / cols
  const ch = frameH / rows

  ctx.save()
  ctx.globalAlpha = o.lineOpacity
  ctx.strokeStyle = o.lineColor
  ctx.lineWidth   = lw
  ctx.lineCap     = 'butt'

  ctx.beginPath()
  // Half-pixel offset keeps an odd-width line crisp instead of smeared across
  // two pixel columns.
  for (let c = 1; c < cols; c++) {
    const x = Math.round(gutter + c * cw) + (lw % 2 ? 0.5 : 0)
    ctx.moveTo(x, gutter)
    ctx.lineTo(x, gutter + frameH)
  }
  for (let r = 1; r < rows; r++) {
    const y = Math.round(gutter + r * ch) + (lw % 2 ? 0.5 : 0)
    ctx.moveTo(gutter, y)
    ctx.lineTo(gutter + frameW, y)
  }
  ctx.stroke()

  // Border last and whole, so the frame edge is never half-drawn.
  ctx.strokeRect(gutter + lw / 2, gutter + lw / 2, frameW - lw, frameH - lw)

  if (o.showDiagonals) {
    // Corner-to-corner guides. Cheap, and they catch a drawing drifting out of
    // proportion long before the cells do.
    ctx.globalAlpha = o.lineOpacity * 0.55
    ctx.beginPath()
    ctx.moveTo(gutter, gutter);          ctx.lineTo(gutter + frameW, gutter + frameH)
    ctx.moveTo(gutter + frameW, gutter); ctx.lineTo(gutter, gutter + frameH)
    ctx.stroke()
  }
  ctx.restore()

  // ── Labels ────────────────────────────────────────────────────────────────
  // In the gutter rather than over the picture, so they never sit on top of
  // the thing being copied.
  if (o.showLabels && gutter > 0) {
    const fontPx = Math.min(gutter * 0.62, Math.min(cw, ch) * 0.6)
    ctx.save()
    ctx.fillStyle    = '#334155'
    ctx.font         = `600 ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    for (let c = 0; c < cols; c++) {
      const x = gutter + (c + 0.5) * cw
      const t = columnLabel(c)
      ctx.fillText(t, x, gutter * 0.5)
      ctx.fillText(t, x, gutter + frameH + gutter * 0.5)
    }
    for (let r = 0; r < rows; r++) {
      const y = gutter + (r + 0.5) * ch
      const t = rowLabel(r)
      ctx.fillText(t, gutter * 0.5, y)
      ctx.fillText(t, gutter + frameW + gutter * 0.5, y)
    }
    ctx.restore()
  }
}

/** Flatten a region to `steps` tonal levels per channel. */
function posterizeRegion(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, steps: number,
) {
  const iw = Math.max(1, Math.round(w))
  const ih = Math.max(1, Math.round(h))
  let data: ImageData
  try {
    data = ctx.getImageData(Math.round(x), Math.round(y), iw, ih)
  } catch {
    return // tainted canvas — shouldn't happen with a local file, but don't crash
  }
  const d = data.data
  const n = Math.max(2, Math.min(10, Math.round(steps)))
  // Lookup table beats dividing per channel per pixel — this runs over several
  // million pixels on export.
  const lut = new Uint8ClampedArray(256)
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.round(Math.round((v / 255) * (n - 1)) * (255 / (n - 1)))
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = lut[d[i]]
    d[i + 1] = lut[d[i + 1]]
    d[i + 2] = lut[d[i + 2]]
  }
  ctx.putImageData(data, Math.round(x), Math.round(y))
}

// ── Component ───────────────────────────────────────────────────────────────

export function GridTool() {
  const [s, setS]       = useState<Settings>(DEFAULTS)
  const [img, setImg]   = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0.5)
  const [panY, setPanY] = useState(0.5)
  // Rotation belongs to the PHOTO, not to the preferences, so it lives
  // beside zoom and pan and resets when a new photo is loaded.
  const [quarter, setQuarter] = useState(0)   // 0..3 quarter turns
  const [tilt, setTilt]       = useState(0)   // -45..45 straightening
  const [flipH, setFlipH]     = useState(false)
  const [flipV, setFlipV]     = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [printSrc, setPrintSrc] = useState<string>('')
  const [openSection, setOpenSection] = useState<string | null>('canvas')

  const wrapRef   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const [boxW, setBoxW] = useState(640)

  const angle = quarter * 90 + tilt

  const resetFraming = useCallback(() => {
    setZoom(1); setPanX(0.5); setPanY(0.5)
    setQuarter(0); setTilt(0); setFlipH(false); setFlipV(false)
  }, [])

  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS(prev => {
      const next = { ...prev, [k]: v }
      // Keeping cells square is a convenience, so it re-derives the rows
      // whenever anything it depends on moves. Turning it off leaves the rows
      // where they are rather than snapping back.
      if (next.squareCells && (k === 'cols' || k === 'canvasW' || k === 'canvasH' || k === 'squareCells')) {
        next.rows = squareRowsFor(next.canvasW, next.canvasH, next.cols)
      }
      return next
    })
  }, [])

  // Restore settings (never the photo — that would mean holding someone's
  // reference image in localStorage indefinitely).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) as Partial<Settings> })
    } catch { /* private mode, blocked storage — defaults are fine */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }, [s])

  // Track available width so the preview fills a phone and doesn't overflow a
  // laptop.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width))
    ro.observe(el)
    setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const u       = s.unit
  const cwDisp  = fromInches(s.canvasW, u)
  const chDisp  = fromInches(s.canvasH, u)
  const cellW   = cwDisp / Math.max(1, s.cols)
  const cellH   = chDisp / Math.max(1, s.rows)
  const acrossMarks = useMemo(() => linePositions(cwDisp, s.cols), [cwDisp, s.cols])
  const downMarks   = useMemo(() => linePositions(chDisp, s.rows), [chDisp, s.rows])
  const nearSquare  = Math.abs(cellW - cellH) < 0.02

  // Preview size: fit the canvas aspect into the available box, leaving room
  // for the label gutter.
  const preview = useMemo(() => {
    const maxW = Math.max(240, boxW)
    const maxH = 620
    const ar   = s.canvasW / s.canvasH
    let fw = maxW, fh = maxW / ar
    if (fh > maxH) { fh = maxH; fw = maxH * ar }
    const gutter = s.showLabels ? Math.max(18, Math.min(fw, fh) * 0.06) : 0
    const shrink = Math.min(1, maxW / (fw + gutter * 2))
    return { fw: fw * shrink, fh: fh * shrink, gutter: gutter * shrink }
  }, [boxW, s.canvasW, s.canvasH, s.showLabels])

  // ── Render the preview ────────────────────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
    const totalW = preview.fw + preview.gutter * 2
    const totalH = preview.fh + preview.gutter * 2
    cv.width  = Math.round(totalW * dpr)
    cv.height = Math.round(totalH * dpr)
    cv.style.width  = `${totalW}px`
    cv.style.height = `${totalH}px`
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    drawScene(ctx, img, {
      ...s,
      frameW: preview.fw, frameH: preview.fh, gutter: preview.gutter,
      zoom, panX, panY, angle, flipH, flipV,
    })
  }, [img, s, preview, zoom, panX, panY, angle, flipH, flipV])

  // ── Loading a photo ───────────────────────────────────────────────────────
  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const im = new Image()
      im.onload = () => { setImg(im); resetFraming() }
      im.src = String(reader.result)
    }
    reader.readAsDataURL(file)
    setFileName(file.name)
  }, [])

  // ── Pan and pinch ─────────────────────────────────────────────────────────
  const drag  = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  // How far out the photo can go before the whole of it is visible. Depends
  // on the frame SHAPE and the angle, so it moves when either does.
  const zb = useMemo(() => (
    img ? zoomBounds(preview.fw, preview.fh, img.naturalWidth, img.naturalHeight, angle)
        : { min: 1, max: 4 }
  ), [img, preview.fw, preview.fh, angle])

  // A tilt or a turn can raise the floor under the current zoom — if it
  // does, follow it up rather than leaving the photo smaller than the frame.
  useEffect(() => { setZoom(z => (z < zb.min ? zb.min : z)) }, [zb.min])

  // The wheel listener is bound once per photo, so it cannot close over the
  // current floor. A ref keeps it reading the live value rather than the one
  // that happened to be in scope when it was attached.
  const zbRef = useRef(zb.min)
  useEffect(() => { zbRef.current = zb.min }, [zb.min])

  const overflow = useMemo(() => {
    if (!img) return { x: 0, y: 0 }
    const p = placeImage(preview.fw, preview.fh, img.naturalWidth, img.naturalHeight,
                         zoom, panX, panY, angle)
    return { x: p.overflowX, y: p.overflowY }
  }, [img, preview.fw, preview.fh, zoom, panX, panY, angle])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, px: panX, py: panY }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (!d || !img) return
    // Pan lives in the photo's own rotated axes, so a screen drag has to be
    // rotated into them — otherwise a turned photo slides sideways when you
    // pull it down. Dragging right reveals more of the image's left, hence
    // the minus.
    const { dPanX, dPanY } = dragToPan(
      e.clientX - d.x, e.clientY - d.y, angle, overflow.x, overflow.y,
    )
    setPanX(clamp01(d.px - dPanX))
    setPanY(clamp01(d.py - dPanY))
  }
  const endDrag = () => { drag.current = null }

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) { drag.current = null; pinch.current = { dist: touchDist(e), zoom } }
  }
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const p = pinch.current
    if (p && e.touches.length === 2) setZoom(clampZoom(p.zoom * (touchDist(e) / (p.dist || 1)), zbRef.current))
  }
  const onTouchEnd = () => { pinch.current = null }

  // Wheel-to-zoom needs a NON-passive listener, attached by hand.
  //
  // React attaches its onWheel passively, so preventDefault() inside it is
  // ignored: the canvas would zoom and the page would scroll out from under it
  // at the same time, which makes framing a crop almost impossible. Only bound
  // while a photo is loaded, so the empty state scrolls normally.
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !img) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => clampZoom(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), zbRef.current))
    }
    cv.addEventListener('wheel', onWheel, { passive: false })
    return () => cv.removeEventListener('wheel', onWheel)
  }, [img])

  // ── Export ────────────────────────────────────────────────────────────────
  const renderFull = useCallback((): HTMLCanvasElement | null => {
    const ar = s.canvasW / s.canvasH
    const frameW = ar >= 1 ? EXPORT_LONG_EDGE : EXPORT_LONG_EDGE * ar
    const frameH = ar >= 1 ? EXPORT_LONG_EDGE / ar : EXPORT_LONG_EDGE
    const gutter = s.showLabels ? Math.min(frameW, frameH) * 0.06 : 0
    const cv = document.createElement('canvas')
    cv.width  = Math.round(frameW + gutter * 2)
    cv.height = Math.round(frameH + gutter * 2)
    const ctx = cv.getContext('2d')
    if (!ctx) return null
    drawScene(ctx, img, { ...s, frameW, frameH, gutter, zoom, panX, panY, angle, flipH, flipV })
    return cv
  }, [s, img, zoom, panX, panY, angle, flipH, flipV])

  const download = useCallback(async () => {
    if (!img) return
    setBusy(true)
    // Yield a frame so the button's disabled state paints before the main
    // thread goes away for a few hundred milliseconds.
    await new Promise(r => setTimeout(r, 16))
    try {
      const cv = renderFull()
      if (!cv) return
      cv.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `grid-${formatSize(cwDisp)}x${formatSize(chDisp)}${u}-${s.cols}x${s.rows}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } finally { setBusy(false) }
  }, [img, renderFull, cwDisp, chDisp, u, s.cols, s.rows])

  const print = useCallback(async () => {
    if (!img) return
    setBusy(true)
    await new Promise(r => setTimeout(r, 16))
    try {
      const cv = renderFull()
      if (!cv) return
      setPrintSrc(cv.toDataURL('image/png'))
      // Let React commit the <img> before the print dialog snapshots the page.
      setTimeout(() => window.print(), 120)
    } finally { setBusy(false) }
  }, [img, renderFull])

  const measurementText = useMemo(() => [
    `Canvas ${formatSize(cwDisp)} × ${formatSize(chDisp)}${u} — ${s.cols} columns × ${s.rows} rows`,
    `Each cell ${formatRuler(cellW, u)} × ${formatRuler(cellH, u)}`,
    `Across the top: ${acrossMarks.map(m => formatRuler(m, u)).join('  ') || '(no interior lines)'}`,
    `Down the side: ${downMarks.map(m => formatRuler(m, u)).join('  ') || '(no interior lines)'}`,
  ].join('\n'), [cwDisp, chDisp, u, s.cols, s.rows, cellW, cellH, acrossMarks, downMarks])

  const copyMeasurements = useCallback(() => {
    navigator.clipboard?.writeText(measurementText).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1600) },
      () => { /* clipboard blocked — the list is on screen anyway */ },
    )
  }, [measurementText])

  const exportW   = s.canvasW >= s.canvasH ? EXPORT_LONG_EDGE : EXPORT_LONG_EDGE * (s.canvasW / s.canvasH)
  const printedMm = printedLineWidthMm(s.lineWidth * (exportW / 1000), exportW, 10)

  const setCanvasDim = (which: 'w' | 'h', raw: string) => {
    const v = parseFloat(raw)
    if (!isFinite(v) || v <= 0) return
    set(which === 'w' ? 'canvasW' : 'canvasH', toInches(Math.min(200, v), u))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr] print:block">

      {/* ── Preview ─────────────────────────────────────────────────────── */}
      {/* First in the DOM on mobile: the picture is the thing you look at, and
          burying it under a settings panel means scrolling past the controls
          every time you nudge the crop. */}
      <section className="lg:order-2 print:hidden">
        <div
          ref={wrapRef}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) loadFile(f)
          }}
          className={`rounded-xl border-2 border-dashed p-3 transition-colors sm:p-4 ${
            dragOver ? 'border-slate-900 bg-slate-100' : 'border-slate-300 bg-slate-100/60'
          }`}
        >
          {!img ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg py-16 text-center"
            >
              <ImageIcon className="h-10 w-10 text-slate-400" aria-hidden />
              <span className="text-base font-semibold text-slate-900">Choose a photo</span>
              <span className="max-w-xs text-sm text-slate-500">
                Or drag one here. Your photo stays on your device — it is never uploaded.
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center">
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="max-w-full cursor-grab touch-none rounded-md shadow-sm active:cursor-grabbing"
                aria-label="Gridded reference photo. Drag to reposition, pinch or scroll to zoom."
              />
              <p className="mt-3 text-center text-xs text-slate-500">
                Drag to reposition · pinch or scroll to zoom
              </p>
            </div>
          )}
        </div>

        {/* ── The measurements ────────────────────────────────────────────
            The actual product. Everything above is how you decide what these
            numbers should be; this is what you carry to the canvas. */}
        {img && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Ruler className="h-4 w-4" aria-hidden />
                Mark your {formatSize(cwDisp)} × {formatSize(chDisp)}{u} canvas
              </h2>
              <button
                type="button" onClick={copyMeasurements}
                className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? <><Check className="mr-1 inline h-3 w-3" aria-hidden />Copied</> : 'Copy'}
              </button>
            </div>

            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  Across the top — {s.cols} columns, {acrossMarks.length} line{acrossMarks.length === 1 ? '' : 's'}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {acrossMarks.length === 0
                    ? <span className="text-sm text-slate-400">No interior lines</span>
                    : acrossMarks.map((m, i) => (
                        <span key={i} className="rounded bg-slate-100 px-2 py-1 font-mono text-sm tabular-nums text-slate-900">
                          {formatRuler(m, u)}
                        </span>
                      ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  Down the side — {s.rows} rows, {downMarks.length} line{downMarks.length === 1 ? '' : 's'}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {downMarks.length === 0
                    ? <span className="text-sm text-slate-400">No interior lines</span>
                    : downMarks.map((m, i) => (
                        <span key={i} className="rounded bg-slate-100 px-2 py-1 font-mono text-sm tabular-nums text-slate-900">
                          {formatRuler(m, u)}
                        </span>
                      ))}
                </dd>
              </div>
            </dl>

            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Each cell {formatRuler(cellW, u)} × {formatRuler(cellH, u)}
              {nearSquare && ' — square'}
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button" onClick={download} disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden />
                {busy ? 'Preparing…' : 'Download PNG'}
              </button>
              <button
                type="button" onClick={print} disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" aria-hidden /> Print
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <section className="space-y-3 lg:order-1 print:hidden">
        <input
          ref={fileRef} type="file" accept="image/*" className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }}
        />
        <button
          type="button" onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {img ? 'Change photo' : 'Upload photo'}
        </button>
        {fileName && <p className="truncate px-1 text-xs text-slate-500">{fileName}</p>}

        {/* ── Grid ────────────────────────────────────────────────────── */}
        <Section id="canvas" title="Canvas size" open={openSection} onToggle={setOpenSection}>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(['in', 'cm'] as Unit[]).map(x => (
              <button
                key={x} type="button" onClick={() => set('unit', x)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                  u === x ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >{x === 'in' ? 'Inches' : 'Centimetres'}</button>
            ))}
          </div>

          <div className="mt-3 flex items-end gap-2">
            <Field label="Width">
              <input
                type="number" min={1} max={200} step="0.1" value={round2(cwDisp)}
                onChange={e => setCanvasDim('w', e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </Field>
            <button
              type="button"
              onClick={() => setS(p => ({ ...p, canvasW: p.canvasH, canvasH: p.canvasW }))}
              title="Swap width and height"
              className="mb-1 rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              <span className="sr-only">Swap orientation</span>
            </button>
            <Field label="Height">
              <input
                type="number" min={1} max={200} step="0.1" value={round2(chDisp)}
                onChange={e => setCanvasDim('h', e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </Field>
          </div>

          <p className="mt-3 mb-1.5 text-xs font-medium text-slate-500">Common sizes</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => {
              const active = Math.abs(p.w - s.canvasW) < 0.02 && Math.abs(p.h - s.canvasH) < 0.02
              return (
                <button
                  key={p.label} type="button"
                  onClick={() => setS(prev => {
                    const next = { ...prev, canvasW: p.w, canvasH: p.h }
                    if (next.squareCells) next.rows = squareRowsFor(p.w, p.h, next.cols)
                    return next
                  })}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >{p.label}</button>
              )
            })}
          </div>
        </Section>

        <Section id="grid" title="Grid" open={openSection} onToggle={setOpenSection}>
          <Stepper
            label="Columns across" value={s.cols} min={1} max={24}
            onChange={v => set('cols', v)}
          />
          <Stepper
            label="Rows down" value={s.rows} min={1} max={24}
            onChange={v => set('rows', v)} disabled={s.squareCells}
            hint={s.squareCells ? 'Set by “keep cells square”' : undefined}
          />
          <Toggle
            label="Keep cells square"
            checked={s.squareCells}
            onChange={v => set('squareCells', v)}
          />
          <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
            {s.cols} × {s.rows} cells of {formatRuler(cellW, u)} × {formatRuler(cellH, u)}
            {nearSquare && ' (square)'}. Every cell is a full cell — no leftover strip.
          </p>

          <Toggle label="Row and column labels" checked={s.showLabels} onChange={v => set('showLabels', v)} />
          <Toggle label="Diagonal guides" checked={s.showDiagonals} onChange={v => set('showDiagonals', v)} />
        </Section>

        <Section id="framing" title="Framing" open={openSection} onToggle={setOpenSection}>
          {/* Zoom runs from "the whole photo fits" to 4x, not from "fills
              the frame". A tall photo on a wide canvas is cropped to ribbons
              at fill, and you cannot choose what to leave out without first
              seeing what there is. */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">Zoom</span>
              <span className="text-xs tabular-nums text-slate-500">
                {Math.round(zoom * 100)}%{Math.abs(zoom - zb.min) < 0.005 && zb.min < 0.999 ? " · whole photo" : ""}
              </span>
            </div>
            <input
              type="range"
              min={Math.round(zb.min * 100)} max={400} step={1}
              value={Math.round(zoom * 100)}
              onChange={e => setZoom(parseFloat(e.target.value) / 100)}
              className="h-6 w-full cursor-pointer accent-slate-900"
              aria-label="Zoom"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button" onClick={() => { setZoom(zb.min); setPanX(0.5); setPanY(0.5) }}
                disabled={zb.min >= 0.999}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-40"
              >Fit whole photo</button>
              <button
                type="button" onClick={() => { setZoom(1); setPanX(0.5); setPanY(0.5) }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50"
              >Fill canvas</button>
            </div>
            {zoom < 0.999 && (
              <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
                Zoomed out past the canvas shape, so the photo does not reach the edges. The
                blank margin prints white.
              </p>
            )}
          </div>

          {/* ── Rotate ──────────────────────────────────────────────────
              Quarter turns and a fine tilt are different jobs: one is "this
              photo is the wrong way round", the other is "the horizon is
              off". Separate controls, because a slider that has to do both
              can do neither precisely. */}
          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Rotate</span>
            <div className="flex gap-2">
              <button
                type="button" onClick={() => setQuarter(q => (q + 3) % 4)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> 90° left
              </button>
              <button
                type="button" onClick={() => setQuarter(q => (q + 1) % 4)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                <RotateCw className="h-4 w-4" aria-hidden /> 90° right
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">Straighten</span>
              <span className="text-xs tabular-nums text-slate-500">
                {tilt > 0 ? '+' : ''}{tilt}°
              </span>
            </div>
            <input
              type="range" min={-45} max={45} step={0.5} value={tilt}
              onChange={e => setTilt(parseFloat(e.target.value))}
              className="h-6 w-full cursor-pointer accent-slate-900"
              aria-label="Straighten"
            />
            {tilt !== 0 && (
              <button
                type="button" onClick={() => setTilt(0)}
                className="mt-1 text-xs font-medium text-slate-600 underline hover:text-slate-900"
              >
                Level it
              </button>
            )}
          </div>

          {/* ── Flip ────────────────────────────────────────────────────
              Mirroring a reference is an old studio trick: the composition
              arrives fresh and the errors you had stopped seeing jump out.
              Worth having next to the crop controls rather than buried with
              the photo effects. */}
          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Flip</span>
            <div className="flex gap-2">
              <button
                type="button" onClick={() => setFlipH(v => !v)}
                aria-pressed={flipH}
                className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium ${
                  flipH ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FlipHorizontal className="h-4 w-4" aria-hidden /> Mirror
              </button>
              <button
                type="button" onClick={() => setFlipV(v => !v)}
                aria-pressed={flipV}
                className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium ${
                  flipV ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FlipVertical className="h-4 w-4" aria-hidden /> Upside down
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Mirroring the reference is a quick way to check a composition — the errors you have
              stopped noticing tend to jump straight out.
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button" onClick={resetFraming}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              <Maximize2 className="h-4 w-4" aria-hidden /> Reset framing
            </button>
            <button
              type="button" onClick={() => { setS(DEFAULTS); resetFraming() }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset all
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            The photo is cropped to your canvas shape, never squashed, and it stays covered at
            any angle — a tilt zooms in rather than opening a gap in the corner.
          </p>
        </Section>

        <Section id="lines" title="Lines" open={openSection} onToggle={setOpenSection}>
          <Slider
            label="Thickness" value={s.lineWidth} min={1} max={16} step={0.5}
            onChange={v => set('lineWidth', v)}
            suffix={` · ≈${printedMm.toFixed(1)}mm printed 10in wide`}
          />
          <Field label="Colour" className="mt-4">
            <div className="flex items-center gap-2">
              <input
                type="color" value={s.lineColor}
                onChange={e => set('lineColor', e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white"
              />
              <div className="flex flex-wrap gap-1">
                {['#ff0000', '#000000', '#ffffff', '#00e5ff', '#39ff14', '#ff00ff'].map(c => (
                  <button
                    key={c} type="button" onClick={() => set('lineColor', c)}
                    style={{ background: c }}
                    className="h-6 w-6 rounded border border-slate-300" title={c}
                  ><span className="sr-only">{c}</span></button>
                ))}
              </div>
            </div>
          </Field>
          <Slider
            label="Opacity" value={Math.round(s.lineOpacity * 100)} min={10} max={100} step={5}
            onChange={v => set('lineOpacity', v / 100)} suffix="%"
          />
          <p className="mt-2 text-xs text-slate-500">
            Lines need to read from across the room. Thickness scales with the download, so what
            you see here is what prints.
          </p>
        </Section>

        <Section id="photo" title="Photo" open={openSection} onToggle={setOpenSection}>
          <Toggle label="Black &amp; white" checked={s.bw} onChange={v => set('bw', v)} />
          <Slider
            label="Value intensity" value={s.valueIntensity} min={0} max={200} step={5}
            onChange={v => set('valueIntensity', v)} suffix="%"
          />
          <Slider
            label="Brightness" value={s.brightness} min={40} max={160} step={5}
            onChange={v => set('brightness', v)} suffix="%"
          />
          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Value steps (posterise)</span>
            <div className="flex flex-wrap gap-1.5">
              {[0, 2, 3, 4, 5, 6, 8, 10].map(n => (
                <button
                  key={n} type="button" onClick={() => set('posterize', n)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    s.posterize === n ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >{n === 0 ? 'Off' : n}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Flattens the photo into a few tones so you can see the big shapes of light and dark
              instead of the detail.
            </p>
          </div>
        </Section>

        {/* ── Canvas size ─────────────────────────────────────────────── */}


        {/* ── Lines ───────────────────────────────────────────────────── */}


        {/* ── Photo ───────────────────────────────────────────────────── */}


        {/* ── Framing ─────────────────────────────────────────────────── */}

      </section>

      {/* Print-only output. A hidden node in the page prints far more reliably
          than opening a new window, which pop-up blockers eat. The measurements
          go with it — on paper, next to the easel, they are the point. */}
      {printSrc && (
        <div className="hidden print:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={printSrc} alt="Gridded reference" className="w-full" />
          <p className="mt-3 whitespace-pre-line text-center text-xs">{measurementText}</p>
        </div>
      )}
    </div>
  )
}

// ── Small building blocks ───────────────────────────────────────────────────

function Section({ id, title, open, onToggle, children }: {
  id: string; title: string; open: string | null
  onToggle: (v: string | null) => void; children: React.ReactNode
}) {
  const isOpen = open === id
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button" onClick={() => onToggle(isOpen ? null : id)} aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-slate-900 hover:bg-slate-50"
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {isOpen && <div className="border-t border-slate-200 px-4 pb-4 pt-3">{children}</div>}
    </div>
  )
}

function Field({ label, children, className = '' }: {
  label: string; children: React.ReactNode; className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

/**
 * A number with big +/- buttons either side.
 *
 * Not a slider: "I want four rows" is an exact intention, and hitting exactly
 * 4 on a slider with a fingertip on a phone is a game. The buttons are 44px so
 * they are a real touch target.
 */
function Stepper({ label, value, min, max, onChange, disabled, hint }: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void; disabled?: boolean; hint?: string
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <div className={`flex items-stretch gap-2 ${disabled ? 'opacity-50' : ''}`}>
        <button
          type="button" disabled={disabled} onClick={() => onChange(clamp(value - 1))}
          className="h-11 w-11 shrink-0 rounded-lg border border-slate-300 text-lg font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed"
          aria-label={`Fewer ${label}`}
        >−</button>
        <input
          type="number" min={min} max={max} value={value} disabled={disabled}
          onChange={e => { const n = parseInt(e.target.value, 10); if (isFinite(n)) onChange(clamp(n)) }}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold tabular-nums text-slate-900"
          aria-label={label}
        />
        <button
          type="button" disabled={disabled} onClick={() => onChange(clamp(value + 1))}
          className="h-11 w-11 shrink-0 rounded-lg border border-slate-300 text-lg font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed"
          aria-label={`More ${label}`}
        >+</button>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange, suffix = '' }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; suffix?: string
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-xs tabular-nums text-slate-500">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="h-6 w-full cursor-pointer accent-slate-900"
        aria-label={label}
      />
    </div>
  )
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="mt-4 flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <input
        type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="h-5 w-5 cursor-pointer accent-slate-900"
      />
    </label>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clampZoom(z: number, min = 1): number { return Math.max(min, Math.min(4, z)) }
function round2(n: number): number { return Math.round(n * 100) / 100 }
function touchDist(e: React.TouchEvent): number {
  const [a, b] = [e.touches[0], e.touches[1]]
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}
