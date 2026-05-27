import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Sidebar } from '@/components/Sidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export const metadata: Metadata = {
  title: 'KeepSharing Admin',
  description: 'KeepSharing LLC — Internal Operations Platform',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy forwards the current path so we can branch chrome — /admin/login
  // must render bare so an unauthenticated visitor isn't staring at admin
  // navigation they can't use.
  const pathname = (await headers()).get('x-admin-pathname') ?? ''
  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f4f5f7]">
        <AdminHeader />
        {children}
      </main>
    </div>
  )
}
