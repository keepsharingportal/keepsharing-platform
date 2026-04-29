import { Construction } from 'lucide-react'

interface Props {
  title: string
  description: string
  phase?: string
  features?: string[]
}

export function ComingSoon({ title, description, phase, features }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
        <Construction size={24} className="text-blue-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-md mb-5">{description}</p>

      {phase && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold ring-1 ring-amber-200 mb-6">
          {phase}
        </span>
      )}

      {features && features.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 text-left max-w-sm w-full">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What will be here</p>
          <ul className="space-y-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
