export default function UpdateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-blue-700">River Region Parents</div>
            <div className="text-xs text-gray-400">Guide Listing Update Portal</div>
          </div>
          <div className="text-xs text-gray-400">Need help? (334) 555-0100</div>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-6 py-10">{children}</main>
      <footer className="border-t border-gray-100 px-6 py-6 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} River Region Parents. This link is unique to your business.</p>
      </footer>
    </div>
  )
}
