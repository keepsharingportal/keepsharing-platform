import { AgreementGenerator } from '@/components/agreements/AgreementGenerator'

export default function NewAgreementPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">New Ad Agreement</h1>
        <p className="text-sm text-gray-500 mt-0.5">Build the agreement, preview, collect digital signature</p>
      </div>
      <AgreementGenerator />
    </div>
  )
}
