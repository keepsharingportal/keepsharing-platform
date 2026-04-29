'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { RefreshCw, Check } from 'lucide-react'

// ── Grid generator ────────────────────────────────────────────────────────────

const DIRECTIONS = [
  [0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]
] as const

type Placement = { word: string; positions: [number,number][] }

export function generateGrid(rawWords: string[], size = 15): { grid: string[][]; placements: Placement[] } {
  const words = rawWords.map(w => w.toUpperCase().replace(/\s+/g,''))
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''))
  const placements: Placement[] = []
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  for (const word of words) {
    let placed = false
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const [dr,dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
      const maxR = size - (dr > 0 ? word.length : dr < 0 ? word.length : 0)
      const maxC = size - (dc > 0 ? word.length : dc < 0 ? word.length : 0)
      const minR = dr < 0 ? word.length - 1 : 0
      const minC = dc < 0 ? word.length - 1 : 0
      if (maxR <= minR || maxC <= minC) continue
      const sr = minR + Math.floor(Math.random() * (maxR - minR))
      const sc = minC + Math.floor(Math.random() * (maxC - minC))

      let valid = true
      const positions: [number,number][] = []
      for (let i = 0; i < word.length; i++) {
        const r = sr + i * dr, c = sc + i * dc
        if (r < 0 || r >= size || c < 0 || c >= size) { valid = false; break }
        if (grid[r][c] && grid[r][c] !== word[i]) { valid = false; break }
        positions.push([r,c])
      }
      if (valid) {
        for (let i = 0; i < word.length; i++) grid[positions[i][0]][positions[i][1]] = word[i]
        placements.push({ word, positions })
        placed = true
      }
    }
  }

  // Fill empty cells
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)]

  return { grid, placements }
}

// ── Colour palette for found words ───────────────────────────────────────────

const WORD_COLORS = [
  '#C9A84B','#4a7c59','#5b7fc9','#c95b4a','#7c4a9a','#4a8c9a','#9a7c4a','#7c8c4a',
]

// ── Component ─────────────────────────────────────────────────────────────────

type GridData = { grid: string[][]; placements: Placement[] }

interface Props {
  puzzleId: string
  title: string
  words: string[]
  gridData: GridData
  sponsorName?: string | null
  prizeAmount?: string | null
}

export function WordSearchGame({ puzzleId, title, words, gridData, sponsorName, prizeAmount }: Props) {
  const [selecting, setSelecting]   = useState(false)
  const [startCell, setStartCell]   = useState<[number,number] | null>(null)
  const [currentCells, setCurrent]  = useState<[number,number][]>([])
  const [foundWords, setFoundWords] = useState<string[]>([])
  const [colorMap, setColorMap]     = useState<Record<string, string>>({})  // word → colour
  const [highlightMap, setHighlightMap] = useState<Map<string,string>>(new Map()) // "r,c" → colour
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash]           = useState<string | null>(null)

  const wordSet = words.map(w => w.toUpperCase().replace(/\s+/g,''))
  const allFound = foundWords.length === wordSet.length

  const cellKey = (r: number, c: number) => `${r},${c}`

  const getCellsBetween = useCallback((a: [number,number], b: [number,number]): [number,number][] => {
    const [ar,ac] = a, [br,bc] = b
    const dr = Math.sign(br-ar), dc = Math.sign(bc-ac)
    const lenR = Math.abs(br-ar), lenC = Math.abs(bc-ac)
    // Only allow 8 directions (straight lines)
    if (lenR !== 0 && lenC !== 0 && lenR !== lenC) return []
    const len = Math.max(lenR, lenC)
    const cells: [number,number][] = []
    for (let i = 0; i <= len; i++) cells.push([ar + i*dr, ac + i*dc])
    return cells
  }, [])

  const checkWord = useCallback((cells: [number,number][]) => {
    const forward = cells.map(([r,c]) => gridData.grid[r][c]).join('')
    const backward = [...cells].reverse().map(([r,c]) => gridData.grid[r][c]).join('')

    for (const w of wordSet) {
      if ((forward === w || backward === w) && !foundWords.includes(w)) {
        const color = WORD_COLORS[foundWords.length % WORD_COLORS.length]
        setFoundWords(prev => [...prev, w])
        setColorMap(prev => ({ ...prev, [w]: color }))
        setHighlightMap(prev => {
          const next = new Map(prev)
          for (const [r,c] of cells) next.set(cellKey(r,c), color)
          return next
        })
        setFlash(w)
        setTimeout(() => setFlash(null), 1500)
        return
      }
    }
  }, [wordSet, foundWords, gridData.grid])

  const onMouseDown = (r: number, c: number) => {
    setSelecting(true)
    setStartCell([r,c])
    setCurrent([[r,c]])
  }

  const onMouseEnter = (r: number, c: number) => {
    if (!selecting || !startCell) return
    const cells = getCellsBetween(startCell, [r,c])
    setCurrent(cells.length >= 2 ? cells : [startCell])
  }

  const onMouseUp = () => {
    if (currentCells.length >= 2) checkWord(currentCells)
    setSelecting(false)
    setStartCell(null)
    setCurrent([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/word-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_entry',
          puzzleId,
          name,
          email,
          foundWords,
          completed: allFound,
        }),
      })
      setSubmitted(true)
    } catch { setSubmitted(true) }
    finally { setSubmitting(false) }
  }

  // Prevent text selection during drag
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prevent = (e: Event) => { if (selecting) e.preventDefault() }
    document.addEventListener('selectstart', prevent)
    return () => document.removeEventListener('selectstart', prevent)
  }, [selecting])

  const NAVY = '#0B1829'
  const GOLD = '#C9A84B'

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ backgroundColor: NAVY, fontFamily: 'Georgia, serif', color: '#F4EFE4' }}
      onMouseUp={onMouseUp}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {sponsorName && (
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: GOLD }}>
              The {sponsorName} Word Search Challenge
            </div>
          )}
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {prizeAmount && (
            <div className="text-sm" style={{ color: '#D8D0C0' }}>
              🏆 Win <strong style={{ color: GOLD }}>{prizeAmount}</strong> — find all words and enter below
            </div>
          )}
        </div>

        {/* Flash message */}
        {flash && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full font-bold text-sm shadow-xl" style={{ backgroundColor: GOLD, color: NAVY }}>
            ✓ Found: {flash}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Grid */}
          <div ref={gridRef} className="select-none" style={{ userSelect: 'none' }}>
            <table className="border-collapse" style={{ borderSpacing: 0 }}>
              <tbody>
                {gridData.grid.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => {
                      const key   = cellKey(r,c)
                      const hlColor = highlightMap.get(key)
                      const isSelecting = currentCells.some(([cr,cc]) => cr===r && cc===c)

                      return (
                        <td
                          key={c}
                          onMouseDown={() => onMouseDown(r,c)}
                          onMouseEnter={() => onMouseEnter(r,c)}
                          style={{
                            width: 28, height: 28,
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: 0,
                            cursor: 'pointer',
                            borderRadius: 4,
                            backgroundColor: hlColor
                              ? hlColor
                              : isSelecting
                              ? 'rgba(201,168,75,0.35)'
                              : 'rgba(255,255,255,0.05)',
                            color: hlColor ? NAVY : '#F4EFE4',
                            transition: 'background-color 0.1s',
                            userSelect: 'none',
                          }}
                        >
                          {cell}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Word list + entry form */}
          <div className="flex-1 space-y-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: GOLD }}>
                Find These Words ({foundWords.length}/{wordSet.length})
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {words.map((w,i) => {
                  const upper = w.toUpperCase().replace(/\s+/g,'')
                  const isFound = foundWords.includes(upper)
                  const color = colorMap[upper]
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm"
                      style={{
                        backgroundColor: isFound ? (color + '22') : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isFound ? color : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >
                      {isFound && <Check size={12} style={{ color, flexShrink: 0 }} />}
                      <span style={{
                        textDecoration: isFound ? 'line-through' : 'none',
                        color: isFound ? color : '#D8D0C0',
                        fontWeight: isFound ? 700 : 400,
                      }}>
                        {w}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Entry form */}
            {!submitted ? (
              <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#162844', borderColor: '#1E3558' }}>
                <div className="text-sm font-bold mb-1">Enter the Contest</div>
                <div className="text-xs mb-4" style={{ color: '#9A9288' }}>
                  {allFound ? 'You found all the words! Enter below.' : 'Enter now — you can submit with any words found.'}
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#9A9288' }}>Full Name *</label>
                    <input required value={name} onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                      style={{ backgroundColor: '#0B1829', color: '#F4EFE4', border: '1px solid #1E3558' }}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#9A9288' }}>Email *</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                      style={{ backgroundColor: '#0B1829', color: '#F4EFE4', border: '1px solid #1E3558' }}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="text-xs" style={{ color: '#8B7340' }}>
                    Words found: {foundWords.join(', ') || 'None yet'}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 text-sm font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}
                  >
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : null}
                    Submit My Entry
                  </button>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl p-5 border text-center" style={{ backgroundColor: '#162844', borderColor: GOLD }}>
                <div className="text-2xl mb-2">🎉</div>
                <div className="font-bold mb-1">Entry Submitted!</div>
                <div className="text-sm" style={{ color: '#D8D0C0' }}>
                  Thanks, {name}! You found {foundWords.length} of {wordSet.length} words.
                  {prizeAmount && <> Winner announced by email.</>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
