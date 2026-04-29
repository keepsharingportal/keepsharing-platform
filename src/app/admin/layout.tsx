import { Sidebar } from '@/components/Sidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
