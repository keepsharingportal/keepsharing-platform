'use client'

// EmojiPicker — single-field replacement for <input name="emoji"> in the
// trending bar admin forms. Trigger is a button showing the currently
// selected glyph; clicking opens a floating panel with a search field
// and a grid of curated emojis. Picking one closes the panel and
// updates a hidden <input name="emoji"> so the surrounding <form action>
// still posts the value the server action expects.
//
// Scope: a curated list (~150 emojis) tuned for the parenting / family
// magazine context — categories that actually come up in editorial work
// (kids, family, school, activities, food, events, seasons, holidays,
// symbols). Intentionally not a full Unicode picker — keeping the
// bundle tiny and the choices on-brand.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

// Each entry: glyph + lowercase keywords used for the search filter.
// Keep keywords short and obvious — the editor types one or two words.
const EMOJI_LIBRARY: ReadonlyArray<{ char: string; keywords: string }> = [
  // ── Faces / emotions ──
  { char: '😀', keywords: 'smile happy grin face' },
  { char: '😄', keywords: 'smile happy joy face' },
  { char: '😊', keywords: 'smile blush happy face' },
  { char: '🥰', keywords: 'love hearts smile face' },
  { char: '😍', keywords: 'love heart eyes face' },
  { char: '🤩', keywords: 'star struck wow face' },
  { char: '😎', keywords: 'cool sunglasses face' },
  { char: '🤗', keywords: 'hug warm welcome face' },
  { char: '🤔', keywords: 'think question face' },
  { char: '😴', keywords: 'sleep tired face' },
  { char: '🥳', keywords: 'party celebrate birthday face' },
  { char: '😋', keywords: 'yum tasty food face' },

  // ── Hands / gestures ──
  { char: '👋', keywords: 'wave hello hi greeting hand' },
  { char: '👍', keywords: 'thumbs up like good hand' },
  { char: '👏', keywords: 'clap applause great hand' },
  { char: '🙌', keywords: 'celebrate praise hands raise' },
  { char: '🙏', keywords: 'thanks please pray hand' },
  { char: '💪', keywords: 'strong muscle power arm' },
  { char: '✋', keywords: 'high five stop hand' },
  { char: '👉', keywords: 'point finger right' },

  // ── Family / people ──
  { char: '👨‍👩‍👧‍👦', keywords: 'family parents kids' },
  { char: '👩‍👧', keywords: 'mom daughter mother' },
  { char: '👨‍👦', keywords: 'dad son father' },
  { char: '👶', keywords: 'baby infant newborn' },
  { char: '🧒', keywords: 'child kid' },
  { char: '👧', keywords: 'girl daughter' },
  { char: '👦', keywords: 'boy son' },
  { char: '👩', keywords: 'woman mom mother' },
  { char: '👨', keywords: 'man dad father' },
  { char: '🧑‍🏫', keywords: 'teacher educator school' },
  { char: '👩‍🏫', keywords: 'teacher woman school educator' },
  { char: '👨‍🏫', keywords: 'teacher man school educator' },
  { char: '🧑‍🎓', keywords: 'graduate student college' },
  { char: '🤰', keywords: 'pregnant mom expecting' },
  { char: '👵', keywords: 'grandma grandmother elder' },
  { char: '👴', keywords: 'grandpa grandfather elder' },

  // ── School / learning ──
  { char: '🎒', keywords: 'backpack school bag' },
  { char: '📚', keywords: 'books reading school study' },
  { char: '📖', keywords: 'book reading open' },
  { char: '✏️', keywords: 'pencil write school' },
  { char: '🖍️', keywords: 'crayon draw kids' },
  { char: '🎨', keywords: 'art paint craft' },
  { char: '🏫', keywords: 'school building education' },
  { char: '🍎', keywords: 'apple teacher school fruit' },
  { char: '🎓', keywords: 'graduation cap diploma school' },
  { char: '📝', keywords: 'note writing memo' },
  { char: '🔬', keywords: 'science microscope stem' },
  { char: '🧮', keywords: 'math abacus stem' },

  // ── Sports / activities ──
  { char: '⚽', keywords: 'soccer ball sport' },
  { char: '🏀', keywords: 'basketball sport' },
  { char: '⚾', keywords: 'baseball sport' },
  { char: '🏈', keywords: 'football sport' },
  { char: '🎾', keywords: 'tennis sport' },
  { char: '🏐', keywords: 'volleyball sport' },
  { char: '🏊', keywords: 'swim pool sport' },
  { char: '🏃', keywords: 'run runner exercise sport' },
  { char: '🚴', keywords: 'bike cycle sport' },
  { char: '🤸', keywords: 'gymnastics cartwheel sport' },
  { char: '🏆', keywords: 'trophy winner award champion' },
  { char: '🥇', keywords: 'gold medal first winner' },
  { char: '🎯', keywords: 'target bullseye goal' },
  { char: '🎮', keywords: 'video game controller play' },
  { char: '🎲', keywords: 'dice game board' },
  { char: '🧩', keywords: 'puzzle game piece' },

  // ── Food / kid favorites ──
  { char: '🍕', keywords: 'pizza food slice' },
  { char: '🍔', keywords: 'burger food' },
  { char: '🌮', keywords: 'taco food' },
  { char: '🍦', keywords: 'ice cream cone treat' },
  { char: '🍰', keywords: 'cake birthday slice' },
  { char: '🎂', keywords: 'birthday cake party' },
  { char: '🍪', keywords: 'cookie treat snack' },
  { char: '🍩', keywords: 'donut treat snack' },
  { char: '🥤', keywords: 'drink cup soda' },
  { char: '🍓', keywords: 'strawberry fruit' },
  { char: '🍌', keywords: 'banana fruit' },
  { char: '🥕', keywords: 'carrot veggie' },

  // ── Events / celebrations ──
  { char: '🎉', keywords: 'party celebrate confetti' },
  { char: '🎊', keywords: 'party confetti celebrate' },
  { char: '🎈', keywords: 'balloon party' },
  { char: '🎁', keywords: 'gift present box' },
  { char: '🎀', keywords: 'ribbon bow' },
  { char: '🪅', keywords: 'pinata party fiesta' },
  { char: '🎪', keywords: 'circus tent festival' },
  { char: '🎭', keywords: 'theater drama arts' },
  { char: '🎤', keywords: 'microphone sing concert' },
  { char: '🎵', keywords: 'music note' },
  { char: '🎶', keywords: 'music notes' },

  // ── Places / outings ──
  { char: '🏞️', keywords: 'park nature outdoors' },
  { char: '🌳', keywords: 'tree park outdoors' },
  { char: '🌻', keywords: 'sunflower flower yellow' },
  { char: '🌷', keywords: 'flower tulip spring' },
  { char: '🏊‍♀️', keywords: 'pool swim summer' },
  { char: '🏖️', keywords: 'beach summer sand' },
  { char: '⛺', keywords: 'camp tent outdoors summer' },
  { char: '🎡', keywords: 'ferris wheel fair carnival' },
  { char: '🎢', keywords: 'roller coaster theme park' },
  { char: '🦁', keywords: 'lion zoo animal' },
  { char: '🐶', keywords: 'dog puppy pet' },
  { char: '🐱', keywords: 'cat kitten pet' },

  // ── Seasons / weather ──
  { char: '☀️', keywords: 'sun summer warm' },
  { char: '🌞', keywords: 'sun face summer' },
  { char: '❄️', keywords: 'snow winter cold' },
  { char: '⛄', keywords: 'snowman winter' },
  { char: '🌧️', keywords: 'rain weather wet' },
  { char: '🌈', keywords: 'rainbow color sky' },
  { char: '🍁', keywords: 'fall leaf autumn maple' },
  { char: '🍂', keywords: 'fall leaves autumn' },
  { char: '🌸', keywords: 'spring blossom flower' },

  // ── Holidays ──
  { char: '🎄', keywords: 'christmas tree holiday' },
  { char: '🎅', keywords: 'santa christmas holiday' },
  { char: '🦃', keywords: 'turkey thanksgiving holiday' },
  { char: '🎃', keywords: 'pumpkin halloween jack o lantern' },
  { char: '👻', keywords: 'ghost halloween spooky' },
  { char: '🐰', keywords: 'easter bunny rabbit spring' },
  { char: '🥚', keywords: 'easter egg' },
  { char: '🇺🇸', keywords: 'american flag fourth of july usa' },

  // ── Symbols / extras ──
  { char: '⭐', keywords: 'star favorite top' },
  { char: '🌟', keywords: 'star glowing sparkle' },
  { char: '✨', keywords: 'sparkles shine magic' },
  { char: '💫', keywords: 'dizzy sparkle stars' },
  { char: '❤️', keywords: 'heart love red' },
  { char: '💛', keywords: 'heart love yellow' },
  { char: '💚', keywords: 'heart love green' },
  { char: '💙', keywords: 'heart love blue' },
  { char: '💜', keywords: 'heart love purple' },
  { char: '🔥', keywords: 'fire hot trending flame' },
  { char: '📍', keywords: 'pin location map' },
  { char: '📅', keywords: 'calendar date schedule' },
  { char: '🗓️', keywords: 'calendar spiral planner' },
  { char: '⏰', keywords: 'alarm clock time' },
  { char: '💡', keywords: 'idea lightbulb tip' },
  { char: '📣', keywords: 'announce megaphone news' },
  { char: '📢', keywords: 'announce loudspeaker' },
  { char: '🔔', keywords: 'bell notification' },
  { char: '🎯', keywords: 'target goal' },
  { char: '✅', keywords: 'check done complete' },
]

interface Props {
  name?:         string
  defaultValue?: string | null
}

export function EmojiPicker({ name = 'emoji', defaultValue }: Props) {
  const [value, setValue] = useState<string>(defaultValue ?? '')
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popRef     = useRef<HTMLDivElement | null>(null)
  const searchRef  = useRef<HTMLInputElement | null>(null)

  // Compute viewport-relative position from the trigger every time the
  // popover opens (and on scroll/resize while open). Portaling to body
  // means we escape any parent overflow:hidden — but it also means
  // we have to position ourselves.
  useLayoutEffect(() => {
    if (!open) return
    function updatePos() {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      // Width matches a comfortable picker (288px / w-72), unless the
      // trigger is wider — then we widen to match so it doesn't look
      // detached. Anchor to the right edge of the trigger so the panel
      // grows leftward if it would otherwise overflow the viewport.
      const desired   = 288
      const width     = Math.max(desired, r.width)
      const rightOver = r.left + width - window.innerWidth + 8
      const left      = rightOver > 0 ? Math.max(8, r.left - rightOver) : r.left
      setPos({ top: r.bottom + 4, left, width })
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  // Close on outside click / Escape. Outside = not in the trigger and
  // not in the portaled popover.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (popRef.current?.contains(t))     return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    // Autofocus the search box when the popover opens so the editor can
    // just start typing.
    setTimeout(() => searchRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return EMOJI_LIBRARY
    return EMOJI_LIBRARY.filter(e => e.keywords.includes(q))
  }, [query])

  function pick(char: string) {
    setValue(char)
    setOpen(false)
    setQuery('')
  }

  function clear() {
    setValue('')
    setQuery('')
  }

  // Popover lives in a portal so any ancestor with overflow:hidden
  // (the AddForm <section>, the page scroll container, etc.) can't
  // clip it. SSR-safe: only mount the portal on the client.
  const popover = open && pos && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 bg-white rounded-lg border border-portal-border shadow p-3"
        >
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-portal-muted" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search emojis…"
              className="w-full text-sm border border-portal-border rounded-lg pl-7 pr-2 py-1.5 outline-none focus:border-portal-blue"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-xs text-portal-muted py-4 text-center">No emoji matches &quot;{query}&quot;.</p>
          ) : (
            <div
              className="grid gap-1 max-h-64 overflow-y-auto"
              style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }}
            >
              {filtered.map((e, i) => (
                <button
                  key={e.char + i}
                  type="button"
                  onClick={() => pick(e.char)}
                  className={`text-xl leading-none p-1 rounded hover:bg-portal-row-hover ${value === e.char ? 'bg-portal-row-hover ring-1 ring-gray-300' : ''}`}
                  title={e.keywords.split(' ')[0]}
                  aria-label={e.keywords.split(' ')[0]}
                >
                  {e.char}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )
    : null

  return (
    <div className="relative">
      {/* Hidden input so the surrounding <form action> still posts the
          value under the original field name. */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger — keeps the same visual footprint as the old text
          input (h-9, full-width) so the form layout doesn't shift. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors bg-white hover:bg-portal-bg text-left flex items-center justify-between gap-2"
        title="Pick an emoji"
      >
        {value
          ? <span className="text-base leading-none">{value}</span>
          : <span className="text-portal-muted">Pick…</span>}
        {value && (
          <span
            role="button"
            aria-label="Clear emoji"
            onClick={e => { e.stopPropagation(); clear() }}
            className="text-portal-border-2 hover:text-portal-sub inline-flex items-center"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {popover}
    </div>
  )
}
