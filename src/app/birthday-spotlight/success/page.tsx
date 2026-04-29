import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function BirthdaySuccessPage() {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} className="text-green-500" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Payment Confirmed! 🎉</h1>
      <p className="text-gray-600 max-w-md mx-auto mb-8">
        Thank you! Your birthday spotlight has been submitted. You'll receive a confirmation
        email shortly, and we'll follow up about your photo and any final details.
      </p>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left max-w-sm mx-auto mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">What happens next</h2>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>You'll receive a receipt at your email address</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>Our team will review your submission within 1 business day</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Your spotlight will appear in the issue closest to your child's birthday</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <span>You'll get a digital keepsake link to share with family and friends</span>
          </li>
        </ol>
      </div>
      <p className="text-sm text-gray-500">
        Questions? Call us at <a href="tel:(334)555-0100" className="text-blue-600 font-medium">(334) 555-0100</a>
      </p>
    </div>
  )
}
