export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white">
      {/* Publication header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-rose-700 leading-tight">River Region Parents</div>
            <div className="text-xs text-gray-400">Montgomery's Family Magazine</div>
          </div>
          <div className="text-xs text-gray-500">Questions? Call (334) 555-0100</div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        {children}
      </main>
      <footer className="border-t border-gray-100 px-6 py-6 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} River Region Parents. All rights reserved.</p>
      </footer>
    </div>
  )
}
