// /admin/editorial/[id] — deprecated.
//
// The editorial metadata/destination workflow that used to live here
// (working_title, excerpt, destination_section, etc.) is now part of
// the canonical submission detail at /admin/community/[id]. This route
// is kept only so historical links don't 404 — redirects to the
// canonical detail.
//
// Safe to delete in a follow-up once analytics confirms no more
// inbound hits on this URL.

import { redirect } from 'next/navigation'

interface Props { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function DeprecatedEditorialDetail({ params }: Props) {
  const { id } = await params
  redirect(`/admin/community/${id}`)
}
