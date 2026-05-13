export default function NominateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-blue-700">River Region Parents</div>
            <div className="text-xs text-gray-400">Montgomery's Family Magazine</div>
          </div>
          <div className="text-xs text-gray-400">River Region Parents</div>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-6 py-10">{children}</main>
      <footer className="border-t border-gray-100 px-6 py-6 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} River Region Parents</p>
      </footer>
    </div>
  )
}
