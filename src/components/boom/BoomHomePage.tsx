'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY       = '#0B1829'
const NAVY_2     = '#112035'
const NAVY_CARD  = '#162844'
const NAVY_LIGHT = '#1E3558'
const GOLD       = '#C9A84B'
const GOLD_LIGHT = '#D4B870'
const GOLD_MUTED = '#8B7340'
const CREAM      = '#F4EFE4'
const CREAM_MID  = '#D8D0C0'
const CREAM_DIM  = '#9A9288'
const WHITE      = '#FFFFFF'

// ── Departments ───────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: 'Thought',       emoji: '💭', desc: 'Ideas worth sitting with' },
  { name: 'Humor',         emoji: '😄', desc: 'Life is funnier than you think' },
  { name: 'Relationships', emoji: '💙', desc: 'The bonds that define us' },
  { name: 'Health',        emoji: '💪', desc: 'Strength at every age' },
  { name: 'Inspiration',   emoji: '✨', desc: 'Stories that move you' },
  { name: 'Community',     emoji: '🏙', desc: 'Our River Region family' },
  { name: 'Travel',        emoji: '✈️', desc: "The world's still waiting" },
  { name: 'Taste',         emoji: '🍷', desc: 'Dining, drinks & delight' },
]

// ── Featured stories ──────────────────────────────────────────────────────────

const FEATURED_STORIES = [
  {
    dept: 'Cover Profile',
    headline: "The Woman Who Rebuilt Montgomery's Heart",
    subhead: "After 40 years in medicine, Dr. Patricia Ellison finally said yes to the question she'd been afraid to ask herself.",
    author: 'Jason Watson',
    readTime: '8 min read',
    gradient: 'linear-gradient(160deg, #3a2a1a 0%, #6b4c2e 100%)',
    featured: true,
  },
  {
    dept: 'Relationships',
    headline: 'The Art of the Long Marriage',
    subhead: 'Three River Region couples — 40, 52, and 61 years in — on what nobody tells you about staying.',
    author: 'Susan R. Caldwell',
    readTime: '6 min read',
    gradient: 'linear-gradient(160deg, #1a2a3a 0%, #2e4a6b 100%)',
    featured: false,
  },
  {
    dept: 'Health',
    headline: 'Your Best Decade Might Still Be Ahead',
    subhead: "New research from UAB says the habits you build at 55 shape everything that comes after. Here's the simple truth.",
    author: 'Dr. Marcus Webb',
    readTime: '5 min read',
    gradient: 'linear-gradient(160deg, #1a2a1a 0%, #2e5c3a 100%)',
    featured: false,
  },
  {
    dept: 'Thought',
    headline: 'What We Owe the Next Generation',
    subhead: 'A conversation about wisdom, mentorship, and why experience — not youth — is the scarcest resource in any room.',
    author: 'Jason Watson',
    readTime: '7 min read',
    gradient: 'linear-gradient(160deg, #2a1a2a 0%, #5c2e5c 100%)',
    featured: false,
  },
  {
    dept: 'Travel',
    headline: 'Sixty Days in Portugal: Notes From the Road',
    subhead: "River Region's Tom and Linda Braswell sold the house, bought the plane tickets, and figured the rest out from there.",
    author: 'Linda Braswell',
    readTime: '9 min read',
    gradient: 'linear-gradient(160deg, #2a1a10 0%, #6b3a1a 100%)',
    featured: false,
  },
  {
    dept: 'Humor',
    headline: 'Things I Now Say That I Swore I Never Would',
    subhead: '"Because I said so." "In my day..." "Have you tried turning it off and back on?" The full humiliating list.',
    author: 'Carol Ann Higgins',
    readTime: '4 min read',
    gradient: 'linear-gradient(160deg, #2a2a10 0%, #5c5c1a 100%)',
    featured: false,
  },
]

// ── Events (55+ items) ───────────────────────────────────────────────────────

type EventType = 'music' | 'art' | 'theater' | 'dining' | 'health' | 'social' | 'outdoor' | 'education' | 'film' | 'spiritual'

type BoomEvent = {
  date: string
  time?: string
  title: string
  venue: string
  type: EventType
  price?: string
  description?: string
}

const EVENTS: BoomEvent[] = [
  // Music
  { date: 'Apr 12', time: '8:00 PM',   title: 'Montgomery Symphony Orchestra — Brahms & Beyond',       venue: 'Davis Theatre, Montgomery',          type: 'music',    price: '$25–$65' },
  { date: 'Apr 19', time: '6:00 PM',   title: 'Old Town Acoustic Music Series',                         venue: 'Downtown Montgomery Amphitheater',    type: 'music',    price: 'Free' },
  { date: 'Apr 26', time: '7:00 PM',   title: 'Capitol City Jazz & Blues Festival — Night One',          venue: 'Riverfront Park, Montgomery',         type: 'music',    price: '$15' },
  { date: 'Apr 27', time: '6:00 PM',   title: 'Capitol City Jazz & Blues Festival — Night Two',          venue: 'Riverfront Park, Montgomery',         type: 'music',    price: '$15' },
  { date: 'Apr 28', time: '3:00 PM',   title: 'River Region Community Orchestra — Spring Concert',       venue: 'MPAC Auditorium',                     type: 'music',    price: '$10' },
  { date: 'May 9',  time: '7:30 PM',   title: 'Sinatra Tribute Night — Dean Martin & Friends',           venue: 'Grand Theatre, Montgomery',           type: 'music',    price: '$35' },
  { date: 'May 16', time: '7:00 PM',   title: 'Montgomery Wind Ensemble — Spring Finale',                venue: 'Frazer United Methodist Church',      type: 'music',    price: 'Free' },
  { date: 'May 23', time: '8:00 PM',   title: 'Montgomery Symphony — Pops at the Park',                  venue: 'Blount Cultural Park',                type: 'music',    price: 'Free' },
  // Art & Gallery
  { date: 'Apr 18', time: '6:30 PM',   title: 'Montgomery Museum of Fine Arts — Opening Reception',      venue: 'MMFA, Blount Cultural Park',          type: 'art',      price: 'Members free · $12' },
  { date: 'May 2',  time: '6:00 PM',   title: 'Gallery Night — Downtown Montgomery',                     venue: 'Various galleries, downtown',         type: 'art',      price: 'Free' },
  { date: 'May 6',  time: '10:00 AM',  title: 'MMFA Free First Tuesday — Family Day',                    venue: 'Montgomery Museum of Fine Arts',      type: 'art',      price: 'Free' },
  { date: 'May 14',                    title: '"Old Alabama Town Photography Exhibition" Opens',           venue: 'Old Alabama Town Visitor Center',     type: 'art',      price: 'With admission' },
  { date: 'May 17', time: '5:00 PM',   title: 'Artworks Gallery — New Works by Local Painters',           venue: 'Artworks Gallery, Cloverdale',        type: 'art',      price: 'Free' },
  // Theater
  { date: 'Apr 14', time: '7:30 PM',   title: 'ASF — Arsenic and Old Lace (Opening Night)',               venue: 'Alabama Shakespeare Festival',        type: 'theater',  price: '$28–$62' },
  { date: 'Apr 20', time: '2:00 PM',   title: 'Montgomery Ballet — Spring Showcase',                      venue: 'Davis Theatre, Montgomery',          type: 'theater',  price: '$20–$45' },
  { date: 'May 8',  time: '7:30 PM',   title: 'Grand Theatre — "Driving Miss Daisy"',                     venue: 'Grand Theatre, Montgomery',          type: 'theater',  price: '$22' },
  { date: 'May 15', time: '2:00 PM',   title: 'ASF Matinée — Sunday in the Park with George',             venue: 'Alabama Shakespeare Festival',        type: 'theater',  price: '$28–$62' },
  { date: 'May 22', time: '7:30 PM',   title: 'Faulkner University Players — Original Works Night',       venue: 'Faulkner University Theatre',         type: 'theater',  price: '$10' },
  // Dining
  { date: 'Apr 17', time: '7:00 PM',   title: 'Wine & Cheese Tasting — Spring Varietals',                 venue: 'Salt + Pepper Restaurant',           type: 'dining',   price: '$45 per person' },
  { date: 'Apr 24', time: '6:30 PM',   title: 'Farm-to-Table Dinner — Spring Edition',                    venue: 'The Farmers Table, Montgomery',       type: 'dining',   price: '$65 per person' },
  { date: 'Apr 30', time: '6:00 PM',   title: 'Cooking Class: Classic Southern Dishes',                   venue: 'Kitchen on Perry Street',             type: 'dining',   price: '$55 per person' },
  { date: 'May 5',                     title: 'Restaurant Week Montgomery — Begins',                       venue: 'Participating restaurants citywide',  type: 'dining',   price: '$35–$55 prix fixe' },
  { date: 'May 14', time: '6:30 PM',   title: 'Whiskey & Words Literary Dinner',                          venue: 'Capitol Grille, Renaissance Hotel',   type: 'dining',   price: '$75 per person' },
  { date: 'May 21', time: '7:00 PM',   title: 'Italian Wine Night with Sommelier Presentation',           venue: 'Ravello Restaurant, East Montgomery', type: 'dining',   price: '$50 per person' },
  // Health & Wellness
  { date: 'Apr 15', time: '9:00 AM',   title: 'Senior Fitness Fair — Free Health Screenings',             venue: 'East Montgomery YMCA',               type: 'health',   price: 'Free' },
  { date: 'Apr 19',                    title: '"Healthy at 50+" Health Expo',                              venue: 'BJCC, Montgomery',                   type: 'health',   price: 'Free admission' },
  { date: 'Apr 22', time: '7:30 AM',   title: 'Heart Health Walk — American Heart Association',           venue: 'Riverwalk Amphitheater',              type: 'health',   price: 'Free · donations welcome' },
  { date: 'Apr 23', time: '10:00 AM',  title: 'Medicare Explained: Free Workshop',                        venue: 'Prattville Senior Center',           type: 'health',   price: 'Free' },
  { date: 'May 3',                     title: 'Mindfulness & Meditation Retreat',                          venue: 'Prattville Baptist Church Retreat',  type: 'health',   price: '$35' },
  { date: 'May 10', time: '9:00 AM',   title: 'Tai Chi in the Park — Monthly Session',                    venue: 'Blount Cultural Park Pavilion',       type: 'health',   price: 'Free' },
  { date: 'Ongoing',                   title: 'Yoga for the Young at Heart — Tue & Thu',                   venue: 'Eastchase Community Library',         type: 'health',   price: '$12/class' },
  // Social & Community
  { date: 'Apr 16', time: '6:00 PM',   title: 'River Region Readers Book Club — "The Women"',             venue: 'Barnes & Noble, Eastchase',          type: 'social',   price: 'Free' },
  { date: 'Apr 17', time: '10:00 AM',  title: 'Genealogy Research Workshop',                              venue: 'Montgomery Public Library',          type: 'social',   price: 'Free' },
  { date: 'Apr 25', time: '6:30 PM',   title: '50+ Singles Social Mixer',                                 venue: "Wintzell's Oyster House, Eastchase", type: 'social',   price: '$15 includes first drink' },
  { date: 'Apr 28', time: '6:00 PM',   title: 'Travel Club — Plan Your Gulf Shores Getaway',              venue: 'Eastchase Community Center',         type: 'social',   price: 'Members $5 · guests $10' },
  { date: 'May 3',  time: '8:00 AM',   title: 'Master Gardeners Spring Plant Sale',                       venue: 'Alabama Extension Office',           type: 'social',   price: 'Various prices' },
  { date: 'May 7',  time: '11:30 AM',  title: 'Senior Luncheon — "Legendary Locals" Series',              venue: 'East Montgomery Senior Center',      type: 'social',   price: '$8' },
  { date: 'May 12', time: '6:30 PM',   title: 'Investment Club Monthly Meeting',                          venue: 'Eastchase Community Center',         type: 'social',   price: 'Members only' },
  { date: 'May 21', time: '11:00 AM',  title: "Mother's Day Brunch with the River Region Boom",           venue: 'The Vintage Year Restaurant',        type: 'social',   price: '$55 per person' },
  // Outdoor & Nature
  { date: 'Apr 13', time: '9:00 AM',   title: 'Walking Tour: Montgomery Civil Rights History',            venue: 'Dexter Avenue Baptist Church (start)', type: 'outdoor', price: '$10 suggested' },
  { date: 'Apr 19',                    title: 'Garden Tour of Old Alabama Town — Two Days',                venue: 'Old Alabama Town, downtown',         type: 'outdoor',  price: '$15' },
  { date: 'Apr 26', time: '9:00 AM',   title: 'Day Trip to Tuskegee Institute',                           venue: 'Departs Montgomery Civic Center',     type: 'outdoor',  price: '$25 includes transport' },
  { date: 'May 3',  time: '8:00 AM',   title: 'Wetumpka River Nature Walk',                               venue: 'Wetumpka Amphitheater Trailhead',     type: 'outdoor',  price: 'Free' },
  { date: 'May 10', time: '10:00 AM',  title: 'Millbrook Garden Club — Spring Home & Garden Tour',        venue: 'Various private gardens, Millbrook',  type: 'outdoor',  price: '$20' },
  { date: 'Sat/Sun',                   title: 'Alabama River Scenic Boat Tours — Weekly',                  venue: 'Riverwalk Amphitheater Dock',         type: 'outdoor',  price: '$18 per person' },
  { date: 'Tuesdays', time: '7:00 AM', title: 'Prattville Trail Walkers — Weekly Group Walk',             venue: 'Prattville Amphitheater Parking Lot', type: 'outdoor',  price: 'Free' },
  // Education & Lectures
  { date: 'Apr 16', time: '2:00 PM',   title: 'History Lecture: Montgomery in the Civil Rights Era',     venue: 'Montgomery Public Library Auditorium', type: 'education','price': 'Free' },
  { date: 'Apr 17', time: '5:30 PM',   title: 'Financial Planning After 50 — Free Seminar',              venue: 'Regions Bank, Eastchase',             type: 'education', price: 'Free · register online' },
  { date: 'Apr 22', time: '5:00 PM',   title: 'Estate Planning Workshop',                                 venue: 'Morrison Mahoney Law',               type: 'education', price: 'Free' },
  { date: 'Apr 28', time: '10:00 AM',  title: 'Technology for Seniors: Using Your Smartphone',           venue: 'East Montgomery Library',            type: 'education', price: 'Free' },
  { date: 'May 5',  time: '6:00 PM',   title: 'Memoir Writing Workshop — Series Begins',                 venue: 'Faulkner University Library',         type: 'education', price: '$45/4-week series' },
  { date: 'May 6',  time: '6:30 PM',   title: 'Spanish for Travelers — Beginner Class Begins',           venue: 'Community Center, Eastchase',        type: 'education', price: '$40/6-week series' },
  // Film
  { date: 'Apr 18', time: '7:00 PM',   title: 'Classic Film Series — "Casablanca" with Discussion',      venue: 'Pike Road Arts Center',              type: 'film',      price: '$8' },
  { date: 'Apr 25', time: '7:00 PM',   title: '"Golden Age of Hollywood" Film Festival — Night One',     venue: 'Capri Theatre, Montgomery',          type: 'film',      price: '$12' },
  { date: 'May 2',  time: '7:00 PM',   title: 'Foreign Film Night — Italian Cinema Series',               venue: 'Capri Theatre, Montgomery',          type: 'film',      price: '$10' },
  // Spiritual
  { date: 'Apr 17', time: '7:30 AM',   title: 'Interfaith Prayer Breakfast',                              venue: 'Montgomery Country Club',            type: 'spiritual', price: '$25 includes breakfast' },
  { date: 'May 3',  time: '9:00 AM',   title: 'Contemplative Retreat: Finding Your Still Place',         venue: 'Prattville Christian Retreat Center', type: 'spiritual', price: '$45/day' },
]

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string }> = {
  music:     { label: 'Music',        color: GOLD,        bg: 'rgba(201,168,75,0.15)' },
  art:       { label: 'Art & Gallery',color: '#9B7FD4',   bg: 'rgba(155,127,212,0.15)' },
  theater:   { label: 'Theater',      color: '#D46F9B',   bg: 'rgba(212,111,155,0.15)' },
  dining:    { label: 'Dining',       color: '#D4886F',   bg: 'rgba(212,136,111,0.15)' },
  health:    { label: 'Health',       color: '#6FD4A0',   bg: 'rgba(111,212,160,0.15)' },
  social:    { label: 'Social',       color: '#6FA8D4',   bg: 'rgba(111,168,212,0.15)' },
  outdoor:   { label: 'Outdoor',      color: '#9FD46F',   bg: 'rgba(159,212,111,0.15)' },
  education: { label: 'Education',    color: '#D4C46F',   bg: 'rgba(212,196,111,0.15)' },
  film:      { label: 'Film',         color: '#B06FD4',   bg: 'rgba(176,111,212,0.15)' },
  spiritual: { label: 'Spiritual',    color: '#D4A06F',   bg: 'rgba(212,160,111,0.15)' },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GoldDivider({ wide = false }: { wide?: boolean }) {
  return (
    <div className={cn('h-px', wide ? 'w-24' : 'w-12')} style={{ backgroundColor: GOLD }} />
  )
}

// ── Newsletter section ────────────────────────────────────────────────────────

function NewsletterSection() {
  const [email, setEmail]     = useState('')
  const [name, setName]       = useState('')
  const [done, setDone]       = useState(false)
  const [submitting, setSub]  = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSub(true)
    await new Promise(r => setTimeout(r, 800))
    setDone(true)
    setSub(false)
  }

  return (
    <section className="py-20 px-5" style={{ backgroundColor: NAVY_2 }}>
      <div className="max-w-2xl mx-auto text-center">
        <GoldDivider wide />
        <div className="mt-6 mb-4 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: GOLD_MUTED }}>
          From Jason's Desk
        </div>
        <h2 className="text-3xl font-bold leading-tight mb-6" style={{ color: CREAM, fontFamily: 'Georgia, serif' }}>
          Age Well, My Friends.
        </h2>
        <blockquote className="text-lg leading-relaxed mb-3 italic" style={{ color: CREAM_MID, fontFamily: 'Georgia, serif' }}>
          "Every month, we bring you the best of what the River Region has to offer — the stories that move you,
          the events worth dressing up for, and the wisdom of people who've lived well and still are."
        </blockquote>
        <p className="text-base mb-8" style={{ color: CREAM_DIM }}>
          — Jason Watson, Founder, River Region Boom
        </p>

        {done ? (
          <div className="py-6 px-8 rounded-2xl border" style={{ borderColor: GOLD_MUTED, backgroundColor: 'rgba(201,168,75,0.08)' }}>
            <p className="text-lg font-semibold" style={{ color: GOLD_LIGHT }}>You're in. Welcome to the Boom.</p>
            <p className="text-sm mt-1" style={{ color: CREAM_DIM }}>Your first issue arrives next month. We'll try to make it worth the wait.</p>
          </div>
        ) : (
          <form onSubmit={handle} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="First name"
              className="flex-1 px-4 py-3 text-base rounded-xl outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: NAVY_LIGHT, color: CREAM, border: `1px solid ${NAVY_LIGHT}`,
                fontFamily: 'Georgia, serif',
              }}
              onFocus={e => e.target.style.borderColor = GOLD}
              onBlur={e => e.target.style.borderColor = NAVY_LIGHT}
            />
            <input
              required type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email"
              className="flex-1 px-4 py-3 text-base rounded-xl outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: NAVY_LIGHT, color: CREAM, border: `1px solid ${NAVY_LIGHT}`,
                fontFamily: 'Georgia, serif',
              }}
              onFocus={e => e.target.style.borderColor = GOLD}
              onBlur={e => e.target.style.borderColor = NAVY_LIGHT}
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 text-base font-bold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}
            >
              {submitting ? '…' : 'Subscribe'}
            </button>
          </form>
        )}
        <p className="text-xs mt-4" style={{ color: CREAM_DIM }}>
          Monthly. No spam. Unsubscribe anytime. We write like we talk — honestly.
        </p>
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BoomHomePage() {
  const [activeEventType, setActiveEventType] = useState<EventType | 'all'>('all')
  const [eventSearch, setEventSearch]         = useState('')
  const [deptHover, setDeptHover]             = useState<number | null>(null)

  const filteredEvents = EVENTS.filter(ev => {
    const typeOk = activeEventType === 'all' || ev.type === activeEventType
    const searchOk = !eventSearch.trim() || ev.title.toLowerCase().includes(eventSearch.toLowerCase()) || ev.venue.toLowerCase().includes(eventSearch.toLowerCase())
    return typeOk && searchOk
  })

  const hero = FEATURED_STORIES[0]
  const grid = FEATURED_STORIES.slice(1)

  return (
    <div style={{ backgroundColor: NAVY, color: CREAM, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 18 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: NAVY, borderColor: NAVY_LIGHT }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center justify-between py-4">
            <Link href="/boom" className="flex items-baseline gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: GOLD, fontFamily: 'Georgia, serif' }}>
                  River Region
                </div>
                <div className="text-2xl font-bold leading-none tracking-tight" style={{ color: WHITE, fontFamily: 'Georgia, serif' }}>
                  Boom
                </div>
              </div>
              <div className="w-px h-8 mx-2" style={{ backgroundColor: NAVY_LIGHT }} />
              <div className="text-xs italic" style={{ color: CREAM_DIM }}>Age Well, Live Fully</div>
            </Link>

            {/* Departments nav — desktop */}
            <nav className="hidden lg:flex items-center gap-5">
              {DEPARTMENTS.slice(0, 5).map(d => (
                <button key={d.name}
                  className="text-sm transition-colors hover:opacity-100 tracking-wide"
                  style={{ color: CREAM_DIM, fontFamily: 'Georgia, serif' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = GOLD}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = CREAM_DIM}
                >
                  {d.name}
                </button>
              ))}
            </nav>

            <Link
              href="/advertise"
              className="hidden sm:block px-4 py-2 text-sm font-bold rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}
            >
              Advertise
            </Link>
          </div>
          {/* Gold rule */}
          <div className="h-px w-full" style={{ backgroundColor: GOLD, opacity: 0.4 }} />
        </div>
      </header>

      {/* ── Issue banner ────────────────────────────────────────────────── */}
      <div className="border-b" style={{ backgroundColor: NAVY_2, borderColor: NAVY_LIGHT }}>
        <div className="max-w-5xl mx-auto px-5 py-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: GOLD_MUTED }}>
            May 2026 Issue
          </div>
          <div className="text-xs italic" style={{ color: CREAM_DIM }}>
            Montgomery&apos;s magazine for those who&apos;ve earned the best years of their lives.
          </div>
        </div>
      </div>

      {/* ── Departments strip ───────────────────────────────────────────── */}
      <section className="border-b" style={{ backgroundColor: NAVY_CARD, borderColor: NAVY_LIGHT }}>
        <div className="max-w-5xl mx-auto px-5 py-5">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
            {DEPARTMENTS.map((d, i) => (
              <button
                key={d.name}
                onMouseEnter={() => setDeptHover(i)}
                onMouseLeave={() => setDeptHover(null)}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all text-center"
                style={{
                  backgroundColor: deptHover === i ? NAVY_LIGHT : 'transparent',
                  border: `1px solid ${deptHover === i ? GOLD_MUTED : 'transparent'}`,
                }}
              >
                <span className="text-2xl leading-none">{d.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-wider leading-tight" style={{ color: deptHover === i ? GOLD : CREAM_DIM }}>
                  {d.name}
                </span>
                {deptHover === i && (
                  <span className="text-[10px] leading-tight italic" style={{ color: CREAM_DIM }}>{d.desc}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cover Profile Hero ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Image */}
          <div
            className="rounded-2xl overflow-hidden aspect-[3/4] flex flex-col justify-end p-6"
            style={{ background: hero.gradient, border: `1px solid ${NAVY_LIGHT}` }}
          >
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: GOLD }}>
              Cover Profile
            </div>
            <div className="text-sm italic" style={{ color: CREAM_DIM }}>Portrait photography</div>
          </div>
          {/* Text */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GoldDivider />
              <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
                Cover Profile
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4" style={{ color: WHITE }}>
              {hero.headline}
            </h1>
            <p className="text-lg leading-relaxed mb-6 italic" style={{ color: CREAM_MID }}>
              {hero.subhead}
            </p>
            <div className="flex items-center gap-4 text-sm" style={{ color: CREAM_DIM }}>
              <span>By {hero.author}</span>
              <span style={{ color: NAVY_LIGHT }}>·</span>
              <span>{hero.readTime}</span>
            </div>
            <div className="mt-6 h-px w-full" style={{ backgroundColor: NAVY_LIGHT }} />
            <button
              className="mt-5 text-sm font-bold tracking-wide transition-all hover:opacity-80"
              style={{ color: GOLD, fontFamily: 'Georgia, serif' }}
            >
              Read the full story →
            </button>
          </div>
        </div>
      </section>

      {/* ── Featured stories grid ───────────────────────────────────────── */}
      <section className="py-10 border-t" style={{ borderColor: NAVY_LIGHT }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center gap-3 mb-8">
            <GoldDivider wide />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: GOLD_MUTED }}>
              In This Issue
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {grid.map((s, i) => (
              <article
                key={i}
                className="rounded-xl overflow-hidden border transition-all hover:border-opacity-60 cursor-pointer"
                style={{ backgroundColor: NAVY_CARD, border: `1px solid ${NAVY_LIGHT}` }}
              >
                <div
                  className="aspect-[16/9] flex items-end p-3"
                  style={{ background: s.gradient }}
                >
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: GOLD }}>
                    {s.dept}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-bold leading-snug mb-2" style={{ color: WHITE }}>
                    {s.headline}
                  </h3>
                  <p className="text-sm leading-relaxed line-clamp-2 mb-3" style={{ color: CREAM_MID, fontFamily: 'system-ui, sans-serif' }}>
                    {s.subhead}
                  </p>
                  <div className="flex items-center justify-between text-xs" style={{ color: CREAM_DIM }}>
                    <span style={{ fontFamily: 'system-ui, sans-serif' }}>{s.author}</span>
                    <span style={{ fontFamily: 'system-ui, sans-serif' }}>{s.readTime}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Columnist Strip ─────────────────────────────────────────────── */}
      <section className="border-t" style={{ borderColor: NAVY_LIGHT, backgroundColor: NAVY_2 }}>
        <div className="max-w-5xl mx-auto px-5 py-10">
          <div className="flex items-center gap-3 mb-7">
            <GoldDivider wide />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: GOLD_MUTED }}>
              Our Columnists
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name:    'Jeff Barganier',
                column:  'The Long View',
                bio:     'Jeff spent 30 years in banking before discovering that the best investment was always the people around him. He writes about leadership, faith, and what it means to leave something behind worth finding.',
                initials:'JB',
                color:   '#6FA8D4',
              },
              {
                name:    'Archie Grumbleton',
                column:  'Grumbling With Grace',
                bio:     "Don't let the name fool you — Archie is the warmest curmudgeon in Montgomery. His monthly column on modern life, neighborhood change, and why everything was not actually better back then is the most-forwarded thing we publish.",
                initials:'AG',
                color:   '#C9A84B',
              },
              {
                name:    'Greg Budell',
                column:  'Second Wind',
                bio:     'A retired physician who took up ultramarathon running at 58, Greg writes about the science and spirit of staying vital. Equal parts lab report and love letter to the body that still surprises you.',
                initials:'GB',
                color:   '#6FD4A0',
              },
            ].map(col => (
              <div
                key={col.name}
                className="rounded-2xl p-5 border"
                style={{ backgroundColor: NAVY_CARD, borderColor: NAVY_LIGHT }}
              >
                {/* Avatar */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                    style={{
                      backgroundColor: col.color + '22',
                      border: `2px solid ${col.color}44`,
                      color: col.color,
                      fontFamily: 'var(--font-playfair), Georgia, serif',
                    }}
                  >
                    {col.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight" style={{ color: CREAM, fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                      {col.name}
                    </div>
                    <div className="text-[11px] italic mt-0.5" style={{ color: col.color }}>
                      {col.column}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: CREAM_MID, fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
                  {col.bio}
                </p>
                <button
                  className="mt-4 text-xs font-semibold transition-all hover:opacity-80"
                  style={{ color: col.color }}
                >
                  Read column →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cover Archive ───────────────────────────────────────────────── */}
      <section className="border-t py-12" style={{ borderColor: NAVY_LIGHT }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center gap-3 mb-7">
            <GoldDivider wide />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: GOLD_MUTED }}>
              Past Issues
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { month: 'Apr', year: '2026', gradient: 'linear-gradient(160deg, #1a2a3a 0%, #2e4a6b 100%)', cover: 'The Art of the Long Marriage' },
              { month: 'Mar', year: '2026', gradient: 'linear-gradient(160deg, #1a2a1a 0%, #2e5c3a 100%)', cover: 'Spring Into Your Best Self' },
              { month: 'Feb', year: '2026', gradient: 'linear-gradient(160deg, #2a1a2a 0%, #5c2e5c 100%)', cover: 'Love After Sixty' },
              { month: 'Jan', year: '2026', gradient: 'linear-gradient(160deg, #1a2010 0%, #3a4a20 100%)', cover: 'A New Chapter Begins' },
              { month: 'Dec', year: '2025', gradient: 'linear-gradient(160deg, #2a1a10 0%, #6b3a1a 100%)', cover: 'The Gift of Time' },
              { month: 'Nov', year: '2025', gradient: 'linear-gradient(160deg, #3a2a1a 0%, #5a3a2a 100%)', cover: 'Gratitude at Every Age' },
            ].map((issue, i) => (
              <button
                key={i}
                className="group rounded-xl overflow-hidden border transition-all hover:border-opacity-80 text-left"
                style={{ borderColor: NAVY_LIGHT }}
              >
                <div
                  className="aspect-[3/4] flex flex-col justify-end p-2"
                  style={{ background: issue.gradient }}
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] leading-tight" style={{ color: GOLD }}>
                    Boom
                  </div>
                  <div className="text-[10px] font-semibold leading-tight mt-0.5" style={{ color: CREAM, fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                    {issue.cover}
                  </div>
                </div>
                <div
                  className="px-2 py-1.5"
                  style={{ backgroundColor: NAVY_CARD }}
                >
                  <div className="text-[10px] font-semibold" style={{ color: GOLD_MUTED, fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
                    {issue.month} {issue.year}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gold divider strip ──────────────────────────────────────────── */}
      <div className="py-8 px-5 text-center border-t border-b" style={{ borderColor: NAVY_LIGHT, backgroundColor: NAVY_2 }}>
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_MUTED, opacity: 0.4 }} />
          <p className="text-lg italic font-medium" style={{ color: CREAM_MID }}>
            This isn&apos;t about getting old. It&apos;s about getting wise.
          </p>
          <div className="flex-1 h-px" style={{ backgroundColor: GOLD_MUTED, opacity: 0.4 }} />
        </div>
      </div>

      {/* ── Events section ──────────────────────────────────────────────── */}
      <section className="py-14 border-t" style={{ borderColor: NAVY_LIGHT }}>
        <div className="max-w-5xl mx-auto px-5">
          {/* Section header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <GoldDivider wide />
                <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: GOLD_MUTED }}>
                  River Region Calendar
                </span>
              </div>
              <h2 className="text-2xl font-bold" style={{ color: WHITE }}>
                This Month in the River Region
              </h2>
              <p className="text-sm mt-1 italic" style={{ color: CREAM_DIM }}>
                {EVENTS.length} curated events for April & May 2026
              </p>
            </div>
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: CREAM_DIM }}>🔍</span>
              <input
                value={eventSearch}
                onChange={e => setEventSearch(e.target.value)}
                placeholder="Search events…"
                className="pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-all"
                style={{
                  backgroundColor: NAVY_CARD,
                  color: CREAM, border: `1px solid ${NAVY_LIGHT}`,
                  fontFamily: 'system-ui, sans-serif',
                  width: 200,
                }}
              />
            </div>
          </div>

          {/* Type filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveEventType('all')}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border transition-all"
              style={{
                borderColor: activeEventType === 'all' ? GOLD : NAVY_LIGHT,
                backgroundColor: activeEventType === 'all' ? 'rgba(201,168,75,0.15)' : 'transparent',
                color: activeEventType === 'all' ? GOLD : CREAM_DIM,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              All ({EVENTS.length})
            </button>
            {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(([type, cfg]) => {
              const count = EVENTS.filter(e => e.type === type).length
              if (count === 0) return null
              const isActive = activeEventType === type
              return (
                <button
                  key={type}
                  onClick={() => setActiveEventType(t => t === type ? 'all' : type)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full border transition-all"
                  style={{
                    borderColor: isActive ? cfg.color : NAVY_LIGHT,
                    backgroundColor: isActive ? cfg.bg : 'transparent',
                    color: isActive ? cfg.color : CREAM_DIM,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {cfg.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Events list */}
          <div className="space-y-2">
            {filteredEvents.map((ev, i) => {
              const cfg = EVENT_TYPE_CONFIG[ev.type]
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl border transition-all hover:border-opacity-60"
                  style={{ backgroundColor: NAVY_CARD, border: `1px solid ${NAVY_LIGHT}` }}
                >
                  {/* Date */}
                  <div className="text-center shrink-0 min-w-[52px]">
                    <div className="text-sm font-bold leading-tight" style={{ color: GOLD }}>{ev.date.split(' ')[0]}</div>
                    <div className="text-xs leading-tight" style={{ color: CREAM_DIM, fontFamily: 'system-ui, sans-serif' }}>
                      {ev.date.split(' ').slice(1).join(' ')}
                    </div>
                    {ev.time && (
                      <div className="text-[10px] mt-0.5" style={{ color: CREAM_DIM, fontFamily: 'system-ui, sans-serif' }}>{ev.time}</div>
                    )}
                  </div>

                  {/* Vertical divider */}
                  <div className="w-px self-stretch shrink-0 mt-1" style={{ backgroundColor: NAVY_LIGHT }} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-base font-semibold leading-snug" style={{ color: WHITE }}>{ev.title}</h3>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.bg, color: cfg.color, fontFamily: 'system-ui, sans-serif' }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-sm mt-1" style={{ color: CREAM_DIM, fontFamily: 'system-ui, sans-serif' }}>{ev.venue}</div>
                  </div>

                  {/* Price */}
                  {ev.price && (
                    <div className="text-xs font-semibold shrink-0 text-right" style={{ color: GOLD_LIGHT, fontFamily: 'system-ui, sans-serif' }}>
                      {ev.price}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredEvents.length === 0 && (
              <div className="py-10 text-center text-base italic" style={{ color: CREAM_DIM }}>
                No events match your filter. Try &ldquo;All&rdquo; to see the full calendar.
              </div>
            )}
          </div>

          <div className="mt-4 text-xs text-right italic" style={{ color: CREAM_DIM, fontFamily: 'system-ui, sans-serif' }}>
            Event listings are for reference. Please confirm dates and times with venues directly.
          </div>
        </div>
      </section>

      {/* ── Newsletter ──────────────────────────────────────────────────── */}
      <NewsletterSection />

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t py-10 px-5" style={{ borderColor: NAVY_LIGHT, backgroundColor: '#07101E' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.25em] mb-1" style={{ color: GOLD_MUTED }}>River Region</div>
              <div className="text-2xl font-bold mb-2" style={{ color: WHITE }}>Boom</div>
              <p className="text-sm leading-relaxed" style={{ color: CREAM_DIM, fontFamily: 'system-ui, sans-serif' }}>
                Montgomery&apos;s magazine for those who&apos;ve earned the best years of their lives. Published monthly by KeepSharing LLC.
              </p>
            </div>
            {/* Departments */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: GOLD_MUTED, fontFamily: 'system-ui, sans-serif' }}>Departments</div>
              <div className="grid grid-cols-2 gap-1">
                {DEPARTMENTS.map(d => (
                  <button key={d.name} className="text-sm text-left transition-colors hover:opacity-100" style={{ color: CREAM_DIM, fontFamily: 'system-ui, sans-serif' }}>
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Contact */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: GOLD_MUTED, fontFamily: 'system-ui, sans-serif' }}>Connect</div>
              <div className="space-y-2 text-sm" style={{ color: CREAM_DIM, fontFamily: 'system-ui, sans-serif' }}>
                <div>jason@keepsharing.com</div>
                <div>(334) 328-5189</div>
                <div className="mt-3">
                  <Link href="/advertise" className="text-sm font-semibold transition-colors" style={{ color: GOLD }}>
                    Advertise with Boom →
                  </Link>
                </div>
                <div>
                  <Link href="/admin" className="text-xs transition-colors" style={{ color: NAVY_LIGHT }}>
                    Admin
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full mb-5" style={{ backgroundColor: NAVY_LIGHT }} />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs" style={{ color: CREAM_DIM, fontFamily: 'system-ui, sans-serif' }}>
            <span>© 2026 KeepSharing LLC · River Region Boom · All rights reserved.</span>
            <span className="italic" style={{ color: GOLD_MUTED }}>Age Well, My Friends. — Jason Watson</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
