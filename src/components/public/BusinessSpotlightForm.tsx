'use client'

import { useState, useRef } from 'react'
import { Building2, Upload, X, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'

const QUESTIONS = [
  { id: 'q1', label: 'What does your business do, and who do you serve?',           placeholder: 'Tell us about your products or services and your ideal customer…' },
  { id: 'q2', label: 'What makes your business different from others in your field?', placeholder: 'Your unique approach, special qualities, or competitive advantage…' },
  { id: 'q3', label: 'How long have you been in business, and how did it start?',    placeholder: 'Your founding story — what inspired you to start this business…' },
  { id: 'q4', label: 'What do you love most about serving families in Montgomery?',  placeholder: 'Your connection to the community and why local families matter to you…' },
  { id: 'q5', label: 'What is one thing you wish more parents knew about your business?', placeholder: 'A common misconception, hidden gem, or underused service…' },
  { id: 'q6', label: 'Do you have any current specials, promotions, or seasonal offers?', placeholder: 'Upcoming deals, seasonal programs, or limited-time offers for readers…' },
  { id: 'q7', label: 'Can you share a success story or testimonial from a family you have served?', placeholder: 'A specific example of how you helped a local family (anonymized is fine)…' },
  { id: 'q8', label: 'What is the best way for families to get in touch or get started?', placeholder: 'Phone, website, walk-in, appointment, etc. — how to take the first step…' },
]

const inputCls = 'w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

type Step = 'info' | 'questions' | 'photos' | 'review' | 'submitting' | 'done'

export function BusinessSpotlightForm() {
  const [step, setStep]       = useState<Step>('info')
  const [submitting, setSubmitting] = useState(false)
  const [article, setArticle] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [info, setInfo] = useState({
    businessName: '', contactName: '', email: '', phone: '', website: '',
  })
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, '']))
  )
  const [photos, setPhotos]   = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  const setInfoField = (k: keyof typeof info) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInfo((p) => ({ ...p, [k]: e.target.value }))

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length)
    setPhotos((prev) => [...prev, ...files].slice(0, 5))
    files.forEach((f) => {
      const reader = new FileReader()
      reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target?.result as string].slice(0, 5))
      reader.readAsDataURL(f)
    })
  }

  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, idx) => idx !== i))
    setPreviews((p) => p.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async () => {
    setStep('submitting')
    setSubmitting(true)
    try {
      const res = await fetch('/api/business-spotlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ info, answers }),
      })
      const data = await res.json()
      setArticle(data.article ?? null)
      setStep('done')
    } catch {
      setStep('done')
    }
    setSubmitting(false)
  }

  const infoComplete = info.businessName && info.contactName && info.email && info.phone
  const questionsComplete = QUESTIONS.slice(0, 5).every((q) => answers[q.id]?.trim().length > 20)

  // ── Step: Business Info ──────────────────────────────────────────────────────
  if (step === 'info') return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <Building2 size={28} className="text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Spotlight</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Get featured in River Region Parents! Our team will write a professional 400-word article about your business — seen by thousands of Montgomery families.
        </p>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">✓ 400-word editorial article</span>
          <span className="flex items-center gap-1">✓ Up to 5 photos</span>
          <span className="flex items-center gap-1">✓ Social share badge</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Business Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Business Name *</label>
            <input type="text" value={info.businessName} onChange={setInfoField('businessName')}
              placeholder="Your business name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact Name *</label>
            <input type="text" value={info.contactName} onChange={setInfoField('contactName')}
              placeholder="Owner or primary contact" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input type="url" value={info.website} onChange={setInfoField('website')}
              placeholder="yourwebsite.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email Address *</label>
            <input type="email" value={info.email} onChange={setInfoField('email')}
              placeholder="you@yourbusiness.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone Number *</label>
            <input type="tel" value={info.phone} onChange={setInfoField('phone')}
              placeholder="(334) 555-0000" className={inputCls} />
          </div>
        </div>
      </div>

      <button onClick={() => setStep('questions')} disabled={!infoComplete}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200">
        Continue to Questions <ChevronRight size={18} />
      </button>
    </div>
  )

  // ── Step: Questions ──────────────────────────────────────────────────────────
  if (step === 'questions') return (
    <div className="space-y-6">
      <div>
        <button onClick={() => setStep('info')} className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Tell Us About Your Business</h2>
        <p className="text-sm text-gray-500">
          Answer these 8 questions and our AI writing team will craft a 400-word professional article.
          The more detail you give, the better the article.
        </p>
      </div>

      <div className="space-y-5">
        {QUESTIONS.map((q, i) => (
          <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <span className="text-blue-600 mr-2">{i + 1}.</span>{q.label}
              {i < 5 && <span className="text-red-400 ml-1">*</span>}
            </label>
            <textarea value={answers[q.id]} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder={q.placeholder}
              className={`${inputCls} resize-y min-h-[80px]`} />
            <div className="text-xs text-gray-400 mt-1 text-right">{answers[q.id].length} chars</div>
          </div>
        ))}
      </div>

      <button onClick={() => setStep('photos')} disabled={!questionsComplete}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        Continue to Photos <ChevronRight size={18} />
      </button>
      {!questionsComplete && (
        <p className="text-xs text-center text-gray-400">Please answer the first 5 questions (at least 20 characters each)</p>
      )}
    </div>
  )

  // ── Step: Photos ─────────────────────────────────────────────────────────────
  if (step === 'photos') return (
    <div className="space-y-6">
      <div>
        <button onClick={() => setStep('questions')} className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1">← Back</button>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Add Your Photos</h2>
        <p className="text-sm text-gray-500">Upload up to 5 photos for your business spotlight. High-resolution JPG or PNG. First photo will be the hero image.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {/* Photo grid */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
            {previews.map((src, i) => (
              <div key={i} className="relative group">
                <img src={src} alt={`Photo ${i+1}`} className="w-full aspect-square object-cover rounded-xl" />
                <button onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                  <X size={11} />
                </button>
                {i === 0 && <div className="absolute bottom-1 left-1 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">HERO</div>}
              </div>
            ))}
            {photos.length < 5 && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors">
                <Upload size={20} />
              </button>
            )}
          </div>
        )}

        {photos.length === 0 && (
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
            <Upload size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Click to upload photos</p>
            <p className="text-xs text-gray-400 mt-1">JPG or PNG · Up to 5 photos · 10MB max each</p>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handlePhotos} />
        <p className="text-xs text-gray-400 mt-3">{5 - photos.length} photo slot{5 - photos.length !== 1 ? 's' : ''} remaining</p>
      </div>

      <button onClick={() => setStep('review')}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
        Review & Submit <ChevronRight size={18} />
      </button>
    </div>
  )

  // ── Step: Review ─────────────────────────────────────────────────────────────
  if (step === 'review') return (
    <div className="space-y-6">
      <div>
        <button onClick={() => setStep('photos')} className="text-sm text-blue-600 hover:text-blue-800 mb-4">← Back</button>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Review Your Submission</h2>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-5 py-4"><span className="text-xs font-semibold text-gray-500 uppercase">Business</span><p className="text-sm font-medium text-gray-900 mt-1">{info.businessName}</p></div>
        <div className="px-5 py-4"><span className="text-xs font-semibold text-gray-500 uppercase">Contact</span><p className="text-sm text-gray-700 mt-1">{info.contactName} · {info.email} · {info.phone}</p></div>
        <div className="px-5 py-4"><span className="text-xs font-semibold text-gray-500 uppercase">Questions answered</span><p className="text-sm text-gray-700 mt-1">{QUESTIONS.filter((q) => answers[q.id]?.trim()).length} of 8</p></div>
        <div className="px-5 py-4"><span className="text-xs font-semibold text-gray-500 uppercase">Photos</span><p className="text-sm text-gray-700 mt-1">{photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded</p></div>
      </div>

      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
        <p className="text-sm font-semibold text-blue-900 mb-1">What happens after you submit</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Our AI writing team generates a 400-word article from your answers</li>
          <li>✓ Your submission goes into the editorial queue for review</li>
          <li>✓ We'll contact you within 2 business days to confirm details</li>
          <li>✓ You'll get a preview before it publishes</li>
        </ul>
      </div>

      <button onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
        Submit Business Spotlight <ChevronRight size={18} />
      </button>
    </div>
  )

  // ── Step: Submitting ─────────────────────────────────────────────────────────
  if (step === 'submitting') return (
    <div className="text-center py-16">
      <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Writing your article…</h2>
      <p className="text-sm text-gray-500">Our AI is crafting a 400-word article from your answers. This takes about 15 seconds.</p>
    </div>
  )

  // ── Step: Done ───────────────────────────────────────────────────────────────
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} className="text-green-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Submission Received!</h1>
      <p className="text-gray-600 max-w-md mx-auto mb-6">
        Your business spotlight has been submitted to our editorial queue. We'll be in touch within 2 business days.
      </p>
      {article && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Article Draft Preview</span>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full ring-1 ring-amber-200 font-medium">Pending editorial review</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{article}</p>
        </div>
      )}
      <p className="text-sm text-gray-500">Questions? Call <a href="tel:(334)555-0100" className="text-blue-600 font-medium">(334) 555-0100</a></p>
    </div>
  )
}
