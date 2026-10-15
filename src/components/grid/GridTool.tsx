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
// frame. The cells are square by construction, and the grid on screen is the
// same grid the artist pencils onto the canvas — just at a different scale.
// The tool can therefore state, in inches, exactly what to draw on the canvas.
//
// ── Everything stays on the device ──────────────────────────────────────────
// The photo is read with FileReader and drawn to a <canvas>. It is never sent
// anywhere. That is faster, works offline, and means a reference photo of
// someone's family doesn't land on a server.
//
// ── One draw function ───────────────────────────────────────────────────────
// The preview and the exported file call the same drawScene() at different
// resolutions, with a transform stored in resolution-independent terms. They
// cannot drift apart: what you compose is what you download.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Upload, Download, Printer, RotateCcw, RefreshCw, Grid3x3,
  Image as ImageIcon, ChevronDown, Maximize2,
} from 'lucide-react'
import {
  type Unit, toInches, fromInches,
  gridFromColumns, gridFromSquareSize, perfectFitSquareSizes,
  coverTransform, clamp01, formatSize, columnLabel, rowLabel,
  printedLineWidthMm,
} from '@/lib/grid-tool/geometry'

// ── Canvas presets ──────────────────────────────────────────────────────────
// Stretcher-bar and paper sizes people actually buy. Stored in inches; the cm
// view converts, so a metric artist sees 30.5 × 40.6 rather than a different
// and subtly wrong set of "metric" sizes.
const PRESETS: { label: string; w: number; h: number; group: string }[] = [
  { label: '5 × 7',   w: 5,    h: 7,     group: 'Canvas' },
  { label: '8 × 10',  w: 8,    h: 10,    group: 'Canvas' },
  { label: '9 × 12',  w: 9,    h: 12,    group: 'Canvas' },
  { label: '11 × 14', w: 11,   h: 14,    group: 'Canvas' },
  { label: '12 × 16', w: 12,   h: 16,    group: 'Canvas' },
  { label: '16 × 20', w: 16,   h: 20,    group: 'Canvas' },
  { label: '18 × 24', w: 18,   h: 24,    group: 'Canvas' },
  { label: '24 × 30', w: 24,   h: 30,    group: 'Canvas' },
  { label: '24 × 36', w: 24,   h: 36,    group: 'Canvas' },
  { label: '12 × 12', w: 12,   h: 12,    group: 'Square' },
  { label: '20 × 20', w: 20,   h: 20,    group: 'Square' },
  { label: 'Letter',  w: 8.5,  h: 11,    group: 'Paper'  },
  { label: 'A4',      w: 8.27, h: 11.69, group: 'Paper'  },
  { label: 'A3',      w: 11.69, h: 16.54, group: 'Paper' },
]

/** Long edge of the exported PNG. 3000px prints cleanly to ~10in at 300dpi. */
const EXPORT_LONG_EDGE = 3000

const SETTINGS_KEY = 'ks-grid-tool-settings-v1'

interface Settings {
  unit:        Unit
  canvasW:     number   // always stored in inches
  canvasH:     number
  gridMode:    'cols' | 'size'
  cols:        number
  squareIn:    number   // square size in inches
  lineWidth:   number   // px at the preview's reference width (see drawScene)
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
  gridMode: 'cols', cols: 8, squareIn: 2,
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

  // Line weight is authored against a 1000px-wide frame and scaled from there,
  // so the preview and a 3000px export show the same visual weight.
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
    // hardware-accelerated and both the preview and the export use it, so any
    // browser quirk applies equally to what you see and what you save.
    const parts: string[] = []
    if (o.bw) parts.push('grayscale(1)')
    if (o.brightness !== 100) parts.push(`brightness(${o.brightness}%)`)
    if (o.valueIntensity !== 100) parts.push(`contrast(${o.valueIntensity}%)`)
    ctx.filter = parts.length ? parts.join(' ') : 'none'

    const t = coverTransform(frameW, frameH, img.naturalWidth, img.naturalHeight, o.zoom, o.panX, o.panY)
    ctx.drawImage(img, gutter + t.dx, gutter + t.dy, t.dw, t.dh)
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
  const spec = o.gridMode === 'cols'
    ? gridFromColumns(o.canvasW, o.canvasH, o.cols)
    : gridFromSquareSize(o.canvasW, o.canvasH, o.squareIn)

  const cellPx = frameW / spec.cols

  ctx.save()
  ctx.globalAlpha = o.lineOpacity
  ctx.strokeStyle = o.lineColor
  ctx.lineWidth   = lw
  ctx.lineCap     = 'butt'

  ctx.beginPath()
  // Verticals. Half-pixel offset keeps a 1px line crisp instead of smeared
  // across two pixel columns.
  for (let c = 1; c < spec.cols; c++) {
    const x = Math.round(gutter + c * cellPx) + (lw % 2 ? 0.5 : 0)
    ctx.moveTo(x, gutter)
    ctx.lineTo(x, gutter + frameH)
  }
  // Horizontals, including the stub row's line when the squares don't divide
  // the height evenly — the artist needs to see where the short row starts.
  for (let r = 1; r * cellPx < frameH - 0.5; r++) {
    const y = Math.round(gutter + r * cellPx) + (lw % 2 ? 0.5 : 0)
    ctx.moveTo(gutter, y)
    ctx.lineTo(gutter + frameW, y)
  }
  ctx.stroke()

  // Border last and whole, so the frame edge is never half-drawn.
  ctx.strokeRect(gutter + lw / 2, gutter + lw / 2, frameW - lw, frameH - lw)

  if (o.showDiagonals) {
    // Corner-to-corner guides. Cheap, and they catch a drawing that is
    // drifting out of proportion long before the grid squares do.
    ctx.globalAlpha = o.lineOpacity * 0.55
    ctx.beginPath()
    ctx.moveTo(gutter, gutter);                   ctx.lineTo(gutter + frameW, gutter + frameH)
    ctx.moveTo(gutter + frameW, gutter);          ctx.lineTo(gutter, gutter + frameH)
    ctx.stroke()
  }
  ctx.restore()

  // ── Labels ────────────────────────────────────────────────────────────────
  // Drawn in the gutter rather than over the picture, so they never sit on top
  // of the thing being copied.
  if (o.showLabels && gutter > 0) {
    const fontPx = Math.min(gutter * 0.62, cellPx * 0.6)
    ctx.save()
    ctx.fillStyle    = '#334155'
    ctx.font         = `600 ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    for (let c = 0; c < spec.cols; c++) {
      const x = gutter + (c + 0.5) * cellPx
      const t = columnLabel(c)
      ctx.fillText(t, x, gutter * 0.5)
      ctx.fillText(t, x, gutter + frameH + gutter * 0.5)
    }
    const rowsDrawn = Math.ceil(frameH / cellPx)
    for (let r = 0; r < rowsDrawn; r++) {
      const yc = gutter + (r + 0.5) * cellPx
      if (yc > gutter + frameH) break
      const t = rowLabel(r)
      ctx.fillText(t, gutter * 0.5, yc)
      ctx.fillText(t, gutter + frameW + gutter * 0.5, yc)
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
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [printSrc, setPrintSrc] = useState<string>('')
  const [openSection, setOpenSection] = useState<string | null>('canvas')

  const wrapRef   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const [boxW, setBoxW] = useState(640)

  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS(prev => ({ ...prev, [k]: v }))
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

  // Track the available width so the preview fills it on a phone and doesn't
  // overflow on a laptop.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width))
    ro.observe(el)
    setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // ── Derived geometry ──────────────────────────────────────────────────────
  const spec = useMemo(
    () => s.gridMode === 'cols'
      ? gridFromColumns(s.canvasW, s.canvasH, s.cols)
      : gridFromSquareSize(s.canvasW, s.canvasH, s.squareIn),
    [s.gridMode, s.canvasW, s.canvasH, s.cols, s.squareIn],
  )

  const suggestions = useMemo(
    () => perfectFitSquareSizes(
      fromInches(s.canvasW, s.unit), fromInches(s.canvasH, s.unit), s.unit,
    ),
    [s.canvasW, s.canvasH, s.unit],
  )

  // Preview size: fit the canvas aspect into the available box, leaving room
  // for the label gutter.
  const preview = useMemo(() => {
    const maxW = Math.max(240, boxW)
    const maxH = 620
    const ar   = s.canvasW / s.canvasH
    let fw = maxW, fh = maxW / ar
    if (fh > maxH) { fh = maxH; fw = maxH * ar }
    const gutter = s.showLabels ? Math.max(18, Math.min(fw, fh) * 0.06) : 0
    // The gutter is extra, so shrink the frame to keep the whole thing inside.
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
      zoom, panX, panY,
    })
  }, [img, s, preview, zoom, panX, panY])

  // ── Loading a photo ───────────────────────────────────────────────────────
  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const im = new Image()
      im.onload = () => {
        setImg(im)
        setZoom(1); setPanX(0.5); setPanY(0.5)
      }
      im.src = String(reader.result)
    }
    reader.readAsDataURL(file)
    setFileName(file.name)
  }, [])

  // ── Pan and pinch ─────────────────────────────────────────────────────────
  // Pointer events cover mouse, trackpad and single-finger touch in one path;
  // two-finger pinch needs the touch events because pointer events give one
  // pointer at a time.
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  const overflow = useMemo(() => {
    if (!img) return { x: 0, y: 0 }
    const t = coverTransform(preview.fw, preview.fh, img.naturalWidth, img.naturalHeight, zoom, panX, panY)
    return { x: Math.max(0, t.dw - preview.fw), y: Math.max(0, t.dh - preview.fh) }
  }, [img, preview.fw, preview.fh, zoom, panX, panY])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, px: panX, py: panY }
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (!d || !img) return
    // Dragging right should move the picture right, which means revealing more
    // of its left — hence the minus.
    const nx = overflow.x > 0 ? d.px - (e.clientX - d.x) / overflow.x : 0.5
    const ny = overflow.y > 0 ? d.py - (e.clientY - d.y) / overflow.y : 0.5
    setPanX(clamp01(nx)); setPanY(clamp01(ny))
  }
  const endDrag = () => { drag.current = null }

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      drag.current = null
      pinch.current = { dist: touchDist(e), zoom }
    }
  }
  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const p = pinch.current
    if (p && e.touches.length === 2) {
      e.preventDefault()
      const ratio = touchDist(e) / (p.dist || 1)
      setZoom(clampZoom(p.zoom * ratio))
    }
  }
  const onTouchEnd = () => { pinch.current = null }

  // Wheel-to-zoom needs a NON-passive listener, attached by hand.
  //
  // React attaches its onWheel passively, so preventDefault() inside it is
  // ignored: the canvas would zoom and the page would scroll out from under
  // it at the same time, which makes framing a crop almost impossible. Only
  // bound while a photo is loaded, so the empty state scrolls normally.
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !img) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => clampZoom(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)))
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
    drawScene(ctx, img, { ...s, frameW, frameH, gutter, zoom, panX, panY })
    return cv
  }, [s, img, zoom, panX, panY])

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
        a.download = `grid-${formatSize(fromInches(s.canvasW, s.unit))}x${formatSize(fromInches(s.canvasH, s.unit))}${s.unit}-${spec.cols}col.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } finally {
      setBusy(false)
    }
  }, [img, renderFull, s.canvasW, s.canvasH, s.unit, spec.cols])

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
    } finally {
      setBusy(false)
    }
  }, [img, renderFull])

  // ── Readouts ──────────────────────────────────────────────────────────────
  const u          = s.unit
  const cellDisp   = fromInches(spec.cellSize, u)
  const cwDisp     = fromInches(s.canvasW, u)
  const chDisp     = fromInches(s.canvasH, u)
  const exportW    = s.canvasW >= s.canvasH ? EXPORT_LONG_EDGE : EXPORT_LONG_EDGE * (s.canvasW / s.canvasH)
  const printedMm  = printedLineWidthMm(s.lineWidth * (exportW / 1000), exportW, 10)

  const setCanvasDim = (which: 'w' | 'h', raw: string) => {
    const v = parseFloat(raw)
    if (!isFinite(v) || v <= 0) return
    const inches = toInches(Math.min(200, v), u)
    set(which === 'w' ? 'canvasW' : 'canvasH', inches)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] print:block">

      {/* ── Preview ─────────────────────────────────────────────────────── */}
      {/* First in the DOM on mobile: the picture is the thing you look at,
          and burying it under a settings panel on a phone means scrolling
          past the controls every time you nudge the crop. */}
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
          className={`rounded-xl border-2 border-dashed p-3 sm:p-4 transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
          }`}
        >
          {!img ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg py-16 text-center"
            >
              <ImageIcon className="h-10 w-10 text-muted-foreground" aria-hidden />
              <span className="text-base font-semibold">Choose a photo</span>
              <span className="max-w-xs text-sm text-muted-foreground">
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
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Drag to reposition · {typeof navigator !== 'undefined' && 'ontouchstart' in window
                  ? 'Pinch to zoom' : 'Scroll to zoom'}
              </p>
            </div>
          )}
        </div>

        {/* The number that matters: what to pencil onto the actual canvas. */}
        {img && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Grid3x3 className="h-4 w-4 text-primary" aria-hidden />
              On your {formatSize(cwDisp)} × {formatSize(chDisp)}{u} canvas
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Draw <strong className="text-foreground">{spec.cols} columns × {spec.rows} rows</strong> of{' '}
              <strong className="text-foreground">{formatSize(cellDisp)}{u}</strong> squares.
            </p>
            {!spec.exactFit && (
              <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Leaves a {formatSize(fromInches(spec.remainder, u))}{u} strip along the bottom.
                {suggestions.length > 0 && <> For whole squares try {suggestions.slice(0, 3).map(formatSize).join(', ')}{u}.</>}
              </p>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button" onClick={download} disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden />
                {busy ? 'Preparing…' : 'Download PNG'}
              </button>
              <button
                type="button" onClick={print} disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"
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
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {img ? 'Change photo' : 'Upload photo'}
        </button>
        {fileName && <p className="truncate px-1 text-xs text-muted-foreground">{fileName}</p>}

        {/* ── Canvas size ─────────────────────────────────────────────── */}
        <Section id="canvas" title="Canvas size" open={openSection} onToggle={setOpenSection}>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(['in', 'cm'] as Unit[]).map(x => (
              <button
                key={x} type="button" onClick={() => set('unit', x)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                  u === x ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >{x === 'in' ? 'Inches' : 'Centimetres'}</button>
            ))}
          </div>

          <div className="mt-3 flex items-end gap-2">
            <Field label="Width">
              <input
                type="number" min={1} max={200} step="0.1"
                value={round2(cwDisp)}
                onChange={e => setCanvasDim('w', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <button
              type="button"
              onClick={() => setS(p => ({ ...p, canvasW: p.canvasH, canvasH: p.canvasW }))}
              title="Swap width and height"
              className="mb-1 rounded-md border border-border p-2 hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              <span className="sr-only">Swap orientation</span>
            </button>
            <Field label="Height">
              <input
                type="number" min={1} max={200} step="0.1"
                value={round2(chDisp)}
                onChange={e => setCanvasDim('h', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <p className="mt-3 mb-1.5 text-xs font-medium text-muted-foreground">Common sizes</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => {
              const active = Math.abs(p.w - s.canvasW) < 0.02 && Math.abs(p.h - s.canvasH) < 0.02
              return (
                <button
                  key={p.label} type="button"
                  onClick={() => setS(prev => ({ ...prev, canvasW: p.w, canvasH: p.h }))}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                  }`}
                >{p.label}</button>
              )
            })}
          </div>
        </Section>

        {/* ── Grid ────────────────────────────────────────────────────── */}
        <Section id="grid" title="Grid" open={openSection} onToggle={setOpenSection}>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {([['cols', 'By count'], ['size', 'By square size']] as const).map(([k, label]) => (
              <button
                key={k} type="button" onClick={() => set('gridMode', k)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                  s.gridMode === k ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >{label}</button>
            ))}
          </div>

          {s.gridMode === 'cols' ? (
            <Slider
              label="Columns across" value={s.cols} min={2} max={40} step={1}
              onChange={v => set('cols', v)} suffix={` → ${spec.rows} rows`}
            />
          ) : (
            <>
              <Field label={`Square size (${u})`} className="mt-3">
                <input
                  type="number" min={0.1} step="0.25"
                  value={round2(fromInches(s.squareIn, u))}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (isFinite(v) && v > 0) set('squareIn', toInches(v, u))
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              {suggestions.length > 0 && (
                <>
                  <p className="mt-3 mb-1.5 text-xs font-medium text-muted-foreground">
                    Sizes that give whole squares
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map(sz => (
                      <button
                        key={sz} type="button"
                        onClick={() => set('squareIn', toInches(sz, u))}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent"
                      >{formatSize(sz)}{u}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {spec.cols} × {spec.rows} grid of {formatSize(cellDisp)}{u} squares
            {spec.exactFit ? ' — perfect fit' : ` + a ${formatSize(fromInches(spec.remainder, u))}${u} strip`}
          </p>

          <Toggle label="Row and column labels" checked={s.showLabels} onChange={v => set('showLabels', v)} />
          <Toggle label="Diagonal guides" checked={s.showDiagonals} onChange={v => set('showDiagonals', v)} />
        </Section>

        {/* ── Lines ───────────────────────────────────────────────────── */}
        <Section id="lines" title="Lines" open={openSection} onToggle={setOpenSection}>
          <Slider
            label="Thickness" value={s.lineWidth} min={1} max={16} step={0.5}
            onChange={v => set('lineWidth', v)}
            suffix={` · ≈${printedMm.toFixed(1)}mm printed 10in wide`}
          />
          <div className="mt-3 flex items-center gap-3">
            <Field label="Colour" className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="color" value={s.lineColor}
                  onChange={e => set('lineColor', e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-border bg-background"
                />
                <div className="flex flex-wrap gap-1">
                  {['#ff0000', '#000000', '#ffffff', '#00e5ff', '#39ff14', '#ff00ff'].map(c => (
                    <button
                      key={c} type="button" onClick={() => set('lineColor', c)}
                      style={{ background: c }}
                      className="h-6 w-6 rounded border border-border"
                      title={c}
                    ><span className="sr-only">{c}</span></button>
                  ))}
                </div>
              </div>
            </Field>
          </div>
          <Slider
            label="Opacity" value={Math.round(s.lineOpacity * 100)} min={10} max={100} step={5}
            onChange={v => set('lineOpacity', v / 100)} suffix="%"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Lines need to read from across the room. Thickness scales with the download, so what
            you see here is what prints.
          </p>
        </Section>

        {/* ── Photo ───────────────────────────────────────────────────── */}
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
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Value steps (posterise)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[0, 2, 3, 4, 5, 6, 8, 10].map(n => (
                <button
                  key={n} type="button" onClick={() => set('posterize', n)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    s.posterize === n ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                  }`}
                >{n === 0 ? 'Off' : n}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Flattens the photo into a few tones so you can see the big shapes of light and
              dark instead of the detail.
            </p>
          </div>
        </Section>

        {/* ── Framing ─────────────────────────────────────────────────── */}
        <Section id="framing" title="Framing" open={openSection} onToggle={setOpenSection}>
          <Slider
            label="Zoom" value={Math.round(zoom * 100)} min={100} max={400} step={5}
            onChange={v => setZoom(v / 100)} suffix="%"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => { setZoom(1); setPanX(0.5); setPanY(0.5) }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Maximize2 className="h-4 w-4" aria-hidden /> Fit to canvas
            </button>
            <button
              type="button" onClick={() => setS(DEFAULTS)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset all
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The photo is cropped to your canvas shape, never squashed. Drag it to choose what
            stays in.
          </p>
        </Section>
      </section>

      {/* Print-only output. A hidden node in the page prints far more reliably
          than opening a new window, which pop-up blockers eat. */}
      {printSrc && (
        <div className="hidden print:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={printSrc} alt="Gridded reference" className="w-full" />
          <p className="mt-2 text-center text-xs">
            {formatSize(cwDisp)} × {formatSize(chDisp)}{u} canvas · {spec.cols} × {spec.rows} grid
            of {formatSize(cellDisp)}{u} squares
          </p>
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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => onToggle(isOpen ? null : id)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold hover:bg-accent/50"
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {isOpen && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </div>
  )
}

function Field({ label, children, className = '' }: {
  label: string; children: React.ReactNode; className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Slider({ label, value, min, max, step, onChange, suffix = '' }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; suffix?: string
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="h-6 w-full cursor-pointer accent-primary"
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
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox" checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-5 w-5 cursor-pointer accent-primary"
      />
    </label>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clampZoom(z: number): number {
  return Math.max(1, Math.min(4, z))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function touchDist(e: React.TouchEvent): number {
  const [a, b] = [e.touches[0], e.touches[1]]
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}
