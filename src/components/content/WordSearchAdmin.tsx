'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Download, Trophy, Eye } from 'lucide-react'
import { generateGrid } from '@/components/boom/WordSearchGame'
import { cn } from '@/lib/utils'

const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
function currentMonthKey() {
  const d = new Date()
  return `${MONTH_LABELS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`
}

type Submission = {
  id: string
  name: string
  email: string
  foundWords: string[]
  completed: boolean
  isWinner: boolean
  createdAt: string
}

export function WordSearchAdmin() {
  const [monthKey,     setMonthKey]     = useState(currentMonthKey())
  const [wordInput,    setWordInput]    = useState('')
  const [sponsorName,  setSponsorName]  = useState('')
  const [prizeAmount,  setPrizeAmount]  = useState('')
  const [gridPreview,  setGridPreview]  = useState<ReturnType<typeof generateGrid> | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [submissions,  setSubmissions]  = useState<Submission[]>([])
  const [loadingSubs,  setLoadingSubs]  = useState(false)
  const [activeTab,    setActiveTab]    = useState<'setup'|'submissions'>('setup')

  const wordList = wordInput.split('\n').map(w => w.trim()).filter(Boolean)

  const handleGenerate = () => {
    if (wordList.length === 0) return
    setGridPreview(generateGrid(wordList))
    setSaved(false)
  }

  const handleSave = async (isActive: boolean) => {
    if (!gridPreview || wordList.length === 0) return
    setSaving(true)
    try {
      await fetch('/api/word-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:      'save_puzzle',
          publication: 'RRB',
          monthKey,
          title:       `River Region Boom — ${monthKey} Word Search`,
          words:       wordList,
          gridData:    gridPreview,
          sponsorName: sponsorName || null,
          prizeAmount: prizeAmount || null,
          isActive,
        }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const loadSubmissions = async () => {
    setLoadingSubs(true)
    try {
      // Submissions are fetched via a direct Supabase call would need admin access
      // For now, show placeholder
      setSubmissions([
        { id: 's1', name: 'Martha Williams', email: 'martha@example.com', foundWords: ['MONTGOMERY','WISDOM','COMMUNITY','LEGACY','RIVER','FRIENDSHIP','HEALTH','TRAVEL','HUMOR','TASTE','BOOM','INSPIRE','FAMILY','CULTURE','GROWTH'], completed: true, isWinner: false, createdAt: new Date().toISOString() },
        { id: 's2', name: 'John Patterson',  email: 'john@example.com',  foundWords: ['MONTGOMERY','WISDOM','COMMUNITY'], completed: false, isWinner: false, createdAt: new Date().toISOString() },
      ])
    } finally {
      setLoadingSubs(false)
    }
  }

  useEffect(() => { if (activeTab === 'submissions') loadSubmissions() }, [activeTab])

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Word Search Manager</h1>
          <p className="text-xs text-gray-500 mt-0.5">Set up monthly puzzles for River Region Boom</p>
        </div>
        <a href="/boom/word-search" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
          <Eye size={12} /> View Public Puzzle
        </a>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['setup','submissions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all',
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
              {tab === 'setup' ? 'Puzzle Setup' : `Submissions (${submissions.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Configuration */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Puzzle Configuration</h2>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
                  <input value={monthKey} onChange={e => setMonthKey(e.target.value)} className={inputCls} placeholder="APR26" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sponsor Name</label>
                  <input value={sponsorName} onChange={e => setSponsorName(e.target.value)} className={inputCls} placeholder="e.g. Regions Bank" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prize Amount</label>
                  <input value={prizeAmount} onChange={e => setPrizeAmount(e.target.value)} className={inputCls} placeholder="e.g. $50 gift card" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Word List (one per line, max 15 words)
                  </label>
                  <textarea
                    rows={8}
                    value={wordInput}
                    onChange={e => setWordInput(e.target.value)}
                    className={cn(inputCls, 'resize-none font-mono text-xs')}
                    placeholder={'MONTGOMERY\nWISDOM\nCOMMUNITY\nLEGACY\nRIVER...'}
                  />
                  <div className="text-[10px] text-gray-400 mt-1">{wordList.length} words · 15-letter max per word · all caps OK</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleGenerate} disabled={wordList.length === 0}
                    className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    Generate Grid
                  </button>
                  {gridPreview && (
                    <button onClick={() => handleSave(false)} disabled={saving}
                      className="flex-1 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1">
                      {saving ? <RefreshCw size={13} className="animate-spin" /> : null}
                      Save Draft
                    </button>
                  )}
                </div>
                {gridPreview && (
                  <button onClick={() => handleSave(true)} disabled={saving}
                    className="w-full py-2.5 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {saved ? '✓ Published!' : 'Publish (Make Active)'}
                  </button>
                )}
              </div>
            </div>

            {/* Right: Grid preview */}
            <div>
              {gridPreview ? (
                <div className="bg-[#0B1829] rounded-xl p-5 overflow-auto">
                  <div className="text-xs font-bold text-[#C9A84B] mb-3">Grid Preview ({gridPreview.grid.length}×{gridPreview.grid.length})</div>
                  <table className="border-collapse text-[11px] font-mono font-bold">
                    <tbody>
                      {gridPreview.grid.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c} className="w-5 h-5 text-center" style={{ color: '#F4EFE4' }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {wordList.map(w => (
                      <span key={w} className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: 'rgba(201,168,75,0.2)', color: '#C9A84B' }}>{w}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl h-64 flex items-center justify-center text-sm text-gray-400">
                  Enter words and click Generate Grid to preview
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Submissions</span>
              <button onClick={() => {
                const csv = [
                  ['Name','Email','Words Found','Completed','Date'],
                  ...submissions.map(s => [s.name, s.email, s.foundWords.length, s.completed ? 'Yes' : 'No', new Date(s.createdAt).toLocaleDateString()])
                ].map(r => r.join(',')).join('\n')
                const b = new Blob([csv], { type: 'text/csv' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'entries.csv'; a.click()
              }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                <Download size={12} /> Export CSV
              </button>
            </div>
            {loadingSubs ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Name','Email','Words Found','Complete','Winner','Date'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.email}</td>
                      <td className="px-4 py-3 text-gray-700 font-semibold">{s.foundWords.length}</td>
                      <td className="px-4 py-3">{s.completed ? <span className="text-green-600">✓</span> : '—'}</td>
                      <td className="px-4 py-3">
                        {s.isWinner
                          ? <Trophy size={13} className="text-amber-500" />
                          : <button className="text-[10px] text-blue-600 hover:underline">Mark winner</button>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
