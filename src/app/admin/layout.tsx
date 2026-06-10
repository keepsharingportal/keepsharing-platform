import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { Sidebar } from '@/components/Sidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { MfaNudgeBanner } from '@/components/admin/MfaNudgeBanner'
import { getAdminContext } from '@/lib/admin/auth'

// Match the Distribution Portal (portal.css) so admin pages share a
// consistent typographic feel. Only loaded on admin routes; the public
// site keeps Geist Sans.
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  weight:   ['400', '500', '600', '700'],
  subsets:  ['latin'],
  display:  'swap',
})
const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  weight:   ['400', '500'],
  subsets:  ['latin'],
  display:  'swap',
})

export const metadata: Metadata = {
  title: 'KeepSharing Admin',
  description: 'KeepSharing LLC — Internal Operations Platform',
}

// Paths the MFA enforcement gate is allowed to NOT bounce away from. The user
// needs to be able to reach the Security page to enroll, the login page to
// recover, and a few utility endpoints to function at all.
const MFA_GATE_EXEMPT_PATHS = [
  '/admin/login',
  '/admin/logout',
  '/admin/settings/security',
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy forwards the current path so we can branch chrome — /admin/login
  // must render bare so an unauthenticated visitor isn't staring at admin
  // navigation they can't use.
  const pathname = (await headers()).get('x-admin-pathname') ?? ''
  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>
  }

  // ── 2FA enforcement gate ────────────────────────────────────────────────
  // If the user is required to have 2FA and has not enrolled, bounce them
  // to /admin/settings/security where they can complete enrollment. The
  // page itself is in the exempt list so they aren't redirected in a loop.
  const ctx = await getAdminContext()
  if (
    ctx &&
    ctx.requiresMfa &&
    !ctx.mfaEnabledAt &&
    !MFA_GATE_EXEMPT_PATHS.some(p => pathname.startsWith(p))
  ) {
    redirect('/admin/settings/security?gate=required')
  }

  return (
    <div className={`${dmSans.variable} ${dmMono.variable} flex h-full overflow-hidden`}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-portal-bg font-[family-name:var(--font-dm-sans)] text-portal-text">
        <AdminHeader />
        <MfaNudgeBanner />
        {children}
      </main>
    </div>
  )
}
