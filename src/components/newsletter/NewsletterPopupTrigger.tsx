'use client'

import { useState, useEffect } from 'react'
import { NewsletterSignup } from './NewsletterSignup'

const STORAGE_KEY = 'rrp-newsletter-dismissed'
const SCROLL_THRESHOLD = 0.60 // 60% scroll
const TIME_ON_PAGE_MS  = 30_000 // 30 seconds

interface Props {
  source: string
  context?: { article_slug?: string; article_category?: string }
  headline?: string
  subheadline?: string
}

export function NewsletterPopupTrigger({ source, context, headline, subheadline }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if already dismissed or subscribed this browser session
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed) return
    } catch { return }

    let timeElapsed = false
    let scrollReached = false
    let timer: ReturnType<typeof setTimeout> | null = null

    function maybeShow() {
      if (timeElapsed && scrollReached) setShow(true)
    }

    // Time trigger
    timer = setTimeout(() => {
      timeElapsed = true
      maybeShow()
    }, TIME_ON_PAGE_MS)

    // Scroll trigger
    function onScroll() {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight)
      if (scrolled >= SCROLL_THRESHOLD) {
        scrollReached = true
        maybeShow()
        window.removeEventListener('scroll', onScroll)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(STORAGE_KEY, Date.now().toString()) } catch { /* */ }
  }

  if (!show) return null

  return (
    <NewsletterSignup
      variant="popup"
      source={source}
      context={context}
      headline={headline}
      subheadline={subheadline}
      cta_label="Subscribe Free"
      on_close={dismiss}
    />
  )
}
