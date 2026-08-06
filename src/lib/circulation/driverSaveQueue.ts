// Offline-tolerant save queue for the driver portal.
//
// Every write the driver makes (check-off, leftover count, flag, pickup
// load, gas) goes through enqueue(). The queue is persisted to
// localStorage so:
//   - A refresh mid-run doesn't lose optimistic UI changes.
//   - A dropped signal at Pubs Plus doesn't lose the check-off she just
//     tapped.
//   - The API being briefly 500 doesn't silently discard the leftover
//     count she just typed.
//
// Each entry has a stable id so re-runs on the same delivery_stop_id
// coalesce — we only ever send the LATEST state, not every keystroke.
// Server-side handlers are idempotent (POST { checked: true } twice is
// the same as once) so retries can't corrupt data.
//
// A single background loop drains the queue: on mount, whenever a new
// item is enqueued, and every 15s while items remain.

export interface DriverSavePayload {
  // POST body for /api/circulation/driver. Kept as `unknown` so the
  // queue doesn't have to know every driver-API shape.
  [key: string]: unknown
}

export interface QueueEntry {
  id:            string        // dedup key (e.g. `stop:<dsId>` or `pickup:<deliveryId>`)
  payload:       DriverSavePayload
  createdAt:     number
  lastAttempt?:  number
  attempts:      number
  lastError?:    string
}

const STORAGE_KEY  = 'kss.driver.saveQueue.v1'
const ENDPOINT     = '/api/circulation/driver'
const RETRY_DELAYS = [0, 2_000, 5_000, 15_000, 30_000, 60_000]  // per-attempt backoff, capped at 60s
const MAX_ATTEMPTS = 12   // ~15 min of retries at the capped delay

// ── Storage helpers ────────────────────────────────────────────────
function readQueue(): QueueEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as QueueEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writeQueue(q: QueueEntry[]): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(q)) } catch { /* quota */ }
}

// ── Listener plumbing so UI can show "N unsynced changes" ─────────
type Listener = (q: QueueEntry[]) => void
const listeners = new Set<Listener>()
function notify() {
  const q = readQueue()
  for (const l of listeners) l(q)
}
export function subscribeToQueue(fn: Listener): () => void {
  listeners.add(fn)
  fn(readQueue())
  return () => { listeners.delete(fn) }
}

// ── Public API ────────────────────────────────────────────────────
/** Enqueue a save. Later enqueues with the same `id` REPLACE the
 *  earlier payload — we always send the latest state of that stop
 *  (or delivery), never a stale intermediate. */
export function enqueueDriverSave(id: string, payload: DriverSavePayload): void {
  const q       = readQueue()
  const existing = q.findIndex(e => e.id === id)
  const entry: QueueEntry = {
    id,
    payload,
    createdAt: existing >= 0 ? q[existing].createdAt : Date.now(),
    attempts:  0,
  }
  if (existing >= 0) q[existing] = entry
  else               q.push(entry)
  writeQueue(q)
  notify()
  void drain()
}

/** Force a drain pass — useful on page mount or reconnect. */
export function drainNow(): Promise<void> {
  return drain()
}

/** Count of unsynced entries. Used by the header badge. */
export function pendingCount(): number { return readQueue().length }

// ── Drain loop ────────────────────────────────────────────────────
let draining = false
let retryTimer: ReturnType<typeof setTimeout> | null = null

async function drain(): Promise<void> {
  if (draining) return
  draining = true
  try {
    while (true) {
      const q = readQueue()
      if (q.length === 0) return
      // Take the oldest entry that isn't inside its backoff window.
      const now = Date.now()
      const idx = q.findIndex(e => {
        if (!e.lastAttempt) return true
        const delay = RETRY_DELAYS[Math.min(e.attempts, RETRY_DELAYS.length - 1)]
        return now - e.lastAttempt >= delay
      })
      if (idx < 0) {
        scheduleRetry(q)
        return
      }
      const entry = q[idx]
      let ok = false
      let errMsg = ''
      try {
        const res = await fetch(ENDPOINT, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(entry.payload),
        })
        if (res.ok) {
          ok = true
        } else {
          const j = await res.json().catch(() => ({}))
          errMsg = (j as { error?: string })?.error ?? `HTTP ${res.status}`
          // 4xx (except 408/429) is a client-side problem — retry won't help.
          // Drop the entry so the queue doesn't jam forever on a bad payload.
          if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
            const q2 = readQueue().filter(e => e.id !== entry.id)
            writeQueue(q2)
            notify()
            continue
          }
        }
      } catch (e) {
        errMsg = (e as Error)?.message ?? 'Network error'
      }
      if (ok) {
        const q2 = readQueue().filter(e => e.id !== entry.id)
        writeQueue(q2)
        notify()
        continue
      }
      // Bump attempts + lastAttempt on the entry.
      const q3 = readQueue().map(e =>
        e.id === entry.id
          ? { ...e, attempts: e.attempts + 1, lastAttempt: Date.now(), lastError: errMsg }
          : e,
      )
      writeQueue(q3)
      notify()
      // Give up eventually (12 attempts ≈ 15 min) so we don't hammer
      // forever on a permanently-wrong payload. The item stays in the
      // queue so the driver / support can see it, and a manual retry
      // (page reload) fires drain again.
      const bumped = q3.find(e => e.id === entry.id)
      if (bumped && bumped.attempts >= MAX_ATTEMPTS) {
        scheduleRetry(q3, 60_000)
        return
      }
      scheduleRetry(q3)
      return
    }
  } finally {
    draining = false
  }
}

function scheduleRetry(q: QueueEntry[], forceDelay?: number): void {
  if (retryTimer) clearTimeout(retryTimer)
  if (q.length === 0) return
  const now = Date.now()
  let earliest = Infinity
  for (const e of q) {
    if (!e.lastAttempt) { earliest = 0; break }
    const delay = RETRY_DELAYS[Math.min(e.attempts, RETRY_DELAYS.length - 1)]
    const wait  = Math.max(0, (e.lastAttempt + delay) - now)
    if (wait < earliest) earliest = wait
  }
  const ms = forceDelay ?? Math.min(60_000, earliest)
  retryTimer = setTimeout(() => { void drain() }, ms)
}

// Auto-drain when the browser comes back online.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void drain() })
}
