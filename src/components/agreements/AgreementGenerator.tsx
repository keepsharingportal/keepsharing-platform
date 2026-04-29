'use client'

import { useState } from 'react'
import { Printer, ChevronRight, ChevronLeft, Check, Plus, Trash2 } from 'lucide-react'
import { formatCurrency, formatSize } from '@/lib/utils'

const PUBLICATIONS = [
  { abbrev: 'RRP', name: 'River Region Parents', market: 'Montgomery, AL' },
  { abbrev: 'MBP', name: 'Mobile Bay Parents',   market: 'Mobile, AL' },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents',market: 'Auburn, AL' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents', market: 'Eastern Shore, AL' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents',market: 'Pensacola, FL' },
  { abbrev: 'RRB', name: 'River Region Boom',    market: 'Montgomery, AL' },
]

const AD_SIZES = [
  { value: 0.12, label: '1/8 Page' },
  { value: 0.16, label: '1/6 Page' },
  { value: 0.25, label: '1/4 Page' },
  { value: 0.33, label: '1/3 Page' },
  { value: 0.5,  label: '1/2 Page' },
  { value: 0.66, label: '2/3 Page' },
  { value: 1,    label: 'Full Page' },
  { value: 2,    label: '2-Page Spread' },
]

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MONTH_LABELS: Record<string, string> = { JAN:'January',FEB:'February',MAR:'March',APR:'April',MAY:'May',JUN:'June',JUL:'July',AUG:'August',SEP:'September',OCT:'October',NOV:'November',DEC:'December' }

interface LineItem {
  id: string
  publication: string
  size: number
  monthlyRate: number
  months: number
  specialPosition: string
}

type Step = 'info' | 'terms' | 'preview' | 'sign' | 'done'

const inputCls = 'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

const TERMS = `1. ADVERTISER AGREEMENT. This Agreement is entered into between KeepSharing LLC ("Publisher") and the advertiser named above ("Advertiser"). Publisher agrees to publish the advertisements described herein in the specified publication(s) during the specified period.

2. PAYMENT TERMS. Invoices are due upon receipt. A 1.5% monthly finance charge will be assessed on balances outstanding over 30 days. Publisher reserves the right to suspend advertising if payment is not received.

3. CANCELLATION. Agreements cancelled with less than 30 days notice prior to publication deadline will be billed at the full monthly rate. Short-rate adjustments will be made for advertisers who do not fulfill the terms of their contract.

4. ARTWORK. Advertiser is responsible for providing print-ready artwork by the specified deadline. Publisher will produce artwork at standard rates if requested. Publisher is not responsible for errors in advertiser-supplied artwork.

5. POSITIONING. Special position requests are accepted with premium rates as noted. Publisher reserves the right to adjust positioning as necessary for layout purposes.

6. LIMITATION OF LIABILITY. Publisher's liability for any error shall not exceed the cost of the advertisement in question. Publisher assumes no liability for errors in key numbers, post office box numbers, phone numbers, addresses, or other information inserted by the Advertiser.

7. GOVERNING LAW. This agreement shall be governed by the laws of the State of Alabama.`

export function AgreementGenerator() {
  const [step, setStep]   = useState<Step>('info')
  const [saved, setSaved] = useState(false)

  const [info, setInfo] = useState({
    businessName: '', contactName: '', title: '',
    billingStreet: '', billingCity: '', billingState: 'AL', billingZip: '',
    email: '', phone: '',
    placementInstructions: '',
    startMonth: 'MAR', startYear: '26',
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', publication: 'RRP', size: 0.25, monthlyRate: 275, months: 10, specialPosition: '' },
  ])

  const [signature, setSignature] = useState({ name: '', title: '', agreed: false })

  const subtotal    = lineItems.reduce((s, l) => s + l.monthlyRate * l.months, 0)
  const tax         = 0
  const adjustment  = 0
  const grandTotal  = subtotal + tax + adjustment

  const addLineItem = () => setLineItems((prev) => [
    ...prev,
    { id: String(Date.now()), publication: 'RRP', size: 0.25, monthlyRate: 275, months: 10, specialPosition: '' },
  ])

  const removeLineItem = (id: string) => setLineItems((prev) => prev.filter((l) => l.id !== id))

  const updateItem = (id: string, field: keyof LineItem, value: string | number) =>
    setLineItems((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l))

  const handlePrint = () => {
    setStep('preview')
    setTimeout(() => window.print(), 300)
  }

  const handleSign = async () => {
    setSaved(true)
    try {
      await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          info, lineItems, subtotal, grandTotal,
          signature: { ...signature, timestamp: new Date().toISOString() },
          status: 'Signed',
        }),
      })
    } catch { /* best-effort */ }
    setStep('done')
  }

  // ── Step: Info ─────────────────────────────────────────────────────────────
  if (step === 'info') return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Business Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Business Name *</label>
              <input type="text" value={info.businessName} onChange={(e) => setInfo((p) => ({...p, businessName: e.target.value}))} className={inputCls} placeholder="Company legal name" required />
            </div>
            <div>
              <label className={labelCls}>Contact Name *</label>
              <input type="text" value={info.contactName} onChange={(e) => setInfo((p) => ({...p, contactName: e.target.value}))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Title</label>
              <input type="text" value={info.title} onChange={(e) => setInfo((p) => ({...p, title: e.target.value}))} className={inputCls} placeholder="Owner, Marketing Director, etc." />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" value={info.email} onChange={(e) => setInfo((p) => ({...p, email: e.target.value}))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input type="tel" value={info.phone} onChange={(e) => setInfo((p) => ({...p, phone: e.target.value}))} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Billing Address *</label>
              <input type="text" value={info.billingStreet} onChange={(e) => setInfo((p) => ({...p, billingStreet: e.target.value}))} className={inputCls} placeholder="Street address" />
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <input type="text" value={info.billingCity} onChange={(e) => setInfo((p) => ({...p, billingCity: e.target.value}))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>State</label>
                <input type="text" maxLength={2} value={info.billingState} onChange={(e) => setInfo((p) => ({...p, billingState: e.target.value.toUpperCase()}))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>ZIP</label>
                <input type="text" value={info.billingZip} onChange={(e) => setInfo((p) => ({...p, billingZip: e.target.value}))} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Ad Schedule</h2>
            <button type="button" onClick={addLineItem}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={12} /> Add Line
            </button>
          </div>

          {lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-5 gap-3 items-end">
              <div>
                <label className={labelCls}>Publication</label>
                <select value={item.publication} onChange={(e) => updateItem(item.id, 'publication', e.target.value)} className={inputCls}>
                  {PUBLICATIONS.map((p) => <option key={p.abbrev} value={p.abbrev}>{p.abbrev}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Ad Size</label>
                <select value={item.size} onChange={(e) => updateItem(item.id, 'size', parseFloat(e.target.value))} className={inputCls}>
                  {AD_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Rate/Mo ($)</label>
                <input type="number" value={item.monthlyRate} onChange={(e) => updateItem(item.id, 'monthlyRate', parseInt(e.target.value)||0)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Months</label>
                <input type="number" min={1} max={24} value={item.months} onChange={(e) => updateItem(item.id, 'months', parseInt(e.target.value)||1)} className={inputCls} />
              </div>
              <div className="flex items-end gap-2">
                <div className="text-sm font-semibold text-gray-900 pb-2 whitespace-nowrap">
                  {formatCurrency(item.monthlyRate * item.months)}
                </div>
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(item.id)}
                    className="pb-2 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
              <span>Grand Total</span><span style={{ color: 'var(--color-gold-600)' }}>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Placement notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className={labelCls}>Special Placement Instructions</label>
          <textarea value={info.placementInstructions} onChange={(e) => setInfo((p) => ({...p, placementInstructions: e.target.value}))}
            className={`${inputCls} resize-y min-h-[60px]`} placeholder="Inside Front Cover, specific section, etc." />
        </div>

        <button onClick={() => setStep('terms')} disabled={!info.businessName || !info.contactName || !info.email}
          className="w-full py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
          Review Terms & Conditions <ChevronRight className="inline" size={16} />
        </button>
      </div>
    </div>
  )

  // ── Step: Terms ────────────────────────────────────────────────────────────
  if (step === 'terms') return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Terms and Conditions</h2>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{TERMS}</pre>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep('info')} className="flex items-center gap-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">
            <ChevronLeft size={14} /> Back
          </button>
          <button onClick={() => setStep('preview')} className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700">
            Preview Agreement <ChevronRight className="inline" size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  // ── Step: Preview ──────────────────────────────────────────────────────────
  if (step === 'preview') return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('terms')} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ChevronLeft size={14} /> Back
          </button>
          <span className="text-sm text-gray-500">Agreement Preview</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Printer size={13} /> Print / Save PDF
          </button>
          <button onClick={() => setStep('sign')} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            Collect Signature <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Agreement document */}
      <div className="max-w-3xl mx-auto px-8 py-10 bg-white" id="agreement-doc">
        <div className="text-center border-b-2 border-gray-900 pb-4 mb-8">
          <h1 className="text-2xl font-black tracking-tight">ADVERTISING AGREEMENT</h1>
          <p className="text-sm text-gray-600 mt-1">KeepSharing LLC · River Region Parents · riverregionparents.com</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Advertiser</h3>
            <p className="font-bold text-gray-900">{info.businessName}</p>
            <p className="text-sm text-gray-700">{info.contactName}{info.title ? `, ${info.title}` : ''}</p>
            <p className="text-sm text-gray-600">{info.billingStreet}</p>
            <p className="text-sm text-gray-600">{info.billingCity}, {info.billingState} {info.billingZip}</p>
            <p className="text-sm text-gray-600">{info.email} · {info.phone}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Publisher</h3>
            <p className="font-bold text-gray-900">KeepSharing LLC</p>
            <p className="text-sm text-gray-700">Jason Watson, Publisher</p>
            <p className="text-sm text-gray-600">Montgomery, Alabama 36117</p>
            <p className="text-sm text-gray-600">jason@riverregionparents.com</p>
            <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Line Items */}
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Advertising Schedule — Ordered Items</h3>
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Publication</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Ad Size</th>
              <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold">Monthly Rate</th>
              <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold">Months</th>
              <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => {
              const pub = PUBLICATIONS.find((p) => p.abbrev === item.publication)
              return (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{pub?.name ?? item.publication}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{formatSize(item.size)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-right">{formatCurrency(item.monthlyRate)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-right">{item.months}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm font-semibold text-right">{formatCurrency(item.monthlyRate * item.months)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border border-gray-300 px-3 py-2 text-sm font-bold text-right">Grand Total</td>
              <td className="border border-gray-300 px-3 py-2 text-base font-bold text-right">{formatCurrency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {info.placementInstructions && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Special Placement Instructions</h3>
            <p className="text-sm text-gray-700 border border-gray-200 rounded p-3 bg-gray-50">{info.placementInstructions}</p>
          </div>
        )}

        {/* Terms */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Terms and Conditions</h3>
          <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-sans leading-relaxed border border-gray-200 rounded p-4 bg-gray-50">{TERMS}</pre>
        </div>

        {/* Signature block */}
        <div className="grid grid-cols-2 gap-12 pt-8 border-t-2 border-gray-900">
          <div>
            <div className="border-b border-gray-400 mb-1 h-10">&nbsp;</div>
            <p className="text-xs text-gray-600">Advertiser Signature</p>
            <div className="border-b border-gray-400 mb-1 h-8 mt-4">&nbsp;</div>
            <p className="text-xs text-gray-600">Print Name / Title / Date</p>
          </div>
          <div>
            <div className="border-b border-gray-400 mb-1 h-10">&nbsp;</div>
            <p className="text-xs text-gray-600">Publisher Signature — Jason Watson</p>
            <div className="border-b border-gray-400 mb-1 h-8 mt-4">&nbsp;</div>
            <p className="text-xs text-gray-600">Date</p>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Step: Sign ─────────────────────────────────────────────────────────────
  if (step === 'sign') return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Digital Signature</h2>
          <p className="text-sm text-gray-500">
            {info.businessName} · {formatCurrency(grandTotal)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input type="text" value={signature.name} onChange={(e) => setSignature((p) => ({...p, name: e.target.value}))} className={inputCls} placeholder="Type your full legal name" />
          </div>
          <div>
            <label className={labelCls}>Title / Position *</label>
            <input type="text" value={signature.title} onChange={(e) => setSignature((p) => ({...p, title: e.target.value}))} className={inputCls} placeholder="Owner, Marketing Director, etc." />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600">
            <p className="font-semibold text-gray-800 mb-2">Agreement Summary</p>
            <p>{lineItems.length} ad placement{lineItems.length !== 1 ? 's' : ''} across {[...new Set(lineItems.map(l => l.publication))].join(', ')}</p>
            <p className="font-bold text-gray-900 mt-1">Grand Total: {formatCurrency(grandTotal)}</p>
            <p className="text-gray-500 mt-2">Signed: {new Date().toLocaleString('en-US')}</p>
          </div>
          <label className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={signature.agreed} onChange={(e) => setSignature((p) => ({...p, agreed: e.target.checked}))}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded" />
            <div className="text-sm">
              <div className="font-semibold text-blue-900">I agree to the terms of this advertising agreement</div>
              <div className="text-xs text-blue-700 mt-0.5">
                I am authorized to sign this agreement on behalf of {info.businessName}.
                This digital signature is legally binding.
              </div>
            </div>
          </label>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep('preview')} className="flex items-center gap-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">
            <ChevronLeft size={14} /> Back
          </button>
          <button onClick={handleSign} disabled={!signature.name || !signature.title || !signature.agreed}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
            <Check className="inline mr-1.5" size={14} /> Sign & Save Agreement
          </button>
        </div>
      </div>
    </div>
  )

  // ── Step: Done ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <Check size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Agreement Signed!</h2>
        <p className="text-sm text-gray-600 mb-6">
          <strong>{info.businessName}</strong> · {formatCurrency(grandTotal)} · Signed by {signature.name}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Printer size={13} /> Print Copy
          </button>
          <a href="/admin/advertisers/agreements" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            View All Agreements →
          </a>
        </div>
      </div>
    </div>
  )
}
