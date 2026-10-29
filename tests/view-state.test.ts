// Squared must open with nothing drawn over the picture.
//
// The defaults were always blank; what broke it was localStorage faithfully
// restoring last session's guides, so opening the tool and refreshing both
// came back with rule of thirds and the grid already on.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { blankView, VIEW_STATE_KEYS } from '@/lib/grid-tool/view-state'

const SRC = fs.readFileSync('src/components/grid/GridTool.tsx', 'utf8')

/** A saved blob from someone mid-session, with guides on. */
const SAVED = {
  unit: 'cm', canvasW: 11, canvasH: 14,
  cols: 7, rows: 9, squareCells: true,
  lineWidth: 6, lineColor: '#39ff14', lineOpacity: 0.8, showLabels: false,
  overlays: { thirds: true, phi: true, spiral: false, armature: true, diagonals: false, center: false },
  motif: 'radial', motifFlipX: true, motifFlipY: true,
  spiralFlipX: true, spiralFlipY: true,
  showGrid: true,
  overlayColor: '#ff00ff', overlayOpacity: 0.5,
  bw: true, valueIntensity: 140, brightness: 90, posterize: 5,
}

test('every view-state field is dropped', () => {
  const out = blankView(SAVED) as Record<string, unknown>
  for (const k of VIEW_STATE_KEYS) {
    assert.ok(!(k in out), `${k} survived and will redraw itself on open`)
  }
})

test('the grid and the guides are the fields being dropped', () => {
  // Named explicitly, so deleting one from the list is a failing test rather
  // than a silent return of the bug.
  for (const k of ['overlays', 'motif', 'showGrid']) {
    assert.ok((VIEW_STATE_KEYS as readonly string[]).includes(k), `${k} is no longer reset on open`)
  }
})

test('real preferences are kept', () => {
  // Canvas size, colours and line weight are how you have the tool set up.
  // Forgetting those on every visit would be its own bug.
  const out = blankView(SAVED) as Record<string, unknown>
  for (const [k, v] of Object.entries(SAVED)) {
    if ((VIEW_STATE_KEYS as readonly string[]).includes(k)) continue
    assert.deepEqual(out[k], v, `${k} was lost`)
  }
  assert.equal(out.canvasW, 11)
  assert.equal(out.lineColor, '#39ff14')
})

test('spreading it over the defaults leaves a clean picture', () => {
  const DEFAULTS = {
    overlays: { thirds: false, phi: false, spiral: false, armature: false, diagonals: false, center: false },
    motif: null, motifFlipX: false, motifFlipY: false,
    spiralFlipX: false, spiralFlipY: false, showGrid: false,
    canvasW: 16,
  }
  const restored = { ...DEFAULTS, ...blankView(SAVED) }
  assert.equal(restored.showGrid, false, 'the grid came back on')
  assert.equal(restored.motif, null, 'a motif came back')
  assert.equal(Object.values(restored.overlays).some(Boolean), false, 'a guide came back')
  assert.equal(restored.canvasW, 11, 'but the canvas size should still be remembered')
})

test('the saved blob is not mutated', () => {
  const copy = JSON.parse(JSON.stringify(SAVED))
  blankView(SAVED)
  assert.deepEqual(SAVED, copy)
})

test('an empty or partial blob is survivable', () => {
  assert.deepEqual(blankView({}), {})
  assert.deepEqual(blankView({ showGrid: true }), {})
  assert.deepEqual(blankView({ canvasW: 9 }), { canvasW: 9 })
})

test('the component actually routes its restore through blankView', () => {
  // The module is only useful if it is on the path. This is the join that
  // broke: defaults were already blank and the restore walked straight past
  // them.
  const restore = SRC.split(/\r?\n/).find(l => l.includes('setS({ ...DEFAULTS'))
  assert.ok(restore, 'no restore-from-storage line found')
  assert.match(restore!, /blankView\(/, 'settings are restored raw, so the guides come back on open')
})

test('the component does not write view state back either', () => {
  const save = SRC.split(/\r?\n/).find(l => l.includes('localStorage.setItem(SETTINGS_KEY'))
  assert.ok(save, 'no save-to-storage line found')
  assert.match(save!, /blankView\(/, 'view state is still being persisted')
})
