import { notFound } from "next/navigation"
import Link from "next/link"
import { Phone, Globe, MapPin, ArrowLeft, Heart, ShieldCheck, Navigation, ExternalLink, Tag, User } from "lucide-react"
import { MOCK_CAMPS, CATEGORY_CONFIG, getTier } from "@/components/rrp/SummerFunGuide"
import type { Camp } from "@/components/rrp/SummerFunGuide"
import { createClient } from "@/lib/supabase/server"
import { ShareButton } from "@/components/ShareButton"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ slug: string }>
}

const PRICE_LABEL: Record<string, string> = {
  free: "Free", "under-100": "Under $100/wk", "100-250": "$100-250/wk",
  "250-plus": "$250+/wk", varies: "Varies",
}

async function getCamp(slug: string): Promise<Camp | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from("summer_fun_guide").select("*").eq("slug", slug).maybeSingle()
    if (data) return data as Camp
  } catch {}
  return MOCK_CAMPS.find(c => c.slug === slug) ?? null
}

async function getRelated(category: string, exclude: string): Promise<Camp[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from("summer_fun_guide").select("*")
      .eq("category", category).neq("slug", exclude).limit(3)
    if (data?.length) return data as Camp[]
  } catch {}
  return MOCK_CAMPS.filter(c => c.category === category && c.slug !== exclude).slice(0, 3)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const camp = await getCamp(slug)
  if (!camp) return {}
  return { title: `${camp.business_name} -- 2026 Summer Fun Guide`, description: camp.description ?? undefined }
}

export default async function CampListingPage({ params }: Props) {
  const { slug } = await params
  const camp = await getCamp(slug)
  if (!camp) notFound()

  const related = await getRelated(camp.category, camp.slug)
  const cfg  = CATEGORY_CONFIG[camp.category] ?? { color: "#374151", bg: "#F9FAFB", border: "#E5E7EB", icon: "star" }
  const tier = getTier(camp)

  const STATUS: Record<string, { label: string; color: string }> = {
    open:     { label: "Registration Open", color: "text-green-700 bg-green-50" },
    waitlist: { label: "Waitlist",          color: "text-amber-700 bg-amber-50" },
    full:     { label: "Full",              color: "text-red-700 bg-red-50" },
    tbd:      { label: "TBD",              color: "text-gray-600 bg-gray-50" },
  }
  const status = STATUS[camp.registration_status ?? "open"]

  const upgradeUrl = `/summer-fun-guide/upgrade?slug=${camp.slug}&name=${encodeURIComponent(camp.business_name)}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="max-w-4xl mx-auto">
          <Link href="/summer-fun-guide" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <ArrowLeft size={15} /> Back to Summer Fun Guide
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hero card */}
            <div className="bg-white rounded-2xl overflow-hidden"
              style={tier === "advertiser"
                ? { border: "2px solid #D97706", boxShadow: "0 0 0 1px #FDE68A" }
                : { border: "1px solid #E5E7EB" }
              }>
              <div className="h-48 flex items-center justify-center relative"
                style={{ background: `linear-gradient(135deg, ${cfg.bg} 0%, ${cfg.border} 100%)` }}>
                <span className="text-7xl opacity-70">{cfg.icon}</span>
                {/* Tier badge */}
                {tier === "advertiser" && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: "#1D4ED8", color: "#fff" }}>
                    <ShieldCheck size={12} strokeWidth={2.5} />
                    River Region Parents Advertiser
                  </div>
                )}
                {tier === "enhanced" && (
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{ backgroundColor: "#F0F9FF", color: "#0369A1", borderColor: "#BAE6FD" }}>
                    Enhanced Listing
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
                      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {cfg.icon} {camp.category}
                    </span>
                    <h1 className="text-2xl font-bold text-gray-900">{camp.business_name}</h1>
                  </div>
                  {status && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                  <MapPin size={14} /> {camp.city}, AL
                </div>
                {camp.description && (
                  <p className="text-base text-gray-700 leading-relaxed">{camp.description}</p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Camp Details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {camp.ages && (
                  <div>
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ages</dt>
                    <dd className="text-gray-900 mt-0.5 font-medium">{camp.ages}</dd>
                  </div>
                )}
                {camp.price_range && (
                  <div>
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</dt>
                    <dd className="text-gray-900 mt-0.5 font-medium">{PRICE_LABEL[camp.price_range]}</dd>
                  </div>
                )}
                {camp.indoor_outdoor && (
                  <div>
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Setting</dt>
                    <dd className="text-gray-900 mt-0.5 font-medium capitalize">{camp.indoor_outdoor}</dd>
                  </div>
                )}
                {camp.neighborhood_tag && (
                  <div>
                    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Area</dt>
                    <dd className="text-gray-900 mt-0.5 font-medium capitalize">{camp.neighborhood_tag.replace("-", " ")}</dd>
                  </div>
                )}
              </dl>
              {camp.camp_director_name && (
                <div className="mt-4">
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><User size={11} />Director</dt>
                  <dd className="text-gray-900 mt-0.5 font-medium text-sm">{camp.camp_director_name}</dd>
                </div>
              )}
              {camp.financial_aid_available && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium">
                  Financial assistance available -- ask when registering
                </div>
              )}
              {camp.discount_code && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                  <Tag size={14} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Promo Code</p>
                    <p className="text-sm font-bold text-amber-900 tracking-widest">{camp.discount_code}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Google Maps */}
            {camp.latitude && camp.longitude && (() => {
              const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              const lat = camp.latitude
              const lng = camp.longitude
              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
              return (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {mapsKey ? (
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${lat},${lng}&zoom=15`}
                      className="w-full h-56 border-0"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="h-56 bg-gray-100 flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <MapPin size={24} className="mx-auto mb-1" />
                        <p className="text-sm">{camp.city}, AL</p>
                      </div>
                    </div>
                  )}
                  <div className="px-5 py-3 border-t border-gray-100">
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Navigation size={14} />
                      Get Directions
                    </a>
                  </div>
                </div>
              )
            })()}

            {/* Claim / upgrade strip */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">Is this your business?</span>
                {" "}Update your info or upgrade your listing for more visibility.
              </div>
              <div className="flex gap-2 shrink-0">
                {tier === "community" ? (
                  <Link href={upgradeUrl}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                    Upgrade to Enhanced ($175) →
                  </Link>
                ) : (
                  <Link href={upgradeUrl}
                    className="px-4 py-2 text-xs font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">
                    Update Info →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Contact */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Contact & Register</h3>
              {camp.phone && (
                <a href={`tel:${camp.phone}`}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors">
                  <Phone size={15} /> {camp.phone}
                </a>
              )}
              {camp.website && (
                <a href={camp.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors">
                  <Globe size={15} /> Visit website
                </a>
              )}
              {camp.instagram_url && (
                <a href={camp.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-pink-50 text-pink-700 font-semibold text-sm hover:bg-pink-100 transition-colors">
                  <ExternalLink size={15} /> Instagram
                </a>
              )}
              {!camp.phone && !camp.website && !camp.instagram_url && (
                <p className="text-sm text-gray-500">Contact info not available yet.</p>
              )}
            </div>

            {/* Save + Share */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
              <div className="text-center mb-2">
                <Heart size={24} className="mx-auto text-gray-300 mb-1" />
                <p className="text-sm text-gray-600">Save this to your summer list</p>
              </div>
              <Link href="/my-summer-list"
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">
                View My List
              </Link>
              <ShareButton title={camp.business_name} />
            </div>

            {/* Upgrade upsell for community listings */}
            {tier === "community" && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <div className="text-sm font-bold text-gray-900 mb-2">Enhanced Listing — $175/season</div>
                <ul className="text-xs text-gray-600 space-y-1 mb-4">
                  <li>+ Full description</li>
                  <li>+ Registration status badge</li>
                  <li>+ Age + price info</li>
                  <li>+ Sorts above community listings</li>
                </ul>
                <Link href={upgradeUrl}
                  className="block w-full text-center py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                  Upgrade Now →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Related camps */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-gray-900 mb-5">More {camp.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map(r => {
                const rcfg = CATEGORY_CONFIG[r.category] ?? { color: "#374151", bg: "#F9FAFB", border: "#E5E7EB", icon: "star" }
                return (
                  <Link key={r.id} href={`/summer-fun-guide/${r.slug}`}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="text-2xl mb-2">{rcfg.icon}</div>
                    <div className="text-sm font-bold text-gray-900 mb-1">{r.business_name}</div>
                    <div className="text-xs text-gray-500">{r.city} -- {r.ages ?? "All ages"}</div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}