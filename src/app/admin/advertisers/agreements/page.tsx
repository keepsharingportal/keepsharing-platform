import Link from 'next/link'
import { Plus, FileSignature, ExternalLink } from 'lucide-react'

const MOCK_AGREEMENTS = [
  { id: 'agr001', subject: 'Baptist Health System MAR26-DEC26 Ad Agreement', business: 'Baptist Health System', publications: ['RRP'], months: 10, grandTotal: 8950, status: 'Signed', signedAt: '2026-02-15', signedBy: 'Sarah Mitchell' },
  { id: 'agr002', subject: "Children's Hospital of Alabama MAR26-DEC26", business: "Children's Hospital of Alabama", publications: ['RRP'], months: 10, grandTotal: 8950, status: 'Signed', signedAt: '2026-02-18', signedBy: 'Mark Davis' },
  { id: 'agr003', subject: 'Camp Cheaha MAR26-JUN26 Ad Agreement', business: 'Camp Cheaha', publications: ['RRP'], months: 3, grandTotal: 825, status: 'Sent', signedAt: null, signedBy: null },
  { id: 'agr004', subject: 'Craig Eye Center MAR26-DEC26 Ad Agreement', business: 'Craig Eye Center', publications: ['RRP'], months: 10, grandTotal: 3500, status: 'Created', signedAt: null, signedBy: null },
]

const STATUS_BADGE: Record<string, string> = {
  Created: 'bg-gray-50 text-gray-600 ring-gray-200',
  Sent:    'bg-amber-50 text-amber-700 ring-amber-200',
  Signed:  'bg-green-50 text-green-700 ring-green-200',
  Expired: 'bg-red-50 text-red-500 ring-red-200',
}

export default function AgreementsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Ad Agreements</h1>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full ring-1 ring-blue-200">
            {MOCK_AGREEMENTS.length} agreements
          </span>
        </div>
        <Link href="/admin/advertisers/agreements/new"
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={14} /> New Agreement
        </Link>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              {['Agreement', 'Business', 'Publications', 'Months', 'Total', 'Status', 'Signed By', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MOCK_AGREEMENTS.map((agr) => (
              <tr key={agr.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileSignature size={14} className="text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900 text-sm">{agr.subject}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{agr.business}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {agr.publications.map((p) => <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">{p}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{agr.months} mo.</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">${agr.grandTotal.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ring-1 ${STATUS_BADGE[agr.status]}`}>{agr.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {agr.signedBy ? <><div>{agr.signedBy}</div><div className="text-gray-400">{agr.signedAt}</div></> : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/advertisers/agreements/${agr.id}`}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <ExternalLink size={13} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
