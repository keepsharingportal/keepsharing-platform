'use client'

// Inquiry form for guide listings.
//
// IMPORTANT — what this actually does today:
//   - Saves the inquiry to listing_messages
//   - Triggers an admin notification (see /api/listings/message)
//   - Admin forwards to the business
// It does NOT send a direct email to the business. The copy below reflects
// that — we don't claim to email the business directly.

import { useState, FormEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  advertiserAccountId: string
  advertiserName:      string
  guideTypeSlug:       string
}

export function ListingMessageForm({ advertiserAccountId, advertiserName, guideTypeSlug }: Props) {
  const [name,     setName]    = useState('')
  const [email,    setEmail]   = useState('')
  const [phone,    setPhone]   = useState('')
  const [message,  setMessage] = useState('')
  const [status,   setStatus]  = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    try {
      const res = await fetch('/api/listings/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_account_id: advertiserAccountId,
          guide_type_slug:       guideTypeSlug,
          parent_name:           name,
          parent_email:          email,
          parent_phone:          phone || null,
          message,
          source_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to submit')
      }
      setStatus('success')
      setName(''); setEmail(''); setPhone(''); setMessage('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (status === 'success') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-2">Thanks — we&apos;ve got it.</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our team will pass your message to <span className="font-semibold text-foreground">{advertiserName}</span> and follow up within 1 business day. If you included a phone number, expect a call from a local 334 area code.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="message-form">
      <CardContent className="p-6">
        <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Request Info Through River Region Parents
        </h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Our team will pass your message to <span className="font-semibold text-foreground">{advertiserName}</span> within 1 business day. Prefer to reach them directly? Use the contact links above.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={status === 'submitting'}
          />
          <Input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={status === 'submitting'}
          />
          <Input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={status === 'submitting'}
          />
          <textarea
            placeholder={`What would you like to know about ${advertiserName}?`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            disabled={status === 'submitting'}
            rows={4}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
          <Button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full rounded-full"
          >
            {status === 'submitting' ? 'Submitting…' : 'Send Request'}
          </Button>
          {status === 'error' && (
            <div className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
