// ── /admin/contributors ─────────────────────────────────────────────────────
// Contributor roster + recent commissions + draft review queue.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, FileText, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { ContributorsClient } from './ContributorsClient'

export const metadata: Metadata = { title: 'Contributors — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface ContributorRow {
  id:                  string
  name:                string
  email:               string
  bio:                 string | null
  expertise_tags:      string[]
  brand_slugs:         string[]
  invites_sent:        number
  invites_completed:   number
  last_contributed_at: string | null
  created_at:          string
}

export interface QATemplateRow {
  id:           string
  slug:         string
  name:         string
  description:  string | null
}

export interface InviteRow {
  id:             string
  token:          string
  contributor_id: string
  ask:            string | null
  brand_slug:     string
  target_column:  string | null
  status:         string
  sent_at:        string
  completed_at:   string | null
  expires_at:     string | null
  contributors:   { name: string; email: string } | { name: string; email: string }[] | null
}

export interface ResponseRow {
  id:                    string
  invite_id:             string
  contributor_id:        string
  status:                string
  submitted_at:          string
  ai_draft:              { headline?: string; deck?: string; body?: string; alternates?: string[]; tagSuggestions?: string[]; pullQuote?: string; reviewerNotes?: string; error?: string } | null
  ai_draft_generated_at: string | null
  published_article_id:  string | null
  rejected_reason:       string | null
  responses:             Record<string, string>
  contributors:          { name: string; email: string } | { name: string; email: string }[] | null
  contributor_invites:   { ask: string | null; brand_slug: string; target_column: string | null; questions: Array<{ key: string; label: string }> } | { ask: string | null; brand_slug: string; target_column: string | null; questions: Array<{ key: string; label: string }> }[] | null
}

export default async function ContributorsAdminPage() {
  const sb = supabaseAdmin()

  let migrated = true
  let contributors: ContributorRow[] = []
  let templates: QATemplateRow[] = []
  let invites: InviteRow[] = []
  let responses: ResponseRow[] = []

  try {
    const probe = await sb.from('contributors').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      const { data: cData } = await sb.from('contributors').select('*').order('created_at', { ascending: false })
      contributors = (cData ?? []) as ContributorRow[]

      const { data: tData } = await sb.from('qa_templates').select('id, slug, name, description').eq('is_active', true).order('name')
      templates = (tData ?? []) as QATemplateRow[]

      const { data: iData } = await sb
        .from('contributor_invites')
        .select('id, token, contributor_id, ask, brand_slug, target_column, status, sent_at, completed_at, expires_at, contributors:contributor_id (name, email)')
        .order('sent_at', { ascending: false })
        .limit(50)
      invites = (iData ?? []) as InviteRow[]

      const { data: rData } = await sb
        .from('contributor_responses')
        .select('id, invite_id, contributor_id, status, submitted_at, ai_draft, ai_draft_generated_at, published_article_id, rejected_reason, responses, contributors:contributor_id (name, email), contributor_invites:invite_id (ask, brand_slug, target_column, questions)')
        .order('submitted_at', { ascending: false })
        .limit(50)
      responses = (rData ?? []) as ResponseRow[]
    }
  } catch { /* fall through */ }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Users size={16} className="text-portal-blue" />
          <h1 className="portal-page-title">Contributors</h1>
        </div>
        <p className="portal-page-subtitle">
          Magic-link Q&amp;A → AI-drafted articles. Send an invite, contributor answers in their voice, AI drafts, editor reviews.
        </p>
      </div>

      <div className="p-6 max-w-6xl space-y-6">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 153 pending.</strong> Apply <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/153_contributors_qa.sql</code> first.
          </div>
        )}

        {migrated && (
          <ContributorsClient
            contributors={contributors}
            templates={templates}
            invites={invites}
            responses={responses}
          />
        )}

        {migrated && contributors.length === 0 && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-portal-blue" />
              <h3 className="text-sm font-bold text-portal-text">How this works</h3>
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Add a contributor (name + email + expertise).</li>
              <li>Send them an invite — pick a Q&amp;A template (Mom Knows Best, Expert Column, etc.) and write the editorial ask.</li>
              <li>They get a magic link, answer in their voice, hit submit.</li>
              <li>AI drafts an article from their answers using the right voice + format.</li>
              <li>Editor reviews the draft below; one-click publishes to the article queue.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
