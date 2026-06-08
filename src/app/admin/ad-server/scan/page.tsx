'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FolderOpen, ScanLine, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, ExternalLink, ChevronDown, ChevronUp, FileImage,
  Send, Loader2, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type AIFlag = 'must_change' | 'verify' | 'safe'

interface ScannedAd {
  id: string
  filename: string
  businessName: string
  publication: string
  size: string
  issue: string
  flag: AIFlag
  confidence: number
  reasoning: string
  issues: string[]
  contactEmail: string
  thumbnailColor: string
  outreachSent?: boolean
}

const MOCK_SCAN_RESULTS: ScannedAd[] = [
  {
    id: '1',
    filename: 'PCA_HalfPage_MAY26.pdf',
    businessName: 'Prattville Christian Academy',
    publication: 'RRP',
    size: '1/2 Page',
    issue: 'RRP MAY26',
    flag: 'must_change',
    confidence: 94,
    reasoning: 'Phone number visible in ad (334-365-5000) does not match the number on file (334-365-5189). Enrollment deadline reads "May 1" — client contract specifies "May 15". Image resolution appears adequate for print.',
    issues: ['Phone number incorrect', 'Enrollment deadline date wrong'],
    contactEmail: 'smitchell@pca.edu',
    thumbnailColor: '#fee2e2',
  },
  {
    id: '2',
    filename: 'Courtyard_Full_MAY26.ai',
    businessName: 'Courtyard by Marriott',
    publication: 'MBP',
    size: 'Full Page',
    issue: 'MBP MAY26',
    flag: 'must_change',
    confidence: 88,
    reasoning: 'Rate shown in ad copy ($1,200/month) does not match the contracted rate on file ($850/month). Social media handles appear in footer — client previously requested these be removed. Layout otherwise looks clean.',
    issues: ['Rate shown is incorrect ($1,200 vs $850)', 'Social handles present (client requested removal)'],
    contactEmail: 'jshaw@marriott.com',
    thumbnailColor: '#fce7f3',
  },
  {
    id: '3',
    filename: 'CampCheaha_FullPage_MAY26.pdf',
    businessName: 'Camp Cheaha',
    publication: 'RRP',
    size: 'Full Page',
    issue: 'RRP MAY26',
    flag: 'verify',
    confidence: 71,
    reasoning: 'Ad copy, phone number, and dates appear consistent with what is on file. However, the camp session dates listed (June 6–August 1) should be confirmed against the most recent contract — the original proposal had different end dates. Image quality is print-ready at 300 DPI.',
    issues: ['Session end date needs confirmation (shows Aug 1)'],
    contactEmail: 'derek@campcheaha.org',
    thumbnailColor: '#fef9c3',
  },
  {
    id: '4',
    filename: 'ImaginationStation_QtrPage_MAY26.png',
    businessName: 'Imagination Station',
    publication: 'RRP',
    size: '1/4 Page',
    issue: 'RRP MAY26',
    flag: 'safe',
    confidence: 97,
    reasoning: 'This is a pick-up ad with no date or pricing copy. Business name, logo, phone number (334-279-9900), and website all match records on file. Image is 300 DPI and correct dimensions for 1/4 page layout. No changes required.',
    issues: [],
    contactEmail: 'lisa@imaginationstation.com',
    thumbnailColor: '#dcfce7',
  },
  {
    id: '5',
    filename: 'CraigEye_HalfPage_MAY26.jpg',
    businessName: 'Craig Eye Center',
    publication: 'RRP',
    size: '1/2 Page',
    issue: 'RRP MAY26',
    flag: 'safe',
    confidence: 95,
    reasoning: 'Pick-up from last issue. Phone (334-272-4484), address, and services listed match on-file data exactly. No seasonal copy or pricing, so no date-sensitive content to verify. Image resolution is print-ready.',
    issues: [],
    contactEmail: 'rcraig@craigeyecenter.com',
    thumbnailColor: '#f3f4f6',
  },
  {
    id: '6',
    filename: 'AOC_QuarterPage_MAY26.pdf',
    businessName: 'Alabama Orthopaedic Clinic',
    publication: 'MBP',
    size: '1/4 Page',
    issue: 'MBP MAY26',
    flag: 'verify',
    confidence: 68,
    reasoning: 'Ad was submitted by client via Dropbox (client-provided design). Logo and contact info look correct. Low confidence because the image quality appears borderline for full bleed print — recommend a closer look at the bleed margins before sending to press.',
    issues: ['Image quality borderline for print bleed — verify resolution'],
    contactEmail: 'thodges@aoc.com',
    thumbnailColor: '#e0f2fe',
  },
]

const FLAG_CONFIG: Record<AIFlag, { label: string; cls: string; icon: React.ElementType; borderCls: string }> = {
  must_change: {
    label: 'Must Change',
    cls: 'bg-portal-red-lt text-portal-red ring-portal-red/30',
    icon: XCircle,
    borderCls: 'border-l-red-500',
  },
  verify: {
    label: 'Verify',
    cls: 'bg-portal-amber-lt text-portal-amber border-portal-amber/30',
    icon: AlertTriangle,
    borderCls: 'border-l-amber-400',
  },
  safe: {
    label: 'Pickup Safe',
    cls: 'bg-portal-green-lt text-portal-green ring-portal-green/30',
    icon: CheckCircle2,
    borderCls: 'border-l-green-500',
  },
}

export default function DropboxScanPage() {
  const [folderPath, setFolderPath]   = useState('/KeepSharing/Print Ads/MAY26')
  const [scanning, setScanning]       = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanFile, setScanFile]       = useState('')
  const [results, setResults]         = useState<ScannedAd[] | null>(null)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [flagFilter, setFlagFilter]   = useState<AIFlag | 'all'>('all')
  const [outreachSent, setOutreachSent] = useState<Set<string>>(new Set())

  const runScan = async () => {
    setScanning(true)
    setResults(null)
    setScanProgress(0)

    const files = MOCK_SCAN_RESULTS.map((r) => r.filename)
    for (let i = 0; i < files.length; i++) {
      setScanFile(files[i])
      setScanProgress(Math.round(((i + 1) / files.length) * 100))
      await new Promise((r) => setTimeout(r, 700))
    }

    setResults(MOCK_SCAN_RESULTS)
    setScanning(false)
  }

  const sendOutreach = (id: string) => {
    setOutreachSent((prev) => new Set([...prev, id]))
  }

  const filtered = results
    ? (flagFilter === 'all' ? results : results.filter((r) => r.flag === flagFilter))
    : null

  const mustChange = results?.filter((r) => r.flag === 'must_change').length ?? 0
  const verify     = results?.filter((r) => r.flag === 'verify').length ?? 0
  const safe       = results?.filter((r) => r.flag === 'safe').length ?? 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin/ad-server" className="text-sm text-portal-blue hover:text-portal-blue font-medium">
            ← Ad Server
          </Link>
          <span className="text-portal-border-2">/</span>
          <h1 className="text-xl font-semibold text-portal-text">Dropbox Ad Scanner</h1>
        </div>
        {results && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-portal-red font-semibold bg-portal-red-lt px-2.5 py-0.5 rounded-full ring-1 ring-portal-red/30">
              {mustChange} must change
            </span>
            <span className="text-portal-amber font-semibold bg-portal-amber-lt px-2.5 py-0.5 rounded-full border border-portal-amber/30">
              {verify} verify
            </span>
            <span className="text-portal-green font-semibold bg-portal-green-lt px-2.5 py-0.5 rounded-full ring-1 ring-portal-green/30">
              {safe} safe
            </span>
          </div>
        )}
      </div>

      {/* Scan controls */}
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-semibold text-portal-sub uppercase tracking-wide mb-1.5">
              Dropbox Folder Path
            </label>
            <div className="flex items-center gap-2 border border-portal-border-2 rounded-lg overflow-hidden focus-within:border-portal-blue/50 focus-within:ring-2 focus-within:ring-portal-blue/20">
              <FolderOpen size={15} className="text-portal-muted ml-3 shrink-0" />
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                className="flex-1 py-2 pr-3 text-sm text-portal-text outline-none bg-transparent"
              />
            </div>
          </div>
          <button
            onClick={runScan}
            disabled={scanning || !folderPath.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {scanning
              ? <><Loader2 size={14} className="animate-spin" /> Scanning…</>
              : <><ScanLine size={14} /> Scan with Claude Vision</>
            }
          </button>
          {results && !scanning && (
            <button
              onClick={runScan}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-portal-sub border border-portal-border-2 rounded-lg hover:bg-portal-bg transition-colors"
            >
              <RefreshCw size={13} /> Re-scan
            </button>
          )}
        </div>

        {/* Scan progress bar */}
        {scanning && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-portal-sub">Analyzing <span className="font-mono text-portal-blue">{scanFile}</span></span>
              <span className="text-xs font-semibold text-portal-sub">{scanProgress}%</span>
            </div>
            <div className="h-1.5 bg-portal-row-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-portal-navy rounded-full transition-all duration-500"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-portal-muted mt-1.5">
              Claude is checking each ad against contracts, phone numbers, dates, and print specs…
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        {!results && !scanning && (
          <div className="flex flex-col items-center justify-center h-full text-portal-muted gap-3">
            <ScanLine size={40} className="opacity-20" />
            <p className="text-sm font-medium">Enter a Dropbox folder path and click Scan</p>
            <p className="text-xs">Claude Vision will classify each ad as Must Change, Verify, or Pickup Safe</p>
          </div>
        )}

        {results && !scanning && (
          <>
            {/* Filter bar */}
            <div className="bg-white border-b border-portal-border px-6 py-2.5 flex items-center gap-2 shrink-0">
              {(['all', 'must_change', 'verify', 'safe'] as const).map((f) => {
                const labels: Record<string, string> = { all: `All (${results.length})`, must_change: `Must Change (${mustChange})`, verify: `Verify (${verify})`, safe: `Pickup Safe (${safe})` }
                return (
                  <button key={f} onClick={() => setFlagFilter(f)}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                      flagFilter === f
                        ? f === 'must_change' ? 'bg-portal-red text-white'
                          : f === 'verify' ? 'bg-portal-amber text-white'
                          : f === 'safe' ? 'bg-portal-green text-white'
                          : 'bg-portal-navy text-white'
                        : 'bg-white border border-portal-border text-portal-sub hover:bg-portal-bg'
                    )}>
                    {labels[f]}
                  </button>
                )
              })}
              <div className="ml-auto flex items-center gap-1.5 text-xs text-portal-muted">
                <Info size={12} />
                Scanned {results.length} files from <span className="font-mono text-portal-sub">{folderPath}</span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {filtered?.map((ad) => {
                const isExpanded = expandedId === ad.id
                const FlagIcon = FLAG_CONFIG[ad.flag].icon
                const sent = outreachSent.has(ad.id)

                return (
                  <div key={ad.id}
                    className={cn(
                      'bg-white rounded-lg border border-portal-border border-l-4 overflow-hidden hover:shadow-sm transition-shadow',
                      FLAG_CONFIG[ad.flag].borderCls
                    )}>
                    {/* Row */}
                    <div
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : ad.id)}
                    >
                      {/* Thumbnail */}
                      <div
                        className="rounded-lg flex items-center justify-center shrink-0"
                        style={{ width: 64, height: 44, backgroundColor: ad.thumbnailColor }}
                      >
                        <FileImage size={18} className="text-portal-muted opacity-60" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-portal-text">{ad.businessName}</span>
                          <span className="text-xs font-bold text-portal-muted">{ad.publication}</span>
                          <span className="text-xs text-portal-muted">{ad.size}</span>
                        </div>
                        <div className="text-xs text-portal-muted mt-0.5 font-mono">{ad.filename}</div>
                      </div>

                      {/* Confidence */}
                      <div className="text-right shrink-0">
                        <div className="text-xs text-portal-muted">Confidence</div>
                        <div className={cn(
                          'text-sm font-bold',
                          ad.confidence >= 90 ? 'text-portal-green' : ad.confidence >= 70 ? 'text-portal-amber' : 'text-portal-red'
                        )}>
                          {ad.confidence}%
                        </div>
                      </div>

                      {/* Flag badge */}
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 shrink-0', FLAG_CONFIG[ad.flag].cls)}>
                        <FlagIcon size={12} />
                        {FLAG_CONFIG[ad.flag].label}
                      </span>

                      {isExpanded ? <ChevronUp size={14} className="text-portal-muted shrink-0" /> : <ChevronDown size={14} className="text-portal-muted shrink-0" />}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-portal-border bg-portal-bg px-4 py-4">
                        {/* AI Reasoning */}
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-portal-sub uppercase tracking-wide mb-1.5">Claude's Analysis</div>
                          <p className="text-sm text-portal-text leading-relaxed bg-white rounded-lg px-3 py-2.5 border border-portal-border">
                            {ad.reasoning}
                          </p>
                        </div>

                        {/* Issues list */}
                        {ad.issues.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-portal-sub uppercase tracking-wide mb-1.5">Issues Found</div>
                            <ul className="space-y-1">
                              {ad.issues.map((issue, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-portal-red">
                                  <XCircle size={13} className="mt-0.5 shrink-0 text-portal-red" />
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          {(ad.flag === 'must_change' || ad.flag === 'verify') && (
                            <button
                              onClick={() => sendOutreach(ad.id)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                sent
                                  ? 'bg-portal-green-lt text-portal-green ring-1 ring-portal-green/30'
                                  : 'bg-portal-navy text-white hover:opacity-90'
                              )}>
                              {sent
                                ? <><CheckCircle2 size={11} /> Outreach sent via GHL</>
                                : <><Send size={11} /> Send Change Request via GHL</>
                              }
                            </button>
                          )}
                          <a
                            href="https://app.gohighlevel.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-portal-sub bg-white border border-portal-border-2 hover:bg-portal-bg transition-colors"
                          >
                            <ExternalLink size={11} /> Open GHL
                          </a>
                          {ad.flag === 'safe' && (
                            <span className="flex items-center gap-1 text-xs text-portal-green font-medium">
                              <CheckCircle2 size={12} /> No action needed — cleared for print
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
