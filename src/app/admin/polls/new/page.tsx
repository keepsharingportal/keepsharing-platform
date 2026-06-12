// ── /admin/polls/new ──────────────────────────────────────────────────────
// Single-page editor for a brand-new poll. Submits to POST /api/admin/polls
// then routes to the edit page.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { MARKETS } from '@/lib/markets'
import { PollEditorClient } from '../PollEditorClient'

export const metadata: Metadata = { title: 'New Poll — Admin' }
export const dynamic = 'force-dynamic'

export default async function NewPollPage() {
  await requireAdmin()
  return (
    <div className="min-h-screen bg-portal-bg">
      <div className="portal-page-header">
        <div className="flex items-center gap-3">
          <Link href="/admin/polls" className="text-portal-sub hover:text-portal-text"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="portal-page-title">New weekly poll</h1>
            <p className="portal-page-subtitle">2-6 options. Brand-scoped or all-brands.</p>
          </div>
        </div>
      </div>
      <div className="portal-content-body">
        <PollEditorClient
          mode="create"
          brands={MARKETS.map(m => ({ slug: m.slug, label: m.displayName }))}
        />
      </div>
    </div>
  )
}
