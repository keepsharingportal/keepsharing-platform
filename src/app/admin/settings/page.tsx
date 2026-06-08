'use client'

import { useState } from 'react'
import { Save, Eye, EyeOff, Check, Users, Globe, Bell, Database, Key, FolderOpen } from 'lucide-react'
import Link from 'next/link'

const PUBLICATIONS = [
  { abbrev: 'RRP', name: 'River Region Parents',      market: 'Montgomery, AL' },
  { abbrev: 'MBP', name: 'Mobile Bay Parents',        market: 'Mobile, AL' },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents',    market: 'Auburn, AL' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents',     market: 'Eastern Shore, AL' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', market: 'Pensacola, FL' },
  { abbrev: 'RRB', name: 'River Region Boom',         market: 'Montgomery, AL' },
]

const TEAM_MEMBERS = [
  { name: 'Jason Watson',    email: 'jade31994@gmail.com',          role: 'Super Admin',  markets: 'All markets',            avatar: 'JW', color: 'bg-portal-navy' },
  { name: 'DeAnne Watson',   email: 'deanne@riverregionparents.com', role: 'Editor',       markets: 'River Region Parents',   avatar: 'DW', color: 'bg-portal-red-lt0' },
  { name: 'VA (Content)',    email: 'va1@keepsharing.com',           role: 'VA — Content', markets: 'River Region Parents',   avatar: 'V1', color: 'bg-purple-500' },
  { name: 'VA (Advertisers)',email: 'va2@keepsharing.com',           role: 'VA — Ads',     markets: 'River Region Parents',   avatar: 'V2', color: 'bg-teal-500' },
  { name: 'Auburn Publisher',email: 'auburn@keepsharing.com',        role: 'Publisher',    markets: 'Auburn Opelika Parents', avatar: 'AP', color: 'bg-orange-500' },
  { name: 'Mobile Publisher',email: 'mobile@keepsharing.com',        role: 'Publisher',    markets: 'MBP, ESP, GPP',          avatar: 'MP', color: 'bg-indigo-500' },
]

const inputCls = 'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-portal-blue/20 transition-all font-mono'
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

export default function SettingsPage() {
  const [ghlKeys, setGhlKeys]         = useState<Record<string, string>>(Object.fromEntries(PUBLICATIONS.map((p) => [p.abbrev, ''])))
  const [dropboxPaths, setDropboxPaths] = useState<Record<string, string>>(Object.fromEntries(PUBLICATIONS.map((p) => [p.abbrev, `/Past Issues/[Month]/${p.name}/`])))
  const [showKeys, setShowKeys]       = useState<Record<string, boolean>>({})
  const [saved, setSaved]             = useState<string | null>(null)
  const [notifications, setNotifications] = useState({
    newBirthdaySpotlight: true,
    newBusinessSpotlight: true,
    adproofApproved:      true,
    agreementSigned:      true,
    renewalAlert:         true,
    weeklyRevenueSummary: true,
    importComplete:       false,
  })

  const handleSave = (section: string) => {
    setSaved(section)
    setTimeout(() => setSaved(null), 2500)
  }

  const toggleKey = (abbrev: string) =>
    setShowKeys((p) => ({ ...p, [abbrev]: !p[abbrev] }))

  const maskKey = (key: string) =>
    key.length > 8 ? key.slice(0, 4) + '•'.repeat(Math.min(key.length - 8, 20)) + key.slice(-4) : key

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform configuration, integrations, and team management</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* ── GoHighLevel API Keys ────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Key size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">GoHighLevel API Keys</h2>
            <span className="text-xs text-gray-400">One sub-account per publication</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 grid grid-cols-3 gap-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Publication</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide col-span-2">GHL Location API Key</span>
            </div>
            {PUBLICATIONS.map((pub) => (
              <div key={pub.abbrev} className="px-4 py-3 border-b border-gray-100 last:border-0 grid grid-cols-3 gap-4 items-center">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{pub.abbrev}</div>
                  <div className="text-xs text-gray-400">{pub.market}</div>
                </div>
                <div className="col-span-2 relative">
                  <input
                    type={showKeys[pub.abbrev] ? 'text' : 'password'}
                    value={ghlKeys[pub.abbrev]}
                    onChange={(e) => setGhlKeys((p) => ({ ...p, [pub.abbrev]: e.target.value }))}
                    placeholder={`Paste ${pub.abbrev} GHL API key…`}
                    className={inputCls}
                  />
                  <button
                    onClick={() => toggleKey(pub.abbrev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showKeys[pub.abbrev] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Find your API key: GHL → Settings → Business Profile → API Keys
              </p>
              <button onClick={() => handleSave('ghl')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 transition-colors">
                {saved === 'ghl' ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save Keys</>}
              </button>
            </div>
          </div>
        </section>

        {/* ── Dropbox Folder Paths ────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Dropbox Folder Paths</h2>
            <span className="text-xs text-gray-400">Used for ad file scanning and artwork storage</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 grid grid-cols-3 gap-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Publication</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide col-span-2">Dropbox Path</span>
            </div>
            {PUBLICATIONS.map((pub) => (
              <div key={pub.abbrev} className="px-4 py-3 border-b border-gray-100 last:border-0 grid grid-cols-3 gap-4 items-center">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{pub.abbrev}</div>
                  <div className="text-xs text-gray-400">{pub.market}</div>
                </div>
                <div className="col-span-2">
                  <input type="text" value={dropboxPaths[pub.abbrev]}
                    onChange={(e) => setDropboxPaths((p) => ({ ...p, [pub.abbrev]: e.target.value }))}
                    placeholder="/Past Issues/[Month]/Pub Name/"
                    className={inputCls} />
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Use {'{'}month{'}'} and {'{'}year{'}'} as placeholders in paths
              </p>
              <button onClick={() => handleSave('dropbox')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 transition-colors">
                {saved === 'dropbox' ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save Paths</>}
              </button>
            </div>
          </div>
        </section>

        {/* ── Email Notifications ─────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Email Notifications</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {(Object.entries(notifications) as [keyof typeof notifications, boolean][]).map(([key, enabled]) => {
              const labels: Record<string, string> = {
                newBirthdaySpotlight:  'New Birthday Spotlight order received',
                newBusinessSpotlight:  'New Business Spotlight submission received',
                adproofApproved:       'Advertiser approved ad proof',
                agreementSigned:       'Ad agreement signed',
                renewalAlert:          'Advertiser contract expiring in 30 days',
                weeklyRevenueSummary:  'Weekly revenue summary (every Monday)',
                importComplete:        'Zoho import completed',
              }
              return (
                <label key={key} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-700">{labels[key]}</span>
                  <button
                    onClick={() => setNotifications((p) => ({ ...p, [key]: !p[key] }))}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${enabled ? 'bg-portal-navy' : 'bg-gray-300'}`}
                    style={{ height: '22px', width: '40px' }}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              )
            })}
            <div className="px-4 py-3 bg-gray-50 flex justify-end">
              <button onClick={() => handleSave('notifications')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 transition-colors">
                {saved === 'notifications' ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save Preferences</>}
              </button>
            </div>
          </div>
        </section>

        {/* ── Team Members ────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Team Members</h2>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              + Invite Member
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Member', 'Role', 'Market Access', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TEAM_MEMBERS.map((member) => (
                  <tr key={member.email} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {member.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                          <div className="text-xs text-gray-400">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        member.role === 'Super Admin' ? 'bg-portal-blue-lt text-portal-blue ring-1 ring-portal-blue/30' :
                        member.role === 'Publisher'   ? 'bg-green-50 text-green-700 ring-1 ring-green-200' :
                        member.role === 'Editor'      ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' :
                        'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
                      }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{member.markets}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200 font-medium">Active</span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Data & Integrations ─────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Database size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Data & Integrations</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Supabase</div>
                <div className="text-xs text-gray-500 mt-0.5 font-mono">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://','').split('.')[0] ?? 'not configured'}.supabase.co
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200 font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Anthropic Claude API</div>
                <div className="text-xs text-gray-500 mt-0.5">Powers Business Spotlight article generation</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${process.env.ANTHROPIC_API_KEY ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-portal-amber-lt text-portal-amber ring-1 ring-amber-200'}`}>
                {process.env.ANTHROPIC_API_KEY ? 'Connected' : 'Key needed'}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Stripe</div>
                <div className="text-xs text-gray-500 mt-0.5">Birthday Spotlight payments</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${process.env.STRIPE_SECRET_KEY ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-portal-amber-lt text-portal-amber ring-1 ring-amber-200'}`}>
                {process.env.STRIPE_SECRET_KEY ? 'Connected' : 'Key needed'}
              </span>
            </div>
            <Link href="/admin/import" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group">
              <div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-portal-blue transition-colors">Import Zoho Data</div>
                <div className="text-xs text-gray-500 mt-0.5">Upload your Zoho CRM CSV export</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-portal-amber-lt text-portal-amber ring-1 ring-amber-200 font-medium">Action needed</span>
            </Link>
            {/* Distribution Portal */}
            <a href="https://drivers.keepsharing.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group">
              <div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-portal-blue transition-colors">
                  Distribution Portal
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  drivers.keepsharing.com — read-only · manages routes, bundles, and delivery status
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                process.env.DISTRIBUTION_PORTAL_URL
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                  : 'bg-gray-50 text-gray-500 ring-1 ring-gray-200'
              }`}>
                {process.env.DISTRIBUTION_PORTAL_URL ? 'Connected' : 'External App'}
              </span>
            </a>
          </div>
        </section>

        {/* ── Distribution Portal Config ────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Distribution Portal Connection</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="text-sm text-gray-600 leading-relaxed">
              The distribution portal at <a href="https://drivers.keepsharing.com" target="_blank" rel="noopener noreferrer"
                className="text-portal-blue hover:underline font-medium">drivers.keepsharing.com</a> is a separate application
              that manages delivery routes, bundle counts, and driver assignments.
            </div>
            <div className="text-sm text-gray-600 leading-relaxed">
              This platform reads its status data — it never writes to the portal. Distribution status appears in the
              Today screen and My Markets pages automatically.
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 font-mono text-xs text-gray-600">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Required .env.local vars</div>
              <div>DISTRIBUTION_PORTAL_URL=https://drivers.keepsharing.com</div>
              <div>DISTRIBUTION_PORTAL_TOKEN=your_api_token_here</div>
            </div>
            <div className="flex gap-3">
              <a href="https://drivers.keepsharing.com" target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-semibold text-white bg-portal-navy rounded-xl hover:opacity-90 transition-colors">
                Open Distribution Portal ↗
              </a>
              <Link href="/admin/today"
                className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                View Status in Today Screen
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
