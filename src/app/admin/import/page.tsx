import { ImportClient } from '@/components/advertisers/ImportClient'

export default function ImportPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Import Zoho Data</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Upload your Zoho CRM CSV export · Businesses and contacts are auto-created
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-semibold">
            Run SQL schema in Supabase first
          </span>
        </div>
      </div>
      <ImportClient />
    </div>
  )
}
