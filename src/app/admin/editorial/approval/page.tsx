// /admin/editorial/approval — deprecated.
//
// The Approval Desk's channel-approval workflow + Publish-to-homepage
// button now live on the canonical submission detail at
// /admin/community/[id]. This route is kept only so historical
// bookmarks, in-app links, and email links don't 404 — redirects to
// the canonical queue page, or to the specific submission detail
// when ?id= is provided.
//
// Safe to delete in a follow-up once analytics confirms no more
// inbound hits on this URL.

import { redirect } from 'next/navigation'

interface Props { searchParams: Promise<{ id?: string }> }

export const dynamic = 'force-dynamic'

export default async function DeprecatedApprovalDesk({ searchParams }: Props) {
  const { id } = await searchParams
  if (id) redirect(`/admin/community/${id}`)
  redirect('/admin/community?status=approved')
}
