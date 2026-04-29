'use client'

import Link from 'next/link'

const inputCls = 'w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'
const taCls    = `${inputCls} resize-none`

export const rrpInput = inputCls
export const rrpLabel = labelCls
export const rrpTa    = taCls

interface Props {
  title: string
  subtitle: string
  department: string
  children: React.ReactNode
}

export function RRPFormShell({ title, subtitle, department, children }: Props) {
  return (
    <div className="min-h-screen py-10 px-4 bg-[#faf7f2]">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-xs font-semibold text-blue-600 hover:underline mb-6 inline-block">
          ← River Region Parents
        </Link>
        <div className="mb-6">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">{department}</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-2 leading-tight">{title}</h1>
          <p className="text-sm text-gray-600 leading-relaxed">{subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
