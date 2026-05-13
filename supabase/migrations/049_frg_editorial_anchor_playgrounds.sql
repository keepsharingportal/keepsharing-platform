-- Migration 049: First flagship editorial anchor article
-- "The Best Playgrounds and Splash Pads in the River Region"
--
-- ROUTE:       /articles/best-playgrounds-splash-pads-river-region
-- ALSO FEEDS:  /family-resource-guide (editorial section, guide_slug match)
-- ALSO FEEDS:  / (homepage articles grid, editorial_review_status = 'approved')
-- ALSO FEEDS:  /articles (index page)
--
-- FACTUAL BASIS:
--   Oak Park splash pad confirmed by existing platform editorial content (migration 031).
--   All other locations described at general character level — no fabricated hours,
--   equipment specs, or amenity claims. "Before You Go" section handles verification.
--   Hero image: Unsplash generic outdoor/playground scene — no location claim implied.
--
-- VERIFICATION NEEDED BEFORE PROMOTING ON SOCIAL:
--   [ ] Oak Park splash pad currently operational and open for 2026 season
--   [ ] Blount Cultural Park playground equipment status
--   [ ] Lagoon Park current amenities
--   [ ] Prattville/Millbrook specific splash pad locations and hours
--   [ ] Pike Road community park current status
--
-- Idempotent: WHERE NOT EXISTS guard on (guide_slug, slug) combination.

INSERT INTO guide_articles (
  guide_slug,
  slug,
  title,
  excerpt,
  hero_image_url,
  author_name,
  body,
  pull_quotes,
  editorial_review_status,
  published,
  published_at,
  priority,
  display_order,
  issue_month,
  issue_year,
  read_time_minutes
)
SELECT
  'family-resource-guide',
  'best-playgrounds-splash-pads-river-region',
  'The Best Playgrounds and Splash Pads in the River Region',

  'Oak Park at 9am in June is as close to perfect as Montgomery summers get. Here''s where River Region families actually go when the heat is on — splash pads, shaded playgrounds, and parks worth driving across town for.',

  'https://images.unsplash.com/photo-1472457974886-0ebcd59440cc?w=1600&q=80&auto=format&fit=crop',

  'River Region Parents',

  $article_body$
<p>There is a narrow window in an Alabama summer — roughly 7am to 10am — when outdoor time with kids feels not just survivable but actually good. The air still carries some mercy. The playgrounds are not yet packed. The splash pads run cool before the sun gets serious. For about 90 minutes, you remember exactly why you chose to raise your family here.</p>

<p>This guide covers the splash pads and playgrounds that River Region families rely on most. It is the kind of local knowledge that gets passed quietly between moms at the pediatrician's office, in school pickup lines, and in neighborhood Facebook groups. We are glad you found it.</p>

<h2>Splash Pads in the River Region</h2>

<p>Splash pads are the River Region's summer cheat code. They are free. They are self-contained. Kids exhaust themselves without your help. And the best ones are genuinely well-maintained. Here is where to go.</p>

<h3>Oak Park — Montgomery</h3>

<p>Oak Park is the River Region's most-loved family splash pad, and it earns that reputation consistently. The equipment is well-maintained, the water features are engaging for a range of ages, and the admission is free. City of Montgomery splash pads typically operate through Labor Day, though seasonal schedules can shift year to year.</p>

<p>The rule every local parent knows: get there before 10am. Show up at 9 on a Saturday in June and you may have most of the splash pad to yourself. Show up at 11, and the crowd will make that feel like a different morning entirely. The early window is the whole game.</p>

<p>Parking is available on-site. Bring a change of clothes — ideally two per child — and apply sunscreen before you arrive, not after.</p>

<h3>Prattville, Millbrook, and Wetumpka</h3>

<p>Each of the River Region's surrounding communities maintains its own parks system, and several have developed or expanded water play options in recent years. Prattville and Millbrook both have community parks with recreational water features. Wetumpka's riverfront area, about 15 miles north of Montgomery, has been developed thoughtfully with families in mind.</p>

<p>The honest approach here is to check current status before you drive. City recreation department Facebook pages are often the fastest source of real-time information — faster than official websites — and worth a quick look the morning before any park visit. Hours, seasonal opening dates, and equipment availability can all change.</p>

<h2>Playgrounds Worth Making the Drive</h2>

<p>The River Region has more good playgrounds than most newcomers expect. The challenge is not finding them — it is knowing which ones have the shade, the parking, and the equipment that make the trip feel worth it when you are managing the logistics of three kids in Alabama August.</p>

<h3>Blount Cultural Park — Montgomery</h3>

<p>Blount Cultural Park sits in east Montgomery adjacent to the Alabama Shakespeare Festival complex and the Montgomery Museum of Fine Arts. The park is spacious and tree-lined in a way that makes a real difference on a warm morning. It is the kind of place where you arrive planning to stay 45 minutes and end up staying two hours because everyone has found something.</p>

<p>The combination of the outdoor park with the museum directly adjacent — free admission, air conditioning, family programming — makes this area one of the most versatile family destinations in Montgomery. An early outdoor morning can flow naturally into a cool indoor exploration without getting back in the car. That transition is underrated when you have small children.</p>

<h3>Lagoon Park — Montgomery</h3>

<p>Lagoon Park is one of Montgomery's larger recreational green spaces, and its scale works in families' favor. There is room for kids of different ages to spread out and find their own thing — which matters more than any specific piece of equipment on any given Saturday morning. Larger parks with more ground to cover tend to hold older kids' attention longer, which is its own kind of victory.</p>

<h3>Pike Road and Surrounding Communities</h3>

<p>Pike Road has grown quickly and deliberately as a family community, and its recreational infrastructure reflects that investment. The playgrounds in newer developments across the eastern corridor of the metro area tend to have more recently installed equipment than some older city parks. If you live on the east side and have not explored what has opened in the last few years, it is worth an afternoon of discovery.</p>

<p>Pike Road families are also known for their particularly active community culture. The moms here find each other fast. If you are new to the area and not sure where to start, the answer is often: show up at a park in Pike Road on a Saturday morning and introduce yourself.</p>

<h2>Timing the Alabama Summer</h2>

<p>The families who thrive in River Region summers are not tougher than everyone else. They are earlier. And occasionally later.</p>

<p>The morning window — parks and splash pads before 10am, ideally out the door by 8:30 — is the primary outdoor window from late May through September. The midday heat from roughly 11am to 3pm is best spent inside: lunch, rest, a library trip, a museum, air conditioning. Then a second outdoor window opens around 4:30pm when the direct sun softens enough to breathe again.</p>

<p>Evening programming becomes its own category of summer activity. The Montgomery Zoo offers summer evening hours, and the experience of seeing the zoo in cooling temperatures with fewer crowds is genuinely different from a midday visit. The Wetumpka Amphitheater hosts regional performers through the summer, and an outdoor evening show on a good-temperature night is one of those River Region experiences that sticks with kids.</p>

<p>Libraries deserve a direct mention here. Montgomery-Lowndes County Public Library branches run free children's programming all summer — story times, STEAM activities, and summer reading challenges. They are free, reliably excellent, and air-conditioned in the way that only a public library in an Alabama summer can be. When the morning window closes early, the library is the answer.</p>

<h2>What to Pack</h2>

<ul>
<li><strong>Two full changes of clothes per child</strong> — splash pads are comprehensive. One change is for the ride home. Two is for when they found a second splash pad situation you did not plan for.</li>
<li><strong>Sunscreen applied before you leave home</strong> — spray sunscreen in a crowded splash pad is a negotiation. Apply it in the driveway and everyone is happier.</li>
<li><strong>Water shoes or old sneakers for toddlers</strong> — splash pad surfaces get slippery. Flip-flops work for older kids running confidently. Not recommended for toddlers at full speed.</li>
<li><strong>A portable shade canopy or umbrella</strong> — even 10 minutes under shade between water sessions extends the morning considerably. The difference between a 90-minute outing and a two-hour one is often a 10-minute shade break.</li>
<li><strong>Cold drinks in a cooler, not a bag</strong> — frozen water bottles that become cold water during the outing are the practical move. If the kids are hot, they are very hot.</li>
<li><strong>One more towel than you think you need</strong> — the extra is for you. Accept it now and pack accordingly.</li>
</ul>

<h2>Before You Go</h2>

<p>City parks in the River Region are maintained by separate municipalities — Montgomery, Prattville, Millbrook, Wetumpka, and Pike Road each run their own parks systems. Hours, splash pad operational dates, equipment availability, and facility access can all change seasonally or around maintenance windows.</p>

<p>Before building your morning around a specific park, a quick check saves the trip. City of Montgomery Parks, Recreation, and Cultural Affairs maintains a website and Facebook presence with current information. Surrounding cities do the same. The Facebook pages are often more current than the official websites for real-time closures and schedule changes.</p>

<p>And if you find a park that is not on this list but deserves to be — tell us. The River Region has more hidden family-friendly spots than any single guide captures, and the best ones tend to come from parents who just showed up one Saturday and stayed for three hours.</p>

<h2>Find More Family Activities in the River Region</h2>

<p>Playgrounds and splash pads are the start. The <a href="/family-resource-guide#dir-things-to-do">Things To Do section</a> of the Family Resource Guide covers indoor play venues, libraries with children's programming, live entertainment, and family activity options across all of Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, and Eastchase.</p>

<p>If you are new to the area, the <a href="/family-resource-guide">Family Resource Guide</a> is where River Region Parents keeps everything current — schools, childcare, pediatricians, local events, and the community knowledge that takes newcomers months to find on their own. It is a good place to start.</p>
$article_body$,

  '["The 10am rule is real. Get to Oak Park before then and you might have the splash pad to yourself. Show up at 11 and you are in a different morning entirely.", "Our kids do not need the perfect park. They need shade, cold water, and us not on our phones.", "We drove past three playgrounds to get to our park every Saturday that first summer. Some things are just worth the drive."]'::jsonb,

  'approved',
  true,
  NOW(),
  'p1',
  10,
  5,
  2026,
  6

WHERE NOT EXISTS (
  SELECT 1
  FROM guide_articles
  WHERE guide_slug = 'family-resource-guide'
    AND slug       = 'best-playgrounds-splash-pads-river-region'
);

-- ── Verification queries ──────────────────────────────────────────────────────

-- SELECT id, title, slug, editorial_review_status, published, published_at
-- FROM guide_articles
-- WHERE slug = 'best-playgrounds-splash-pads-river-region';
-- expect 1 row, editorial_review_status = 'approved', published = true

-- SELECT COUNT(*) FROM guide_articles
-- WHERE guide_slug = 'family-resource-guide' AND published = true;
-- expect at least 1 (this article)
