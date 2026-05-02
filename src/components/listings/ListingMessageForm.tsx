'use client'

import { useState, FormEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  advertiserAccountId: string
  advertiserName: string
  guideTypeSlug: string
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
        throw new Error((data as { error?: string }).error ?? 'Failed to send message')
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
          <h3 className="font-bold text-foreground mb-2">Message sent!</h3>
          <p className="text-sm text-muted-foreground">
            {advertiserName} will reach out within 24 hours.
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
          Send {advertiserName} a message
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          They&apos;ll get an email and respond directly.
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
            placeholder={`Tell ${advertiserName} what you're looking for...`}
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
            {status === 'submitting' ? 'Sending...' : 'Send Message'}
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
