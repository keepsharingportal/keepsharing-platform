'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Search, Heart, MapPin, Phone, Globe, X, Filter, SlidersHorizontal, ShieldCheck, Map, LayoutGrid } from 'lucide-react'
import { NeighborhoodBanner } from '@/components/NeighborhoodBanner'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Camp = {
  id: string
  slug: string
  business_name: string
  category: string
  city: string
  neighborhood_tag: string | null
  ages: string | null
  description: string | null
  phone: string | null
  website: string | null
  photo_url: string | null
  price_range: string | null
  registration_status: string | null
  indoor_outdoor: string | null
  financial_aid_available: boolean
  before_after_care: boolean
  special_needs_friendly: boolean
  faith_based: boolean
  drop_in_available: boolean
  camp_director_name: string | null
  discount_code: string | null
  instagram_url: string | null
  virtual_tour_url: string | null
  latitude: number | null
  longitude: number | null
  listing_tier: 'community' | 'enhanced' | 'advertiser'
  featured: boolean   // kept for backward compat
  advertiser: boolean // kept for backward compat
}

// Use explicit listing_tier when set, fall back to booleans for legacy data
export type ListingTier = 'advertiser' | 'enhanced' | 'community'
export function getTier(camp: Camp): ListingTier {
  if (camp.listing_tier && camp.listing_tier !== 'community') return camp.listing_tier
  if (camp.advertiser) return 'advertiser'
  if (camp.featured)   return 'enhanced'
  return 'community'
}

// Tier sort weight: lower = earlier
const TIER_ORDER: Record<ListingTier, number> = { advertiser: 0, enhanced: 1, community: 2 }

// ── Category config ───────────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  'Art/Music/Theater':               { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: '🎨' },
  'Day Camps':                       { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '🏕️' },
  'Day Trips':                       { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', icon: '🚌' },
  'Dance/Gymnastics/Cheer':          { color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8', icon: '💃' },
  'Education/Science/Technology':    { color: '#059669', bg: '#F0FDF4', border: '#A7F3D0', icon: '🔬' },
  'Educational/Training':            { color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4', icon: '📚' },
  'Horseback Riding/Equestrian':     { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', icon: '🐴' },
  'Libraries':                       { color: '#475569', bg: '#F8FAFC', border: '#CBD5E1', icon: '📖' },
  'Martial Arts':                    { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '🥋' },
  'Recreation':                      { color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC', icon: '⛹️' },
  'Skating':                         { color: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE', icon: '⛸️' },
  'Sports Camps':                    { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', icon: '⚽' },
  'Sports Clinics':                  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '🏈' },
  'Swim':                            { color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', icon: '🏊' },
}

const PRICE_OPTIONS  = ['Free', 'Under $100/wk', '$100-250/wk', '$250+/wk', 'Varies']
const AREA_OPTIONS   = ['All Areas', 'Montgomery', 'Prattville', 'Pike Road', 'Wetumpka', 'Millbrook', 'Eastchase']

// ── Mock data ─────────────────────────────────────────────────────────────────
// Tier mapping via booleans:
//   advertiser: true  → Advertiser tier (gold border, trust badge, priority)
//   featured: true    → Enhanced tier   ($175, full description, badge)
//   both false        → Community tier  (free, name/city/phone/one sentence)

export const MOCK_CAMPS: Camp[] = [
  // new fields default: before_after_care, special_needs_friendly, faith_based, drop_in_available, camp_director_name, discount_code, instagram_url, virtual_tour_url, latitude, longitude, listing_tier
  // ── ADVERTISER tier ───────────────────────────────────────────────────────
  { id:'1',  slug:'ymca-summer-camp',                  business_name:'YMCA of Montgomery — Day Camp',           category:'Day Camps',                    city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 5-12',    description:"Montgomery's most trusted day camp. Full days of swimming, sports, arts, and field trips. Before and after care available. Financial assistance through our Open Doors program.", phone:'(334) 269-9622', website:'https://ymcamontgomery.org', photo_url:null, price_range:'100-250', registration_status:'open',    indoor_outdoor:'both',    financial_aid_available:true,  before_after_care:true,  special_needs_friendly:true,  faith_based:false, drop_in_available:false, camp_director_name:'Marcus Thompson',        discount_code:null,      instagram_url:'https://instagram.com/ymcamontgomery', virtual_tour_url:null, latitude:32.3668, longitude:-86.2999, listing_tier:'advertiser', featured:true,  advertiser:true  },
  { id:'2',  slug:'montgomery-ballet-summer',          business_name:'Montgomery Ballet Summer Intensive',      category:'Dance/Gymnastics/Cheer',       city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 7-18',    description:'Professional-level instruction in classical ballet, contemporary, and jazz. Students train alongside company members. End-of-session showcase performance included.',       phone:'(334) 409-0522', website:'https://montgomeryballet.org',    photo_url:null, price_range:'250-plus', registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:true,  before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:'Elizabeth Hartley',      discount_code:'SUMMER10', instagram_url:null, virtual_tour_url:null, latitude:32.3792, longitude:-86.3077, listing_tier:'advertiser', featured:true,  advertiser:true  },
  { id:'4',  slug:'eastchase-swim-academy',            business_name:'Eastchase Swim Academy',                  category:'Swim',                         city:'Montgomery', neighborhood_tag:'eastchase',  ages:'Ages 3-17',    description:"Stroke technique, competitive prep, and water safety. Taught by certified USA Swimming coaches. Eastchase's premier learn-to-swim and competitive program.",                 phone:'(334) 277-3740', website:null,                              photo_url:null, price_range:'under-100', registration_status:'open',    indoor_outdoor:'outdoor', financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3388, longitude:-86.1576, listing_tier:'advertiser', featured:true,  advertiser:true  },
  { id:'5',  slug:'alabama-shakespeare-festival-youth',business_name:'Alabama Shakespeare Festival — Youth Theatre', category:'Art/Music/Theater',     city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 8-16',    description:"Two-week acting intensives led by ASF's professional company. Students rehearse and perform a full production on the Octagon Stage. Truly unforgettable experience.",         phone:'(334) 271-5353', website:'https://asf.net',                 photo_url:null, price_range:'250-plus', registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:true,  before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:'Natalie Brooks',         discount_code:null,      instagram_url:'https://instagram.com/asfmontgomery', virtual_tour_url:null, latitude:32.3601, longitude:-86.2589, listing_tier:'advertiser', featured:true,  advertiser:true  },
  // ── ENHANCED tier ($175) ──────────────────────────────────────────────────
  { id:'8',  slug:'montgomery-museum-fine-arts-junior', business_name:'MMFA Junior Artists Summer Camp',        category:'Art/Music/Theater',            city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 6-14',    description:'Create in the galleries that inspire you. Campers explore fine art, sculpture, digital media, and mixed-media projects alongside real museum exhibitions. Field trips included.', phone:'(334) 240-4333', website:'https://mmfa.org',               photo_url:null, price_range:'100-250',  registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:true,  before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3610, longitude:-86.2598, listing_tier:'enhanced',   featured:true,  advertiser:false },
  { id:'11', slug:'millbrook-gymnastics-cheer',        business_name:'Millbrook Gymnastics & Cheer Academy',    category:'Dance/Gymnastics/Cheer',       city:'Millbrook',  neighborhood_tag:'millbrook',  ages:'Ages 4-14',    description:'Tumbling, trampoline, vault, and cheer clinics. Flexible half-week and full-week options. All skill levels welcome — from first-timers to competitive athletes.',            phone:'(334) 285-8720', website:null,                              photo_url:null, price_range:'100-250',  registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.4927, longitude:-86.3594, listing_tier:'enhanced',   featured:true,  advertiser:false },
  { id:'17', slug:'music-camp-montgomery',             business_name:'Montgomery Symphony Orchestra — Youth Music Camp', category:'Art/Music/Theater',  city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 8-17',    description:'Orchestra, band, and individual instrument instruction led by Symphony musicians. Culminating concert open to families. Limited spots — register early.',                    phone:'(334) 240-4004', website:'https://montgomerysymphony.org',  photo_url:null, price_range:'100-250',  registration_status:'waitlist', indoor_outdoor:'indoor',  financial_aid_available:true,  before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3660, longitude:-86.3024, listing_tier:'enhanced',   featured:true,  advertiser:false },
  { id:'18', slug:'crossfit-kids-summer',              business_name:'CrossFit Montgomery Kids Summer Camp',     category:'Recreation',                   city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 8-14',    description:'Age-appropriate functional fitness, outdoor games, nutrition basics, and teamwork. Kids love it. Parents see measurable confidence and fitness gains in just one week.',    phone:'(334) 262-1600', website:null,                              photo_url:null, price_range:'100-250',  registration_status:'open',    indoor_outdoor:'both',    financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:true,  camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3714, longitude:-86.2941, listing_tier:'enhanced',   featured:true,  advertiser:false },
  { id:'20', slug:'basketball-clinic-eastchase',       business_name:'Eastchase Basketball Clinic',             category:'Sports Clinics',               city:'Montgomery', neighborhood_tag:'eastchase',  ages:'Ages 8-18',    description:'Former collegiate player-led skills clinics. Ball handling, shooting, defense, and IQ. Morning half-day sessions. Players grouped by age and experience level.',          phone:'(334) 244-1200', website:null,                              photo_url:null, price_range:'under-100', registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:true,  camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3391, longitude:-86.1594, listing_tier:'enhanced',   featured:true,  advertiser:false },
  // ── COMMUNITY tier (free) ─────────────────────────────────────────────────
  { id:'3',  slug:'science-explorers-prattville',     business_name:'Science Explorers of Prattville',          category:'Education/Science/Technology', city:'Prattville', neighborhood_tag:'prattville', ages:'Ages 6-14',    description:'Hands-on STEM camps covering robotics, chemistry, biology, and coding. Kids design and build real projects.',                                                           phone:'(334) 361-0815', website:null,                              photo_url:null, price_range:'100-250',  registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.4638, longitude:-86.4595, listing_tier:'community',  featured:false, advertiser:false },
  { id:'6',  slug:'pike-road-equestrian',              business_name:'Pike Road Equestrian Academy',             category:'Horseback Riding/Equestrian',  city:'Pike Road',  neighborhood_tag:'pike-road',  ages:'Ages 7-17',    description:'Beginner to advanced horsemanship. Weekly half-day and full-day sessions in a beautiful farm setting.',                                                                phone:'(334) 288-0114', website:null,                              photo_url:null, price_range:'250-plus', registration_status:'open',    indoor_outdoor:'outdoor', financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.2892, longitude:-86.1021, listing_tier:'community',  featured:false, advertiser:false },
  { id:'7',  slug:'karate-kids-wetumpka',              business_name:'Wetumpka Martial Arts — Kids Summer Camp', category:'Martial Arts',                 city:'Wetumpka',   neighborhood_tag:'wetumpka',   ages:'Ages 5-14',    description:'Full-week summer camps combining karate instruction, character development, and fitness.',                                                                             phone:'(334) 567-2190', website:null,                              photo_url:null, price_range:'under-100', registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.5374, longitude:-86.2079, listing_tier:'community',  featured:false, advertiser:false },
  { id:'9',  slug:'prattville-recreation-sports',     business_name:'Prattville Recreation Department Sports Camps', category:'Sports Camps',           city:'Prattville', neighborhood_tag:'prattville', ages:'Ages 6-16',    description:"Basketball, soccer, flag football, and volleyball sessions throughout summer. City residents get discounted rates.",                                                      phone:'(334) 595-0600', website:'https://prattville.org',          photo_url:null, price_range:'under-100', registration_status:'open',    indoor_outdoor:'both',    financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:true,  camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.4640, longitude:-86.4607, listing_tier:'community',  featured:false, advertiser:false },
  { id:'10', slug:'coding-camp-montgomery',            business_name:'Code River Region — Summer Coding Camp',   category:'Education/Science/Technology', city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 10-17',   description:'Scratch, Python, web development, and app design. Students build a game or app by end of week.',                                                                       phone:null,              website:null,                              photo_url:null, price_range:'100-250',  registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3668, longitude:-86.2999, listing_tier:'community',  featured:false, advertiser:false },
  { id:'12', slug:'eastchase-library-summer',          business_name:'East Montgomery Public Library — Summer Reading', category:'Libraries',            city:'Montgomery', neighborhood_tag:'eastchase',  ages:'All Ages',     description:"Free drop-in reading program with weekly events, author visits, and prizes. No registration required.",                                                                phone:'(334) 409-5150', website:'https://mplonline.org',           photo_url:null, price_range:'free',     registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:true,  faith_based:false, drop_in_available:true,  camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3442, longitude:-86.1631, listing_tier:'community',  featured:false, advertiser:false },
  { id:'13', slug:'skating-summer-camp-montgomery',   business_name:'Skate Zone Montgomery — Summer Sessions',   category:'Skating',                      city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 5-16',    description:'Ice skating and roller skating camps. Learn-to-skate progressions and figure skating basics.',                                                                         phone:'(334) 272-8100', website:null,                              photo_url:null, price_range:'under-100', registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3640, longitude:-86.2718, listing_tier:'community',  featured:false, advertiser:false },
  { id:'14', slug:'prattville-day-camp',               business_name:'Prattville First Baptist Church Day Camp', category:'Day Camps',                    city:'Prattville', neighborhood_tag:'prattville', ages:'Ages 4-12',    description:"Full-day supervised camp with swimming, sports, crafts, and field trips. Open to all families.",                                                                       phone:'(334) 365-3427', website:null,                              photo_url:null, price_range:'under-100', registration_status:'open',    indoor_outdoor:'both',    financial_aid_available:true,  before_after_care:true,  special_needs_friendly:false, faith_based:true,  drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.4636, longitude:-86.4634, listing_tier:'community',  featured:false, advertiser:false },
  { id:'15', slug:'soccer-camp-pike-road',             business_name:'Pike Road United Soccer Camp',             category:'Sports Camps',                 city:'Pike Road',  neighborhood_tag:'pike-road',  ages:'Ages 5-15',    description:'Skills development, small-sided games, and competition. Morning sessions with professional coaches.',                                                                  phone:'(334) 288-0510', website:null,                              photo_url:null, price_range:'under-100', registration_status:'open',    indoor_outdoor:'outdoor', financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.2887, longitude:-86.1034, listing_tier:'community',  featured:false, advertiser:false },
  { id:'16', slug:'swim-lessons-wetumpka',             business_name:'Wetumpka City Pool Swim Lessons',          category:'Swim',                         city:'Wetumpka',   neighborhood_tag:'wetumpka',   ages:'Ages 3-Adult', description:'Group and private lessons by certified Red Cross instructors. All levels — infant through advanced.',                                                               phone:'(334) 567-5155', website:null,                              photo_url:null, price_range:'free',     registration_status:'open',    indoor_outdoor:'outdoor', financial_aid_available:true,  before_after_care:false, special_needs_friendly:true,  faith_based:false, drop_in_available:true,  camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.5373, longitude:-86.2082, listing_tier:'community',  featured:false, advertiser:false },
  { id:'19', slug:'millbrook-library-stem',            business_name:'Millbrook Public Library STEM Workshops',  category:'Libraries',                    city:'Millbrook',  neighborhood_tag:'millbrook',  ages:'Ages 6-12',    description:'Free weekly STEM workshops including coding, robotics, and science experiments. Drop-in, no registration.',                                                            phone:'(334) 285-7771', website:null,                              photo_url:null, price_range:'free',     registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:true,  faith_based:false, drop_in_available:true,  camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.4930, longitude:-86.3580, listing_tier:'community',  featured:false, advertiser:false },
  { id:'21', slug:'theatre-camp-prattville',           business_name:'Prattville Community Theatre Youth Camp',  category:'Art/Music/Theater',            city:'Prattville', neighborhood_tag:'prattville', ages:'Ages 6-16',    description:'Full musical production from audition to curtain call in two weeks. Live audience performance included.',                                                             phone:'(334) 365-0154', website:null,                              photo_url:null, price_range:'100-250',  registration_status:'open',    indoor_outdoor:'indoor',  financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.4618, longitude:-86.4589, listing_tier:'community',  featured:false, advertiser:false },
  { id:'22', slug:'day-trip-sloss-furnaces',           business_name:'River Region Day Trips — Birmingham & Beyond', category:'Day Trips',               city:'Montgomery', neighborhood_tag:'montgomery', ages:'Ages 6-14',    description:'Chaperoned day trips to McWane Science Center, US Space & Rocket Center, Talladega, and more.',                                                                       phone:'(334) 221-0000', website:null,                              photo_url:null, price_range:'varies',   registration_status:'open',    indoor_outdoor:'outdoor', financial_aid_available:false, before_after_care:false, special_needs_friendly:false, faith_based:false, drop_in_available:false, camp_director_name:null, discount_code:null, instagram_url:null, virtual_tour_url:null, latitude:32.3668, longitude:-86.2999, listing_tier:'community',  featured:false, advertiser:false },
]

// ── Price label ───────────────────────────────────────────────────────────────

const PRICE_LABEL: Record<string, string> = {
  'free': 'Free', 'under-100': 'Under $100/wk', '100-250': '$100-250/wk',
  '250-plus': '$250+/wk', 'varies': 'Varies',
}

const PRICE_FILTER_MAP: Record<string, string> = {
  'Free': 'free', 'Under $100/wk': 'under-100', '$100-250/wk': '100-250',
  '$250+/wk': '250-plus', 'Varies': 'varies',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:     { label: 'Registration Open', color: 'text-green-700' },
  waitlist: { label: 'Waitlist',          color: 'text-amber-700' },
  full:     { label: 'Full',              color: 'text-red-600' },
  tbd:      { label: 'TBD',              color: 'text-gray-500' },
}

// ── Tier visual config ────────────────────────────────────────────────────────

const TIER_CARD: Record<ListingTier, {
  wrapperClass: string
  wrapperStyle?: React.CSSProperties
  badge: React.ReactNode | null
}> = {
  advertiser: {
    wrapperClass: 'bg-white rounded-2xl overflow-hidden transition-all hover:shadow-lg group',
    wrapperStyle: { border: '2px solid #D97706', boxShadow: '0 0 0 1px #FDE68A' },
    badge: (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
        style={{ backgroundColor: '#1D4ED8', color: '#fff' }}>
        <ShieldCheck size={9} strokeWidth={2.5} />
        River Region Parents Advertiser
      </div>
    ),
  },
  enhanced: {
    wrapperClass: 'bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-md group',
    badge: (
      <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
        style={{ backgroundColor: '#F0F9FF', color: '#0369A1', borderColor: '#BAE6FD' }}>
        Enhanced
      </div>
    ),
  },
  community: {
    wrapperClass: 'bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-sm group',
    badge: null,
  },
}

// ── Camp card ─────────────────────────────────────────────────────────────────

function CampCard({ camp, saved, onToggleSave }: {
  camp: Camp
  saved: boolean
  onToggleSave: (id: string) => void
}) {
  const tier   = getTier(camp)
  const cfg    = CATEGORY_CONFIG[camp.category] ?? { color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', icon: '⭐' }
  const status = STATUS_CONFIG[camp.registration_status ?? 'open']
  const visual = TIER_CARD[tier]

  const isCommunity = tier === 'community'

  // Community cards show only first sentence of description
  const shortDesc = camp.description
    ? (camp.description.split(/\.\s/)[0] ?? camp.description).slice(0, 100) + (camp.description.length > 100 ? '…' : '')
    : null

  return (
    <div className={visual.wrapperClass} style={visual.wrapperStyle}>
      {/* Header image / gradient — full for advertiser+enhanced, minimal for community */}
      {!isCommunity && (
        <div
          className="h-32 flex items-center justify-center relative"
          style={{ background: `linear-gradient(135deg, ${cfg.bg} 0%, ${cfg.border} 100%)` }}
        >
          <span className="text-5xl opacity-75">{cfg.icon}</span>
          <button
            onClick={() => onToggleSave(camp.id)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
          >
            <Heart size={13} className={saved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          </button>
        </div>
      )}

      <div className={cn('p-4', isCommunity && 'flex items-start gap-3')}>
        {/* Community: small emoji icon inline */}
        {isCommunity && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5"
            style={{ backgroundColor: cfg.bg }}>
            {cfg.icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Tier badge + category row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
              {camp.category}
            </span>
            {visual.badge}
            {!isCommunity && camp.ages && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                {camp.ages}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors mb-1">
            <Link href={`/summer-fun-guide/${camp.slug}`}>{camp.business_name}</Link>
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <MapPin size={10} />
            <span>{camp.city}</span>
            {!isCommunity && camp.financial_aid_available && (
              <span className="ml-1.5 text-green-700 font-medium">Aid available</span>
            )}
          </div>

          {/* Description — full for enhanced/advertiser, one sentence for community */}
          {camp.description && (
            <p className="text-xs text-gray-600 leading-relaxed mb-2.5"
              style={{ WebkitLineClamp: isCommunity ? 1 : 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {isCommunity ? shortDesc : camp.description}
            </p>
          )}

          {/* Price + status — enhanced/advertiser only */}
          {!isCommunity && (
            <div className="flex items-center justify-between text-xs mb-3">
              {camp.price_range && (
                <span className="font-semibold text-gray-700">{PRICE_LABEL[camp.price_range]}</span>
              )}
              {status && (
                <span className={cn('font-medium', status.color)}>{status.label}</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isCommunity ? (
              // Community: minimal — just detail link + phone + website
              <>
                <Link href={`/summer-fun-guide/${camp.slug}`}
                  className="text-xs font-semibold text-blue-700 hover:underline">
                  View details →
                </Link>
                <span className="flex-1" />
                {camp.phone && (
                  <a href={`tel:${camp.phone}`} className="text-xs text-gray-500 hover:text-blue-700 font-medium">
                    {camp.phone}
                  </a>
                )}
                {camp.website && (
                  <a href={camp.website} target="_blank" rel="noopener noreferrer"
                    className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Globe size={11} className="text-gray-400" />
                  </a>
                )}
                <button onClick={() => onToggleSave(camp.id)}
                  className="w-6 h-6 flex items-center justify-center">
                  <Heart size={12} className={saved ? 'fill-red-500 text-red-500' : 'text-gray-300'} />
                </button>
              </>
            ) : (
              // Enhanced / Advertiser: full CTA row
              <>
                <Link href={`/summer-fun-guide/${camp.slug}`}
                  className="flex-1 text-center py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  See Details
                </Link>
                {camp.phone && (
                  <a href={`tel:${camp.phone}`}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Phone size={12} className="text-gray-500" />
                  </a>
                )}
                {camp.website && (
                  <a href={camp.website} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Globe size={12} className="text-gray-500" />
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Email capture modal ───────────────────────────────────────────────────────

function EmailCaptureModal({ onClose, total }: { onClose: () => void; total: number }) {
  const [email, setEmail] = useState('')
  const [done, setDone]   = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/summer-guide-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch { /* non-blocking */ }
    setDone(true)
    setTimeout(onClose, 2200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📬</div>
            <div className="text-lg font-bold text-gray-900">You&apos;re on the list!</div>
            <p className="text-sm text-gray-500 mt-1">We&apos;ll email your PDF guide shortly.</p>
          </div>
        ) : (
          <>
            <div className="text-2xl mb-2">☀️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Get the full guide as PDF</h3>
            <p className="text-sm text-gray-500 mb-4">All {total}+ camps in one printable list. Free, no spam.</p>
            <form onSubmit={submit} className="flex gap-2">
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-xl outline-none focus:border-blue-400" />
              <button type="submit"
                className="px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap">
                Send PDF
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Google Maps view ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GMaps = any

function CampMapView({ camps, onCampClick }: { camps: Camp[]; onCampClick: (id: string) => void }) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapObj     = useRef<GMaps>(null)
  const markers    = useRef<GMaps[]>([])
  const [popup, setPopup] = useState<Camp | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = () => (window as any).google

  useEffect(() => {
    if (!mapRef.current) return

    const loadMap = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new (g().maps.Map as any)(mapRef.current!, {
        center: { lat: 32.3668, lng: -86.2999 }, // Montgomery, AL
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      })
      mapObj.current = map

      // Clear old markers
      markers.current.forEach((m: GMaps) => m.setMap(null))
      markers.current = []

      camps.forEach(camp => {
        if (!camp.latitude || !camp.longitude) return
        const tier  = getTier(camp)
        const cfg   = CATEGORY_CONFIG[camp.category] ?? { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: '📍' }
        const color = tier === 'advertiser' ? '#D97706' : tier === 'enhanced' ? '#0284C7' : cfg.color

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = new (g().maps.Marker as any)({
          position: { lat: camp.latitude, lng: camp.longitude },
          map,
          title: camp.business_name,
          icon: {
            path: tier === 'advertiser'
              ? 'M12 2L13.09 8.26L19 9.27L14.5 14.14L15.18 20.02L12 17.77L8.82 20.02L9.5 14.14L5 9.27L10.91 8.26L12 2Z'
              : g().maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: tier === 'advertiser' ? 1.2 : 8,
          },
        })

        marker.addListener('click', () => setPopup(camp))
        markers.current.push(marker)
      })
    }

    if (g()?.maps) {
      loadMap()
      return
    }

    // Load Google Maps script
    const existing = document.getElementById('gmaps-script')
    if (existing) { existing.addEventListener('load', loadMap); return }

    const script  = document.createElement('script')
    script.id     = 'gmaps-script'
    script.src    = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async  = true
    script.onload = loadMap
    document.head.appendChild(script)

    return () => { markers.current.forEach(m => m.setMap(null)) }
  }, [camps, apiKey])

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200" style={{ height: 600 }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* No API key message */}
      {!apiKey && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <Map size={32} className="mx-auto text-gray-300 mb-3" />
            <div className="text-sm font-semibold text-gray-600 mb-1">Map view requires Google Maps API key</div>
            <p className="text-xs text-gray-400">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
          </div>
        </div>
      )}

      {/* Popup */}
      {popup && (
        <div className="absolute top-4 left-4 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-10">
          <div className="h-20 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${CATEGORY_CONFIG[popup.category]?.bg ?? '#F9FAFB'} 0%, ${CATEGORY_CONFIG[popup.category]?.border ?? '#E5E7EB'} 100%)` }}>
            <span className="text-4xl">{CATEGORY_CONFIG[popup.category]?.icon ?? '📍'}</span>
          </div>
          <div className="p-3">
            <div className="text-sm font-bold text-gray-900 mb-0.5">{popup.business_name}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <MapPin size={10} /> {popup.city}
            </div>
            {popup.ages && <div className="text-xs text-gray-500 mb-2">{popup.ages}</div>}
            {popup.registration_status && (
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                popup.registration_status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                {STATUS_CONFIG[popup.registration_status]?.label ?? popup.registration_status}
              </span>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => onCampClick(popup.id)}
                className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                View Listing
              </button>
              {popup.latitude && popup.longitude && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${popup.latitude},${popup.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                  Get Directions
                </a>
              )}
            </div>
          </div>
          <button onClick={() => setPopup(null)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
            <X size={12} className="text-gray-500" />
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-xl border border-gray-200 p-2.5 text-xs space-y-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> Advertiser</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-sky-500" /> Enhanced</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-400" /> Community</div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SummerFunGuide({ initialCamps }: { initialCamps: Camp[] }) {
  const [camps]            = useState<Camp[]>(initialCamps.length > 0 ? initialCamps : MOCK_CAMPS)
  const [search, setSearch]             = useState('')
  const [categories, setCategories]     = useState<string[]>([])
  const [area, setArea]                 = useState('All Areas')
  const [prices, setPrices]             = useState<string[]>([])
  const [openNowOnly, setOpenNowOnly]   = useState(false)
  const [beforeAfterOnly, setBeforeAfterOnly] = useState(false)
  const [financialAidOnly, setFinancialAidOnly] = useState(false)
  const [indoorFilter, setIndoorFilter] = useState<'all' | 'indoor' | 'outdoor'>('all')
  const [viewMode, setViewMode]         = useState<'grid' | 'map'>('grid')
  const [saved, setSaved]               = useState<Set<string>>(new Set())
  const [viewCount, setViewCount]       = useState(0)
  const [showEmail, setShowEmail]       = useState(false)
  const [mobileFilters, setMobile]      = useState(false)
  const emailShown = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sfg_saved')
      if (raw) setSaved(new Set(JSON.parse(raw) as string[]))
    } catch { /* ok */ }
  }, [])

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      localStorage.setItem('sfg_saved', JSON.stringify([...next]))
      return next
    })
  }

  const trackView = () => {
    setViewCount(n => {
      const next = n + 1
      if (next >= 5 && !emailShown.current) {
        emailShown.current = true
        setTimeout(() => setShowEmail(true), 500)
      }
      return next
    })
  }

  const allCategories = useMemo(() => [...new Set(camps.map(c => c.category))].sort(), [camps])

  const filtered = useMemo(() => {
    let result = [...camps]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.business_name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      )
    }
    if (categories.length > 0)
      result = result.filter(c => categories.includes(c.category))
    if (area !== 'All Areas')
      result = result.filter(c =>
        c.city.toLowerCase().includes(area.toLowerCase()) ||
        (c.neighborhood_tag ?? '').toLowerCase().replace('-', ' ').includes(area.toLowerCase())
      )
    if (prices.length > 0)
      result = result.filter(c => c.price_range && prices.map(p => PRICE_FILTER_MAP[p]).includes(c.price_range))
    if (openNowOnly)
      result = result.filter(c => c.registration_status === 'open')
    if (beforeAfterOnly)
      result = result.filter(c => c.before_after_care)
    if (financialAidOnly)
      result = result.filter(c => c.financial_aid_available)
    if (indoorFilter !== 'all')
      result = result.filter(c => c.indoor_outdoor === indoorFilter || c.indoor_outdoor === 'both')

    // Sort: Advertiser → Enhanced → Community, then alpha within tier
    result.sort((a, b) => {
      const ta = TIER_ORDER[getTier(a)], tb = TIER_ORDER[getTier(b)]
      if (ta !== tb) return ta - tb
      return a.business_name.localeCompare(b.business_name)
    })

    return result
  }, [camps, search, categories, area, prices])

  const toggleCategory = (cat: string) =>
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])

  const clearAll = () => {
    setSearch(''); setCategories([]); setArea('All Areas'); setPrices([])
    setOpenNowOnly(false); setBeforeAfterOnly(false); setFinancialAidOnly(false); setIndoorFilter('all')
  }
  const hasFilters = !!(search || categories.length || area !== 'All Areas' || prices.length || openNowOnly || beforeAfterOnly || financialAidOnly || indoorFilter !== 'all')

  // Advertiser camps for homepage featured strip
  const advertiserCamps = useMemo(() => camps.filter(c => getTier(c) === 'advertiser'), [camps])

  const FilterPanel = () => (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</div>
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map(cat => {
            const cfg = CATEGORY_CONFIG[cat] ?? { color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', icon: '' }
            const active = categories.includes(cat)
            return (
              <button key={cat} onClick={() => toggleCategory(cat)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{ backgroundColor: active ? cfg.color : cfg.bg, color: active ? '#fff' : cfg.color, borderColor: cfg.border }}>
                {cfg.icon} {cat}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Neighborhood</div>
        <div className="flex flex-wrap gap-1.5">
          {AREA_OPTIONS.map(a => (
            <button key={a} onClick={() => setArea(a)}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                area === a ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300')}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Price Range</div>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_OPTIONS.map(p => (
            <button key={p} onClick={() => setPrices(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                prices.includes(p) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300')}>
              {p}
            </button>
          ))}
        </div>
      </div>
      {/* Quick toggles */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Quick Filters</div>
        <div className="space-y-2">
          {[
            { label: '🟢 Registration Open Now', value: openNowOnly,      set: setOpenNowOnly },
            { label: '🌅 Before/After Care',     value: beforeAfterOnly,  set: setBeforeAfterOnly },
            { label: '💰 Financial Aid Available',value: financialAidOnly, set: setFinancialAidOnly },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => set(!value)}
                className={cn('w-9 h-5 rounded-full transition-colors shrink-0 relative',
                  value ? 'bg-blue-600' : 'bg-gray-200'
                )}>
                <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  value ? 'left-4' : 'left-0.5'
                )} />
              </div>
              <span className="text-xs text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Indoor / Outdoor */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Setting</div>
        <div className="flex gap-1.5">
          {(['all', 'indoor', 'outdoor'] as const).map(v => (
            <button key={v} onClick={() => setIndoorFilter(v)}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border capitalize transition-all',
                indoorFilter === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300')}>
              {v === 'all' ? 'Any' : v}
            </button>
          ))}
        </div>
      </div>

      {/* Tier legend */}
      <div className="pt-3 border-t border-gray-100">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Listing Tiers</div>
        <div className="space-y-1.5 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <span><strong>Advertiser</strong> — included with print ad</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
            <span><strong>Enhanced</strong> — $175/season</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
            <span><strong>Community</strong> — free</span>
          </div>
        </div>
        <Link href="/summer-fun-guide/upgrade"
          className="mt-3 block text-xs text-blue-600 font-semibold hover:underline">
          Upgrade your listing →
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <NeighborhoodBanner />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white px-5 py-14">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-3">River Region Parents</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 leading-tight">2026 Summer Fun Guide</h1>
          <p className="text-lg text-blue-100 mb-8">Everything happening this summer for River Region kids.</p>
          <div className="relative max-w-xl mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search camps, activities, businesses…"
              className="w-full pl-11 pr-4 py-4 text-base text-gray-900 bg-white rounded-2xl shadow-lg outline-none focus:ring-2 focus:ring-blue-300" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advertiser featured strip */}
      {advertiserCamps.length > 0 && !hasFilters && (
        <div className="bg-white border-b border-amber-100 px-5 py-5" style={{ borderTop: '2px solid #D97706' }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={15} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">River Region Parents Advertisers</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {advertiserCamps.map(camp => {
                const cfg = CATEGORY_CONFIG[camp.category] ?? { color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', icon: '⭐' }
                return (
                  <Link key={camp.id} href={`/summer-fun-guide/${camp.slug}`}
                    className="flex items-center gap-2.5 p-3 rounded-xl border-2 hover:shadow-sm transition-all"
                    style={{ borderColor: '#D97706', backgroundColor: '#FFFBEB' }}>
                    <span className="text-xl shrink-0">{cfg.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">{camp.business_name}</div>
                      <div className="text-[10px] text-gray-500">{camp.city}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Results bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-5 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-700">
            Showing <span className="text-blue-700">{filtered.length}</span> of {camps.length} camps & activities
            {hasFilters && <span className="text-gray-400"> (filtered)</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* Grid / Map toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors',
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
                <LayoutGrid size={12} /> Grid
              </button>
              <button onClick={() => setViewMode('map')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors',
                  viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50')}>
                <Map size={12} /> Map
              </button>
            </div>
            {saved.size > 0 && (
              <Link href="/my-summer-list"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
                <Heart size={12} className="fill-red-500" /> My List ({saved.size})
              </Link>
            )}
            {hasFilters && (
              <button onClick={clearAll} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                Clear all
              </button>
            )}
            <button onClick={() => setMobile(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 lg:hidden">
              <SlidersHorizontal size={13} /> Filters {categories.length + prices.length > 0 && `(${categories.length + prices.length})`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-8 flex gap-8">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-20 self-start bg-white rounded-2xl border border-gray-200 p-5 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Filter size={14} /> Filters</div>
            {hasFilters && <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">Clear all</button>}
          </div>
          <FilterPanel />
        </aside>

        {/* Camp grid or map */}
        <div className="flex-1 min-w-0">
          {viewMode === 'map' ? (
            <CampMapView camps={filtered} onCampClick={(id) => {
              const camp = filtered.find(c => c.id === id)
              if (camp) window.open(`/summer-fun-guide/${camp.slug}`, '_blank')
            }} />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🏕️</div>
              <div className="text-lg font-semibold text-gray-700 mb-2">No camps match your filters</div>
              <p className="text-sm text-gray-500 mb-4">Try broadening your search or clearing some filters.</p>
              <button onClick={clearAll} className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                Show all camps
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(camp => (
                <div key={camp.id} onClick={trackView}>
                  <CampCard camp={camp} saved={saved.has(camp.id)} onToggleSave={toggleSave} />
                </div>
              ))}
            </div>
          )}

          {/* Upgrade CTA at bottom */}
          <div className="mt-10 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-6 text-center">
            <div className="text-lg font-bold text-gray-900 mb-1">Is your program listed?</div>
            <p className="text-sm text-gray-600 mb-4">
              Community listings are free. Upgrade to Enhanced ($175/season) for full descriptions, photos, registration status, and featured placement above community listings.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/summer-fun-guide/upgrade"
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                Upgrade to Enhanced →
              </Link>
              <Link href="/advertise"
                className="px-5 py-2.5 text-sm font-bold text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                Become an Advertiser
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobile(false)} />
          <div className="relative w-full bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="text-base font-bold text-gray-900">Filters</div>
              <button onClick={() => setMobile(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <FilterPanel />
            <button onClick={() => setMobile(false)} className="mt-6 w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl">
              Show {filtered.length} results
            </button>
          </div>
        </div>
      )}

      {showEmail && <EmailCaptureModal onClose={() => setShowEmail(false)} total={camps.length} />}
    </div>
  )
}
