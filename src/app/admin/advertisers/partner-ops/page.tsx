// ── /admin/advertisers/partner-ops ───────────────────────────────────────────
// Internal operational blueprint for the RRP partner ecosystem.
// This is a reference document for Jason — not customer-facing.
// Contains: lifecycle stages, tier structure, sponsor rules, GHL taxonomy,
// onboarding checklist, upgrade triggers, retention rules, inventory governance.

import Link from 'next/link'

export const metadata = {
  title: 'Partner Operations Blueprint — Admin',
}

// ── Design tokens (admin palette) ────────────────────────────────────────────
const N    = '#1a2744'
const T    = '#ef6442'
const GOLD = '#b8860b'
const G    = '#f4f4f5'
const W    = '#ffffff'
const GREEN= '#166534'
const RED  = '#991b1b'

const mono = 'var(--font-geist-mono, monospace)'

// ── Small reusable components ─────────────────────────────────────────────────

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 12, borderBottom: '2px solid #e4e4e7' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: N, margin: 0 }}>{title}</h2>
        <a href={`#${id}`} style={{ fontSize: 11, color: '#aaa', textDecoration: 'none', fontFamily: mono }}>#{id}</a>
      </div>
      {children}
    </section>
  )
}

function Tag({ text, color = '#666', bg = '#f0f0f0' }: { text: string; color?: string; bg?: string }) {
  return (
    <span style={{ display: 'inline-block', backgroundColor: bg, color, fontSize: 11, fontWeight: 700, fontFamily: mono, padding: '2px 8px', borderRadius: 4, marginRight: 6, marginBottom: 5 }}>
      {text}
    </span>
  )
}

function RuleCard({ title, children, accent = N }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ backgroundColor: W, border: '1px solid #e4e4e7', borderLeft: `4px solid ${accent}`, borderRadius: 8, padding: '16px 18px', marginBottom: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 8 }}>{title}</p>
      {children}
    </div>
  )
}

function CheckItem({ text, warn = false }: { text: string; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: warn ? RED : GREEN, flexShrink: 0, marginTop: 1 }}>{warn ? '⚠' : '✓'}</span>
      <span style={{ fontSize: 13, color: warn ? '#7f1d1d' : '#3a3a3a', lineHeight: 1.55 }}>{text}</span>
    </div>
  )
}

function Grid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
      {children}
    </div>
  )
}

function TierCard({ tier, color, commitment, includes, neverUpsell, border }: {
  tier: string; color: string; commitment: string; includes: string[]; neverUpsell?: string[]; border: string
}) {
  return (
    <div style={{ backgroundColor: W, border: `1.5px solid ${border}`, borderRadius: 10, padding: '20px 18px' }}>
      <div style={{ display: 'inline-block', backgroundColor: `${color}15`, border: `1px solid ${color}30`, borderRadius: 4, padding: '2px 10px', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tier}</span>
      </div>
      <p style={{ fontSize: 11, color: '#aaa', fontWeight: 600, marginBottom: 12 }}>Commitment: {commitment}</p>
      <div style={{ marginBottom: 14 }}>
        {includes.map(i => <CheckItem key={i} text={i} />)}
      </div>
      {neverUpsell && neverUpsell.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 800, color: RED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Never upsell separately</p>
          {neverUpsell.map(i => <CheckItem key={i} text={i} warn />)}
        </>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PartnerOpsPage() {
  return (
    <div style={{ backgroundColor: G, minHeight: '100vh', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Link href="/admin/advertisers" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Advertisers</Link>
            <span style={{ color: '#ddd' }}>›</span>
            <span style={{ fontSize: 12, color: '#555' }}>Partner Operations Blueprint</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: N, marginBottom: 6 }}>Partner Operations Blueprint</h1>
          <p style={{ fontSize: 14, color: '#888', maxWidth: 640 }}>
            The operational source of truth for the RRP advertiser ecosystem. Lifecycle stages, tier rules, sponsor governance, GHL taxonomy, onboarding, upgrade logic, and retention protection. Internal only.
          </p>
          {/* Quick nav */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {[
              ['lifecycle', 'Lifecycle Stages'],
              ['tiers', 'Tier Structure'],
              ['sponsor-rules', 'Sponsor Rules'],
              ['ghl', 'GHL Structure'],
              ['onboarding', 'Onboarding'],
              ['upgrade', 'Upgrade Logic'],
              ['retention', 'Retention'],
              ['inventory', 'Inventory'],
              ['proposals', 'Proposals'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} style={{ fontSize: 11, fontWeight: 700, color: N, textDecoration: 'none', padding: '5px 12px', borderRadius: 4, backgroundColor: W, border: '1px solid #ddd' }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* ── 1. ADVERTISER LIFECYCLE ─────────────────────────────────────── */}
        <Section title="1. Advertiser Lifecycle Stages" id="lifecycle">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { stage: 'lead',              color: '#888',  def: 'Form submitted or referred. No strategy call yet. GHL contact created, tagged.' },
              { stage: 'consultation',      color: N,       def: 'Strategy call scheduled or completed. Jason evaluating fit, presenting options, establishing trust.' },
              { stage: 'proposal',          color: '#7a4a0d',def: 'Formal visibility plan sent. Awaiting signature. 48hr / 7-day / 14-day follow-up sequence active.' },
              { stage: 'onboarding',        color: '#2d5a2d',def: 'Agreement signed, payment processed. Assets being collected. Listing being built.' },
              { stage: 'active',            color: GREEN,   def: 'Listing live. Campaign running. Monthly engagement check-in. 30/60/90-day milestones tracked.' },
              { stage: 'upgrade-ready',     color: T,       def: '90+ days active with positive signals. Jason has flagged for upgrade conversation. Not yet offered.' },
              { stage: 'sponsor-qualified', color: GOLD,    def: 'Meets loyalty and engagement criteria for Category Sponsor pitch. Sponsor position available or opening.' },
              { stage: 'renewal',           color: '#6d2d9a',def: 'In the 60-day priority renewal window before contract expires. Hold position for them.' },
              { stage: 'dormant',           color: RED,     def: 'Lapsed. No active plan. Reactivation candidate. Do not offer their category sponsor position for 90 days.' },
              { stage: 'reactivation',      color: '#ef6442',def: 'Former partner returning. Loyalty tier restored based on prior total tenure. Priority may be restored.' },
            ].map(s => (
              <div key={s.stage} style={{ backgroundColor: W, border: '1px solid #e4e4e7', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ marginBottom: 8 }}>
                  <code style={{ fontSize: 12, fontWeight: 800, color: s.color, backgroundColor: `${s.color}12`, padding: '2px 7px', borderRadius: 3, fontFamily: mono }}>
                    {s.stage}
                  </code>
                </div>
                <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, margin: 0 }}>{s.def}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: '14px 18px', backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: 0 }}>
              ⚠ Lifecycle stage is stored in <code style={{ fontFamily: mono }}>advertiser_accounts.lifecycle_stage</code>. GHL contacts must be tagged with the matching <code style={{ fontFamily: mono }}>lifecycle:{'{stage}'}</code> tag. Keep both in sync.
            </p>
          </div>
        </Section>

        {/* ── 2. TIER STRUCTURE ───────────────────────────────────────────── */}
        <Section title="2. Partner Tier Structure" id="tiers">
          <Grid cols={3}>
            <TierCard
              tier="Guide Partner"
              color={N}
              border="rgba(26,39,68,0.2)"
              commitment="6-month minimum"
              includes={[
                'Enhanced listing in 1–3 relevant guides',
                'Photo + editorial description (written by RRP)',
                'Guide Partner trust badge',
                'Direct call + website buttons',
                'Category placement (mid-listing, not top)',
                'Lead capture form on listing page',
              ]}
              neverUpsell={[
                'Editorial description — inherent to tier',
                'Trust badge — integrity of the system',
                'Photo placement — core to card design',
              ]}
            />
            <TierCard
              tier="Ecosystem Partner"
              color={T}
              border="rgba(196,98,45,0.25)"
              commitment="Annual commitment required"
              includes={[
                'Featured listing (top of category) in all relevant guides',
                'Quarter-page print ad — 12 issues/year',
                'Monthly newsletter category inclusion',
                'Paid social reach — 10k+ River Region moms/month',
                'Editorial consideration (not guaranteed — editorial independence maintained)',
                'Lead capture + automated email response',
                'RRP social amplification',
              ]}
            />
            <TierCard
              tier="Category Sponsor"
              color={GOLD}
              border="rgba(184,134,11,0.3)"
              commitment="Annual — with 60-day priority renewal window"
              includes={[
                '"Presented By" in category section header — exclusive',
                'Permanent top position — no competitor featured above',
                'All Ecosystem Partner touchpoints',
                'Cross-ecosystem priority editorial + newsletter lead',
                'Seasonal content priority in their category',
                'Custom onboarding with Jason',
                '60-day priority renewal before position goes to market',
              ]}
            />
          </Grid>

          <div style={{ marginTop: 14, padding: '14px 18px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
              <strong>Qualification for Category Sponsor:</strong> Must be active Ecosystem Partner for 6+ months OR have 12+ months annual print history. Cannot be offered to a brand-new advertiser over a qualifying existing partner.
            </p>
          </div>
        </Section>

        {/* ── 3. SPONSOR QUALIFICATION RULES ─────────────────────────────── */}
        <Section title="3. Sponsor Qualification Rules" id="sponsor-rules">
          <Grid cols={2}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: N, marginBottom: 14 }}>Priority Access Order</h3>
              {[
                { n: 1, rule: 'Current Category Sponsors', detail: '60-day priority renewal window. Position is held — not offered to anyone else — until window expires.' },
                { n: 2, rule: 'Platinum loyalty advertisers', detail: '36+ months with RRP. First right of refusal on any category position in their guide.' },
                { n: 3, rule: 'Active Ecosystem Partners (Gold/Silver)', detail: '12–36 months active. Second right of refusal when a position opens.' },
                { n: 4, rule: 'Annual print advertisers', detail: 'Full-page or preferred placement. Demonstrated ecosystem investment over time.' },
                { n: 5, rule: 'New advertisers', detail: 'Only for categories with no qualifying existing partner. Never offered over a long-term partner.' },
              ].map(item => (
                <div key={item.n} style={{ display: 'flex', gap: 14, marginBottom: 12, padding: '12px 14px', backgroundColor: W, border: '1px solid #e4e4e7', borderRadius: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: item.n <= 2 ? GOLD : item.n === 3 ? T : N, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: W }}>{item.n}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 3 }}>{item.rule}</p>
                    <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55 }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: N, marginBottom: 14 }}>Hard Rules — No Exceptions</h3>
              <RuleCard title="1-per-category exclusivity" accent={GOLD}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  One Category Sponsor per category per guide. This is not flexible. The scarcity is the value.
                </p>
              </RuleCard>
              <RuleCard title="No cross-guide stacking (without Ecosystem Partner)" accent={T}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  A business cannot hold the same category sponsorship across multiple guides simultaneously unless they are a full Ecosystem Partner. Prevents gaming the system.
                </p>
              </RuleCard>
              <RuleCard title="Competitor restriction" accent={N}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  Two directly competing businesses cannot both hold featured positions in the same category. Category Sponsor wins; competitor can be Guide Partner only, below the sponsor.
                </p>
              </RuleCard>
              <RuleCard title="60-day renewal hold" accent={GOLD}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  When a sponsor&apos;s contract expires, their position is held for 60 days (<code style={{ fontFamily: mono }}>renewal_priority_until</code>) before going to market. Never expose a sponsor position as &ldquo;open&rdquo; during this window.
                </p>
              </RuleCard>
              <RuleCard title="90-day dormant hold" accent={RED}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  When a sponsor goes dormant, hold their category for 90 days before offering to the waiting list. Allows for reactivation conversation first.
                </p>
              </RuleCard>
            </div>
          </Grid>

          <div style={{ marginTop: 16, padding: '14px 18px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: RED, margin: 0 }}>
              Never allow a new advertiser to jump over a qualifying long-term partner for a Category Sponsor position. If they ask and a long-term partner has priority: put the new advertiser on the waiting list, notify the priority partner first.
            </p>
          </div>
        </Section>

        {/* ── 4. GHL STRUCTURE ────────────────────────────────────────────── */}
        <Section title="4. GHL Pipeline &amp; Tag Taxonomy" id="ghl">
          <Grid cols={3}>
            {/* Pipelines */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Partner Acquisition Pipeline</h3>
              {['New Lead', 'Call Scheduled', 'Proposal Sent', 'Agreement Signed', 'Onboarding Active', 'Live / Active'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: W, border: '1px solid #e4e4e7', borderRadius: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#bbb', width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: N, fontWeight: 500 }}>{s}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Partner Lifecycle Pipeline</h3>
              {['Active (Month 1–3)', 'Established (Month 4–12)', 'Upgrade-Ready', 'Renewal Window (60d)', 'Renewed', 'At Risk', 'Dormant'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: W, border: '1px solid #e4e4e7', borderRadius: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#bbb', width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: N, fontWeight: 500 }}>{s}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Sponsor Pipeline</h3>
              {['Sponsor Inquiry', 'Qualification Review', 'Sponsor Proposal', 'Agreement', 'Category Owner', 'Renewal Protected'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: W, border: '1px solid #e4e4e7', borderRadius: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#bbb', width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: N, fontWeight: 500 }}>{s}</span>
                </div>
              ))}
            </div>
          </Grid>

          <h3 style={{ fontSize: 13, fontWeight: 700, color: N, margin: '24px 0 12px' }}>Tag Taxonomy</h3>
          <Grid cols={2}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tier Tags</p>
              <div>
                {['tier:guide-partner', 'tier:ecosystem-partner', 'tier:category-sponsor'].map(t => <Tag key={t} text={t} color={N} bg="#e8edf5" />)}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>Loyalty Tags</p>
              <div>
                {['loyalty:bronze', 'loyalty:silver', 'loyalty:gold', 'loyalty:platinum'].map(t => <Tag key={t} text={t} color={GOLD} bg="#fef9e7" />)}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>Operational Flags</p>
              <div>
                {['flag:upgrade-ready', 'flag:sponsor-qualified', 'flag:renewal-due-60d', 'flag:renewal-due-30d', 'flag:at-risk', 'flag:dormant'].map(t => <Tag key={t} text={t} color={T} bg="#fef0e8" />)}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Guide Tags</p>
              <div>
                {[
                  'guide:family-resource-guide',
                  'guide:summer-camp-guide',
                  'guide:childcare-guide',
                  'guide:private-school-guide',
                  'guide:healthy-kids-guide',
                  'guide:summer-fun-guide',
                  'guide:birthday-party-guide',
                  'guide:afterschool-guide',
                  'guide:special-needs-guide',
                ].map(t => <Tag key={t} text={t} color='#2d5a2d' bg='#f0fdf4' />)}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>Segment Tags</p>
              <div>
                {[
                  'segment:healthcare',
                  'segment:childcare',
                  'segment:education',
                  'segment:sports-rec',
                  'segment:wellness',
                  'segment:retail',
                  'segment:home-services',
                  'segment:food',
                  'segment:photography',
                  'segment:family-services',
                ].map(t => <Tag key={t} text={t} color='#6d2d9a' bg='#f5f0fd' />)}
              </div>
            </div>
          </Grid>

          <h3 style={{ fontSize: 13, fontWeight: 700, color: N, margin: '24px 0 12px' }}>Key GHL Workflows</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { trigger: 'Form submitted', action: 'Tag as tier:guide-partner-lead + segment:{type} → assign to Jason → send guide-specific pre-call email' },
              { trigger: 'Strategy call booked', action: 'Move to Call Scheduled → send guide partner page URL for their guide → send prep questionnaire' },
              { trigger: 'Proposal sent', action: 'Start 48hr / 7-day / 14-day follow-up sequence → move to Dormant Prospect at Day 21 if no reply' },
              { trigger: 'Agreement signed', action: 'Tag tier → move to Onboarding Active → send asset collection form → set 30-day check-in' },
              { trigger: '90 days active (no upgrade)', action: 'Add flag:upgrade-ready → notify Jason → queue upgrade conversation email' },
              { trigger: 'Contract_end_date - 60 days', action: 'Add flag:renewal-due-60d → send personal renewal email from Jason → set renewal_priority_until' },
              { trigger: 'Contract_end_date - 30 days', action: 'Add flag:renewal-due-30d → escalate to personal call from Jason' },
              { trigger: 'No response to 30-day check-in', action: 'Add flag:at-risk → notify Jason for personal outreach' },
              { trigger: 'Contract expires without renewal', action: 'Move to Dormant → hold category position 90 days → start reactivation sequence at Day 91' },
            ].map(w => (
              <div key={w.trigger} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, padding: '10px 14px', backgroundColor: W, border: '1px solid #e4e4e7', borderRadius: 6 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Trigger</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: N }}>{w.trigger}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Action</p>
                  <p style={{ fontSize: 12, color: '#555' }}>{w.action}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 5. ONBOARDING FRAMEWORK ─────────────────────────────────────── */}
        <Section title="5. Onboarding Checklist" id="onboarding">
          <Grid cols={3}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Asset Collection (from partner)</h3>
              <CheckItem text="Business legal name (for listing)" />
              <CheckItem text="Description draft (RRP will rewrite in editorial voice)" />
              <CheckItem text="Primary guide + category selection" />
              <CheckItem text="High-resolution photo (800×600+ preferred, editorial style)" />
              <CheckItem text="Website URL" />
              <CheckItem text="Primary phone number (for listing)" />
              <CheckItem text="Contact email (for lead capture responses)" />
              <CheckItem text="Service area / primary location" />
              <CheckItem text="Brand colors (primary + accent) — optional" />
              <CheckItem text="Logo URL or file — optional" />
              <CheckItem text="Current offer or promotion — optional" />
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>RRP Operations Tasks</h3>
              <CheckItem text="Create listing in Supabase (guide_listings)" />
              <CheckItem text="Write editorial description (in RRP voice, not marketing)" />
              <CheckItem text="Upload and format photo" />
              <CheckItem text="Apply correct tier badge" />
              <CheckItem text="Confirm category placement + order" />
              <CheckItem text="Send preview link to partner for approval" />
              <CheckItem text="Receive partner approval (required before go-live)" />
              <CheckItem text="Set go-live date" />
              <CheckItem text="Update GHL contact: lifecycle_stage → onboarding" />
              <CheckItem text="Tag GHL with tier + guide + category + loyalty + segment" />
              <CheckItem text="Upload signed agreement to GHL contact" />
              <CheckItem text="Set renewal_date in GHL (for workflow triggers)" />
              <CheckItem text="Send onboarding complete confirmation to partner" />
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Ecosystem Partner Additions</h3>
              <CheckItem text="Confirm print ad size (quarter-page)" />
              <CheckItem text="Collect ad design or initiate design process" />
              <CheckItem text="Confirm print deadline and slot" />
              <CheckItem text="Send print proof for approval" />
              <CheckItem text="Schedule newsletter category inclusion (month + week)" />
              <CheckItem text="Brief social campaign: target audience, creative, launch date" />
              <CheckItem text="Confirm social campaign approval" />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: GOLD, marginBottom: 12, marginTop: 18 }}>Category Sponsor Additions</h3>
              <CheckItem text="Confirm 'Presented By' text (exact business name as it appears in header)" />
              <CheckItem text="Set renewal_priority_until (contract_end_date + 60 days)" />
              <CheckItem text="Update sponsor_guide_slug + sponsor_category_slug in advertiser_accounts" />
              <CheckItem text="Update lifecycle_stage → sponsor-qualified" />
              <CheckItem text="Personal kickoff call from Jason" />
              <CheckItem text="Confirm cross-ecosystem editorial priority schedule" />
            </div>
          </Grid>

          <div style={{ marginTop: 14, padding: '14px 18px', backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: 0 }}>
              ⚠ Never go live without partner approval on the editorial description. The RRP editorial voice is the product — partners sometimes push back on wording. Resolve before publish.
            </p>
          </div>
        </Section>

        {/* ── 6. UPGRADE LOGIC ────────────────────────────────────────────── */}
        <Section title="6. Upgrade Logic" id="upgrade">
          <Grid cols={2}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Upgrade Triggers (auto-flags)</h3>
              <RuleCard title="90+ days active as Guide Partner" accent={T}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>GHL workflow sets flag:upgrade-ready. Jason gets notified. He decides whether to initiate the conversation — this is not an automated email to the partner.</p>
              </RuleCard>
              <RuleCard title="Competitor claims adjacent category" accent={RED}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  When a new sponsor claims a category, notify existing Guide Partners in the same category. Urgency conversation: &ldquo;A competitor just moved into Featured above you.&rdquo;
                </p>
              </RuleCard>
              <RuleCard title="Sponsor position opens in their category" accent={GOLD}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Proactive outreach from Jason. Do not post it as &ldquo;available&rdquo; publicly until the priority sequence has played out.</p>
              </RuleCard>
              <RuleCard title="Partner mentions new category need" accent={N}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>If a partner mentions a second category or guide during a check-in, that&apos;s an upgrade signal. Propose multi-guide expansion.</p>
              </RuleCard>
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Upgrade Paths</h3>
              <div style={{ padding: '18px', backgroundColor: W, border: '1px solid #e4e4e7', borderRadius: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 8 }}>Guide Partner → Ecosystem Partner</p>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 10 }}>
                  Present the multi-surface value: they&apos;re currently discoverable in the guide only. Upgrade means families see their name in print, in the newsletter, and on social — before they open the guide.
                </p>
                <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>Key copy: &ldquo;Right now families can find you. After the upgrade, families will already know your name when they do.&rdquo;</p>
              </div>
              <div style={{ padding: '18px', backgroundColor: '#fef9e7', border: '1px solid rgba(184,134,11,0.3)', borderRadius: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: GOLD, marginBottom: 8 }}>Ecosystem Partner → Category Sponsor</p>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 10 }}>
                  Only offered when: (1) a position is available or about to open, and (2) the partner meets qualification criteria. Never proactively sold to a partner who hasn&apos;t had the upgrade-ready conversation.
                </p>
                <p style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>Key copy: &ldquo;You&apos;re already featured. This locks the position — no competitor can be above you, ever, while you hold the sponsorship.&rdquo;</p>
              </div>

              <div style={{ marginTop: 14, padding: '14px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: RED, marginBottom: 4 }}>Never offer proactively:</p>
                <CheckItem warn text="Category Sponsor to a brand-new advertiser" />
                <CheckItem warn text="Premium placement before onboarding is complete and optimized" />
                <CheckItem warn text="Multi-guide expansion before single-guide listing is performing" />
              </div>
            </div>
          </Grid>
        </Section>

        {/* ── 7. RETENTION STRATEGY ───────────────────────────────────────── */}
        <Section title="7. Retention &amp; Loyalty Protection" id="retention">
          <Grid cols={2}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Proactive Retention Actions</h3>
              {[
                { timing: '30 days active',  action: 'Check-in email from Jason. Confirm listing is live, photo looks right, any questions.' },
                { timing: '60 days active',  action: 'Engagement summary. How many clicks, inquiries, impressions. Real data from listing.' },
                { timing: '90 days active',  action: 'Performance summary + upgrade-ready flag assessment. Is the partner seeing value?' },
                { timing: 'Annual',          action: 'Visibility impact summary — written personally by Jason. Specific numbers. Acknowledges their investment.' },
                { timing: 'Seasonal peaks',  action: 'Proactive email: "Your category spikes in [month]. Your listing is positioned. Here\'s what to expect."' },
              ].map(item => (
                <div key={item.timing} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, padding: '10px 14px', backgroundColor: W, border: '1px solid #e4e4e7', borderRadius: 6, marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: T, margin: 0 }}>{item.timing}</p>
                  <p style={{ fontSize: 12, color: '#555', lineHeight: 1.55, margin: 0 }}>{item.action}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>At-Risk Signals (manual review)</h3>
              <CheckItem warn text="Partner doesn't reply to 30-day check-in email" />
              <CheckItem warn text="Partner opens renewal email but doesn't respond within 5 days" />
              <CheckItem warn text="Partner mentions budget review or business changes during any call" />
              <CheckItem warn text="Listing shows no engagement after 90 days active (possible category mismatch)" />
              <CheckItem warn text="Partner hasn't logged into any RRP resource or clicked any link in 60 days" />

              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12, marginTop: 20 }}>Loyalty Protections</h3>
              <RuleCard title="Platinum (36+ months) — First Right of Refusal" accent={GOLD}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  Platinum advertisers get notified first when any sponsor position in their guide opens. They have 14 days to respond before the position goes to the next priority tier.
                </p>
              </RuleCard>
              <RuleCard title="All tiers — Renewal Priority" accent={N}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  Every active partner gets a personal renewal email from Jason 60 days before expiry. No cold automated reminders. The relationship is the product.
                </p>
              </RuleCard>
            </div>
          </Grid>
        </Section>

        {/* ── 8. INVENTORY GOVERNANCE ─────────────────────────────────────── */}
        <Section title="8. Inventory Governance" id="inventory">
          <Grid cols={2}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Category Sponsor Inventory Rules</h3>
              <CheckItem text="1 sponsor position per category per guide — hard limit" />
              <CheckItem text="No more than 3 sponsor positions in the same broad vertical per guide (prevents category saturation)" />
              <CheckItem text="Same business cannot hold same-category sponsor across multiple guides simultaneously without Ecosystem Partner status" />
              <CheckItem text="Once a position is claimed, it is removed from all 'available' marketing until it lapses" />
              <CheckItem warn text="Never advertise a position as 'open' while a sponsor is in their 60-day renewal window" />
              <CheckItem warn text="Never advertise a position as 'open' while a dormant sponsor is in their 90-day hold" />

              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12, marginTop: 20 }}>Featured Listing Inventory</h3>
              <CheckItem text="1 featured listing per category (that is always the Category Sponsor)" />
              <CheckItem text="Max 2 enhanced listings per category (Guide Partners in that category)" />
              <CheckItem text="Remaining are directory-level — no cap, but directory rows don't affect featured slot inventory" />
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>Print Inventory Rules</h3>
              <CheckItem text="No more than 2 competing businesses in the same category can hold paid print positions simultaneously" />
              <CheckItem text="Back cover, inside front cover, inside back cover — reserved for Category Sponsors or annual Ecosystem Partners only" />
              <CheckItem text="Full-page preferred placement slots are limited — sold annually, never monthly" />

              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12, marginTop: 20 }}>Newsletter Inventory</h3>
              <CheckItem text="1 featured category spotlight per issue — Ecosystem Partner and above only" />
              <CheckItem text="Max 3 paid mentions per issue" />
              <CheckItem text="Lead feature (top of newsletter) — Category Sponsor or seasonal campaign partners only" />

              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12, marginTop: 20 }}>Seasonal Inventory</h3>
              <CheckItem text="Summer Camp Guide (Jan–Apr): Category Sponsor positions must be claimed before January to capture the full planning season" />
              <CheckItem text="After-School Guide (Jul–Sep): Positions must be live before August for full enrollment window capture" />
              <CheckItem text="Birthday Party Guide: No seasonal restriction — year-round guide. Annual renewals staggered." />
            </div>
          </Grid>
        </Section>

        {/* ── 9. PROPOSAL FRAMEWORK ───────────────────────────────────────── */}
        <Section title="9. Proposal Framework" id="proposals">
          <Grid cols={2}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>When Proposals Are Custom</h3>
              <CheckItem text="Category Sponsor conversations — always custom, always personal" />
              <CheckItem text="Multi-guide Ecosystem Partners — different guides have different seasonal dynamics" />
              <CheckItem text="Special Needs Guide advertisers — trust-critical, copy must reflect editorial sensitivity" />
              <CheckItem text="Businesses with complex category situations (two services, multiple categories)" />
              <CheckItem text="Any business Jason has had a 45-minute strategy call with" />
              <CheckItem text="Reactivation proposals — must acknowledge the gap and the relationship history" />

              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12, marginTop: 20 }}>When Templates Are Acceptable</h3>
              <CheckItem text="New Guide Partner proposals in well-defined single categories" />
              <CheckItem text="Warm leads from form submissions who clearly fit a standard tier" />
              <CheckItem text="Follow-up after a strategy call where the right tier is already clear" />
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 12 }}>How Jason Should Use Strategy Calls</h3>
              <RuleCard title="Goal: diagnose before prescribing" accent={N}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  Never open a strategy call with a tier recommendation. Understand the business first: what they offer, who their best customer is, when they&apos;re busiest, what they&apos;ve tried before, and what they&apos;re hoping for. Then match the tier.
                </p>
              </RuleCard>
              <RuleCard title="Show the guide during the call" accent={T}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  Pull up the relevant guide page during the call. Show them their category. If competitors are listed, name that. If the category is empty, frame it as opportunity. Make it visual and local.
                </p>
              </RuleCard>
              <RuleCard title="Never skip the eligibility conversation" accent={GOLD}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  If a sponsor position is available in their category, do not mention it until you have established trust, confirmed fit, and confirmed their budget readiness. Category Sponsor is earned, not stumbled into.
                </p>
              </RuleCard>
              <RuleCard title="Always end with a clear next step" accent={GREEN}>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  Every call ends with: proposal date, onboarding date, or a specific follow-up task. Never let the call end with &ldquo;I&apos;ll think about it and reach out.&rdquo; Set the next date before hanging up.
                </p>
              </RuleCard>
            </div>
          </Grid>
        </Section>

        {/* Footer */}
        <div style={{ padding: '20px 0', borderTop: '1px solid #e4e4e7', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#aaa' }}>
            Partner Operations Blueprint · River Region Parents · Internal Use Only · Last updated May 2026
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <Link href="/admin/advertisers" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Advertisers</Link>
            <Link href="/admin/advertisers/pipeline" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>Pipeline</Link>
            <Link href="/admin/advertisers/segments" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>Segments</Link>
            <Link href="/admin/proposals" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>Proposals</Link>
            <Link href="/partners" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>Public Partner Page →</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
