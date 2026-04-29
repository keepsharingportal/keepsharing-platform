import { getGuideEntryByToken } from '@/lib/mock-guides'
import { UpdateForm } from '@/components/guides/UpdateForm'
import { AlertCircle } from 'lucide-react'

interface Props { params: Promise<{ token: string }> }

export default async function UpdatePage({ params }: Props) {
  const { token } = await params
  const entry = getGuideEntryByToken(token)

  if (!entry) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Not Found</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          This update link has expired or is no longer valid. Please contact us at (334) 555-0100
          and we'll get your listing updated directly.
        </p>
      </div>
    )
  }

  return <UpdateForm entry={entry} token={token} />
}
