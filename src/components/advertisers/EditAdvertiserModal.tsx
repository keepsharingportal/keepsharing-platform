'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { AdvertiserRecord, DesignStatus, Stage, Orientation, SpecialPosition } from '@/types'
import { formatCurrency, formatSize } from '@/lib/utils'

interface Props {
  advertiser: AdvertiserRecord
  onSave:   (updated: AdvertiserRecord) => void
  onDelete: (id: string) => void
  onClose:  () => void
}

const SIZES: number[] = [0.12, 0.16, 0.25, 0.33, 0.5, 0.66, 1, 2]
const STAGES: Stage[] = ['Closed Won', 'Renewed', 'Verbal', 'Prospect', 'Dropped']
const DESIGN_STATUSES: DesignStatus[] = ['Pick-up', 'New', 'DropBox']
const ORIENTATIONS: Orientation[] = ['Horizontal', 'Vertical', 'Square']
const POSITIONS: SpecialPosition[] = [
  'Inside Front Cover', 'Inside Back Cover', 'Back Cover', 'First Right Hand Read',
]
const DESIGNERS = ['Tim Welch', 'In-house', 'Self']

const DESIGN_ACTIVE: Record<string, string> = {
  'Pick-up': 'bg-green-50 text-green-700 ring-1 ring-green-300 border-green-300',
  New:       'bg-blue-50 text-blue-700 ring-1 ring-blue-300 border-blue-300',
  DropBox:   'bg-amber-50 text-amber-700 ring-1 ring-amber-300 border-amber-300',
}

const fieldLabelCls = 'block text-xs font-semibold text-gray-600 mb-1'
const inputCls      = 'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all'
const selectCls     = inputCls

export function EditAdvertiserModal({ advertiser, onSave, onDelete, onClose }: Props) {
  const [form, setForm]       = useState<AdvertiserRecord>({ ...advertiser })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = <K extends keyof AdvertiserRecord>(key: K, value: AdvertiserRecord[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{advertiser.businessName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {advertiser.issue} · {formatSize(advertiser.size)} · {formatCurrency(advertiser.amount)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Form ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <form
            id="edit-form"
            onSubmit={(e) => { e.preventDefault(); onSave(form) }}
            className="px-6 py-5 space-y-5"
          >

            {/* Business + Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={fieldLabelCls}>Business Name</label>
                <input className={inputCls} value={form.businessName}
                  onChange={(e) => set('businessName', e.target.value)} />
              </div>
              <div>
                <label className={fieldLabelCls}>Stage</label>
                <select className={selectCls} value={form.stage}
                  onChange={(e) => set('stage', e.target.value as Stage)}>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Size + Orientation + Amount */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={fieldLabelCls}>Ad Size</label>
                <select className={selectCls} value={form.size}
                  onChange={(e) => set('size', parseFloat(e.target.value))}>
                  {SIZES.map((s) => (
                    <option key={s} value={s}>{formatSize(s)} ({s})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabelCls}>Orientation</label>
                <select className={selectCls} value={form.orientation ?? ''}
                  onChange={(e) => set('orientation', (e.target.value || null) as Orientation | null)}>
                  <option value="">None</option>
                  {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={fieldLabelCls}>Monthly Rate ($)</label>
                <input type="number" className={inputCls} value={form.amount}
                  onChange={(e) => set('amount', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Design Status */}
            <div>
              <label className={fieldLabelCls}>Design Status</label>
              <div className="flex gap-2 mt-1">
                {DESIGN_STATUSES.map((ds) => (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => set('designStatus', ds)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${
                      form.designStatus === ds
                        ? DESIGN_ACTIVE[ds]
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {ds}
                  </button>
                ))}
              </div>
            </div>

            {/* Designer + Special Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={fieldLabelCls}>Designer</label>
                <select className={selectCls} value={form.designer}
                  onChange={(e) => set('designer', e.target.value)}>
                  {DESIGNERS.map((d) => <option key={d} value={d}>{d}</option>)}
                  {!DESIGNERS.includes(form.designer) && (
                    <option value={form.designer}>{form.designer}</option>
                  )}
                </select>
              </div>
              <div>
                <label className={fieldLabelCls}>Special Position</label>
                <select className={selectCls} value={form.specialPosition ?? ''}
                  onChange={(e) => set('specialPosition', (e.target.value || null) as SpecialPosition | null)}>
                  <option value="">Standard placement</option>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Invoice + Social + Directory + Expires */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={fieldLabelCls}>Invoice Type</label>
                <select className={selectCls} value={form.invoiceType}
                  onChange={(e) => set('invoiceType', e.target.value as 'Invoice' | 'A Check')}>
                  <option value="Invoice">Invoice</option>
                  <option value="A Check">A Check</option>
                </select>
              </div>
              <div>
                <label className={fieldLabelCls}>Social Package</label>
                <input className={inputCls} placeholder="Tier 1, Featured…"
                  value={form.social ?? ''}
                  onChange={(e) => set('social', e.target.value || null)} />
              </div>
              <div>
                <label className={fieldLabelCls}>Expires</label>
                <input className={inputCls} placeholder="Dec26"
                  value={form.expires}
                  onChange={(e) => set('expires', e.target.value)} />
              </div>
              <div>
                <label className={fieldLabelCls}>Directory</label>
                <button
                  type="button"
                  onClick={() => set('directory', !form.directory)}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${
                    form.directory
                      ? 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200'
                      : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {form.directory ? 'Directory ✓' : 'Directory'}
                </button>
              </div>
            </div>

            {/* Layout Notes */}
            <div>
              <label className={fieldLabelCls}>Layout Notes</label>
              <textarea
                className={`${inputCls} resize-y min-h-[72px]`}
                value={form.layoutNotes}
                onChange={(e) => set('layoutNotes', e.target.value)}
                placeholder="Special placement instructions, artwork notes, deadlines…"
              />
            </div>

            {/* Internal Notes */}
            <div>
              <label className={fieldLabelCls}>Internal Notes</label>
              <textarea
                className={`${inputCls} resize-y min-h-[56px]`}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Contract details, referral source, renewal history…"
              />
            </div>
          </form>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Remove this advertiser?</span>
              <button
                type="button"
                onClick={() => onDelete(advertiser.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-form"
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
