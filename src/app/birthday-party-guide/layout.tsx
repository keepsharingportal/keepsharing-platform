import { notFound } from 'next/navigation'
import { guideTreeIsViewable } from '@/lib/guides/require-live'

// One gate for the whole Birthday Party Guide tree.
//
// Every other guide runs through GuideDetailPage, which checks guideIsLive().
// This guide has its own eleven routes and checked nothing, so Greater
// Pensacola's hub was publicly reachable while its guide_configs row said
// is_active = false. A layout covers every route beneath it, including ones
// added later — which is the point of putting it here rather than in each
// page.
export default async function BirthdayPartyGuideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!(await guideTreeIsViewable('birthday-party'))) notFound()
  return <>{children}</>
}
