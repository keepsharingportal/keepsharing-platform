'use client'

import { useState, FormEvent } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle } from 'lucide-react'

interface Props {
  variant?: 'sidebar' | 'inline'
  source?: string
}

export function NewsletterSignup({ variant = 'sidebar', source = 'homepage' }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || status === 'submitting') return
    setStatus('submitting')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (variant === 'sidebar') {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Join the Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Get the best local family events and stories delivered weekly.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={status === 'submitting'}
              className="bg-background"
            />
            <Button type="submit" disabled={status === 'submitting'} className="w-full rounded-full">
              {status === 'success' ? 'Subscribed!' : status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
            </Button>
            {status === 'error' && (
              <p className="text-xs text-destructive">Could not subscribe. Try again.</p>
            )}
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <Input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        disabled={status === 'submitting'}
        className="flex-1 bg-white"
      />
      <Button
        type="submit"
        disabled={status === 'submitting'}
        variant="secondary"
        className="rounded-full"
      >
        {status === 'success' ? 'Subscribed!' : status === 'submitting' ? 'Working...' : 'Subscribe Free'}
      </Button>
    </form>
  )
}
