// The composition guides must NOT depend on the transfer grid being on.
//
// They were, once: the overlay drawing sat inside `if (o.showGrid)`, so rule
// of thirds and the motifs were invisible until you switched the grid lines
// on — which is backwards. You settle the composition FIRST and the grid
// arrives afterwards to copy it, so the guides have to draw with the grid
// still off.
//
// This is a structural test over the source, in the same spirit as the
// brand-host tests. The draw routine renders to a canvas, which node has no
// business standing up just to count strokes; what actually broke here was
// one brace in the wrong place, and that is a thing source can be asked about
// directly.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const SRC = fs.readFileSync('src/components/grid/GridTool.tsx', 'utf8')

/** Index just past the `}` that closes the block opened at `openIdx`. */
function endOfBlock(src: string, openIdx: number): number {
  let depth = 0
  for (let i = src.indexOf('{', openIdx); i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') { depth--; if (depth === 0) return i }
  }
  return -1
}

test('the grid gate closes before the composition overlays are drawn', () => {
  const gate = SRC.indexOf('if (o.showGrid) {')
  assert.ok(gate > 0, 'no `if (o.showGrid)` gate found — has the draw routine been renamed?')

  const gateEnd = endOfBlock(SRC, gate)
  assert.ok(gateEnd > 0, 'the showGrid gate never closes')

  const overlays = SRC.indexOf('const anyOverlay =')
  assert.ok(overlays > 0, 'no overlay block found')

  assert.ok(
    overlays > gateEnd,
    'the composition overlays are drawn INSIDE the showGrid gate, so rule of ' +
    'thirds and the motifs only appear once the transfer grid is switched on',
  )
})

test('the overlays draw when a motif is set, with no geometric guide on', () => {
  // `anyOverlay` decides whether the overlay pass runs at all. If it only
  // consulted `o.overlays`, picking a shape on its own would draw nothing.
  const line = SRC.split(/\r?\n/).find(l => l.includes('const anyOverlay ='))
  assert.ok(line, 'no anyOverlay assignment')
  assert.match(line!, /o\.motif/, 'anyOverlay ignores the motif')
})

test('the grid starts hidden', () => {
  // The grid is for copying a settled composition. Up front it sits on top of
  // the very thing you are still trying to judge.
  assert.match(SRC, /showGrid:\s*false/, 'showGrid no longer defaults to false')
})
