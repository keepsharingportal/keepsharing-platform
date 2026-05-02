-- Migration 031: Editorial content fields + calendar OG image columns

ALTER TABLE guide_types
ADD COLUMN IF NOT EXISTS editorial_intro TEXT,
ADD COLUMN IF NOT EXISTS insider_tips JSONB DEFAULT '[]';

ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS og_image_fetched BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS og_image_fetch_attempted_at TIMESTAMPTZ;

-- ── NEWCOMER / FAMILY RESOURCE GUIDE ─────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'The River Region is home to about 380,000 people spread across Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, and the surrounding communities. It is a place where neighbors still wave from porches, where Sunday lunch runs past 2pm, and where every mom eventually figures out which gas station has the best biscuits.

This guide is for newcomers, but honestly it is for anyone who wants to know the River Region the way locals do. The schools that do not advertise much but families love. The pediatricians who answer their own phones. The Saturday-morning ritual at the farmers market that just makes life feel right.

We have organized this guide by what families actually need most: schools, doctors, childcare, things to do, neighborhoods to know. Everything is curated, updated annually, and reflects what real River Region moms recommend. Not Google. Not Yelp. Real recommendations from real families.',
  insider_tips = '[
    {"tip": "The Montgomery Zoo has the best summer evenings — go after 5pm when temperatures drop and the animals get active again."},
    {"tip": "Pike Road has the strongest sense of newcomer community. The moms here will fold you into their group within a month."},
    {"tip": "If your child is school-age, start school tours by January for the following fall. The popular ones fill up fast."},
    {"tip": "Saturday morning at the Montgomery Curb Market is a River Region rite of passage. Go early, bring cash, talk to the vendors."},
    {"tip": "Hospital choice matters more than people realize. Ask any local mom whose OB she used and why — the answers will guide you."},
    {"tip": "Saint James, Trinity, and Macon-East are the three private schools most often mentioned, but each has a very different culture. Tour all three before deciding."}
  ]'::jsonb
WHERE slug = 'newcomer';

-- ── PRIVATE SCHOOL GUIDE ──────────────────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'Choosing a school shapes a childhood. It determines who your child eats lunch with, which coach pushes them, which teacher sees something in them that you might have missed. The River Region has an unusually strong private school landscape — the result of decades of families investing in independent education alongside the public system.

The schools here range from university-model homeschool hybrids to full-day classical programs to large college-preparatory academies with 45 athletic teams and their own performing arts centers. There is not one right answer. There is only the right fit for your family.

What this guide does is give you the side-by-side comparison that school visits and open houses cannot: grades served, tuition ranges, mission statements, extracurricular offerings, accreditation, and leadership. Use it to narrow your list before you spend a Saturday morning driving.',
  insider_tips = '[
    {"tip": "Schedule open house visits in January or February. Schools like Saint James fill quickly and the best Q&A sessions happen at open houses, not drop-in tours."},
    {"tip": "Ask specifically about teacher retention rates. A school that keeps good teachers for 10+ years tells you something important about leadership."},
    {"tip": "The CHOOSE Act (Alabama education savings accounts) can significantly offset tuition. Ask each school if they are CHOOSE Act eligible and what the enrollment process looks like."},
    {"tip": "K3 and K4 programs at private schools are separate decisions from K5. Many families use a different school for preschool than for elementary."},
    {"tip": "Military families should ask directly about the military family discount — several River Region private schools offer 10% or more."},
    {"tip": "Visit on a regular school day, not just open house. Ask to walk the hallway and watch a class transition. That 10 minutes tells you more than the tour."}
  ]'::jsonb
WHERE slug = 'private-school';

-- ── SUMMER CAMP GUIDE ─────────────────────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'Alabama summer starts in April and does not apologize. By May, you are already deep into the planning that should have started in February — because the best camps in the River Region fill their sessions months before school lets out.

Summer camp in this region runs a wide range from half-day enrichment programs at local art studios and gymnastics centers to full-week specialty intensives in robotics, theater, swimming, and baseball. Overnight camp options exist but typically require an hour or more of driving to reach the mountain and lake camps north of Birmingham.

What most River Region families discover is that the local summer camp ecosystem is genuinely excellent. The programs here reflect the community — arts-rich, faith-influenced, sports-forward, and surprisingly diverse in focus. The challenge is not finding a good camp. The challenge is choosing among too many good ones before they fill up.',
  insider_tips = '[
    {"tip": "Registration for the most popular sessions opens in February. Set a calendar reminder — the good weeks fill in days, not weeks."},
    {"tip": "Half-day camps (typically 9am–noon) work well for kids under 7. Full-day camps can exhaust younger children in Alabama heat."},
    {"tip": "Ask about the counselor-to-camper ratio, especially for specialty camps. A 1:6 ratio signals a high-quality program; 1:15 or worse is a red flag."},
    {"tip": "Abrakadoodle, the arts camp that runs at multiple host sites, fills extremely fast. Their registration is online and goes live in January."},
    {"tip": "Many churches run excellent summer camps that are open to non-members. Do not rule them out — some of the best week-long programs in the area are faith-based with high-quality programming for all kids."},
    {"tip": "For kids 10 and older, look at sports specialty camps at Faulkner University and Auburn University at Montgomery — quality coaching at reasonable prices."}
  ]'::jsonb
WHERE slug = 'summer-camp';

-- ── CHILDCARE GUIDE ───────────────────────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'The childcare search in Montgomery is real. Infant spots at quality centers fill before the baby is born — some before the pregnancy is announced. If you are expecting, open this guide now and start calling.

What makes a good childcare center is deceptively complex. DHR licensing is the floor, not the ceiling. The centers that families stay with long-term have something harder to measure: low staff turnover, a genuine philosophy of care, and the kind of director who knows every child by name by the second week.

This guide compiles every licensed childcare center in the River Region with the details that matter to working parents: hours, accepted ages, meal provision, staff ratios, and what curriculum they follow. Use it as your starting list. Then visit in person — because no guide can capture the feeling of a classroom where kids are genuinely happy.',
  insider_tips = '[
    {"tip": "Start your search 6 months before you need care. Infant spots (6 weeks to 12 months) have the longest waitlists — sometimes over a year at the best centers."},
    {"tip": "Ask to visit unannounced or during a regular afternoon, not just a scheduled tour. How teachers interact with kids when they are not being evaluated tells you everything."},
    {"tip": "The A Beka curriculum is common in River Region centers and tends to be academically rigorous. Creative Curriculum is more play-based. Neither is universally better — depends on your child."},
    {"tip": "Staff ratios better than DHR standards (1:6 for infants, 1:8 for toddlers) are a signal of investment in quality. Ask what happens to ratios when a teacher calls in sick."},
    {"tip": "Multiple-child discounts can significantly reduce total cost. Always ask — it is not always advertised."},
    {"tip": "Faith-based centers often have stronger community ties and longer-tenured staff. Even if you are not affiliated, many actively welcome families of all backgrounds."}
  ]'::jsonb
WHERE slug = 'childcare';

-- ── HEALTHY KIDS GUIDE ────────────────────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'Finding a pediatrician you trust is one of the most important decisions a family makes — and one of the most rushed. Most families make this choice while pregnant, while overwhelmed, using a list from the insurance portal and hoping for the best.

The River Region has excellent pediatric care. Dentistry for Children set the regional standard for pediatric dentistry — three locations, board-certified specialists, and a reputation built across two generations of River Region families. Alabama Children''s Hospital in Birmingham is accessible for subspecialty care. And the River Region itself has a solid network of community pediatricians who genuinely know their patients.

What this guide gives you is the local directory that insurance portals cannot: real information about who is accepting new patients, what age ranges each practice sees, and the specialties available locally versus what requires a referral to Birmingham.',
  insider_tips = '[
    {"tip": "Call pediatricians'' offices in your second trimester to get on their new-patient list. The best practices in Montgomery have waitlists for new births."},
    {"tip": "Dentistry for Children (DFC) is the River Region benchmark for pediatric dentistry. Multiple locations. Board-certified. Worth the slight wait for an appointment."},
    {"tip": "For subspecialty needs (neurology, developmental pediatrics, cardiology), Alabama Children''s Hospital in Birmingham is the regional referral center. Most community pediatricians here have established referral relationships."},
    {"tip": "Ask any prospective pediatrician how they handle after-hours calls. Some use a nurse triage line; others have the doctor on call. This matters enormously at 11pm with a sick toddler."},
    {"tip": "The Hyundai plant has shifted many families to specific insurance networks. Verify your plan before making a pediatrician choice — the best doctor in the world is frustrating if they are out-of-network."},
    {"tip": "Early intervention services for developmental concerns are available through the River Region Human Resources office. Getting on the evaluation list early is critical — the waitlist is long."}
  ]'::jsonb
WHERE slug = 'healthy-kids';

-- ── SUMMER FUN GUIDE ──────────────────────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'Summer in the River Region has its own rhythm. The heat drives families inside by noon and back out again around 5pm. The best summer experiences here honor that rhythm — early morning activities, late afternoon events, the evening culture that makes Alabama summers actually enjoyable.

The Montgomery Zoo evening hours are a local secret. The Wetumpka Amphitheater brings in regional performers every weekend. The Curb Market is Saturday morning before the heat arrives. And across the region, a surprisingly rich calendar of festivals, markets, art workshops, and outdoor events fills every weekend from May through September.

This guide covers everything families can do across the River Region in summer — from free splash pads and library programming to ticketed events and classes that fill up fast. Use the category filters to find what fits your kids'' ages and interests.',
  insider_tips = '[
    {"tip": "The Montgomery Zoo is genuinely better on weekday evenings (5–8pm during summer hours). Fewer people, cooler temperatures, animals are active. Buy tickets online to skip the gate line."},
    {"tip": "The Wetumpka Amphitheater (now WETUMPKA DEPOT) is an underused gem. Check their summer schedule in May — evening shows in that setting are magical for older kids."},
    {"tip": "Rosa Parks Museum and the Civil Rights Memorial are both free or low-cost and air-conditioned. They make for a meaningful summer field trip that connects to curriculum."},
    {"tip": "Splash pads at local parks are free and open through Labor Day. Oak Park in Montgomery has the best equipment. Go before 10am to avoid the crowd."},
    {"tip": "Montgomery Museum of Fine Arts (MMFA) has free admission and rotating family programming. Their summer Art After Five events are a favorite for parents who want to do something that isn''t a restaurant."},
    {"tip": "The Pike Road Farmers Market runs through summer and has the most social atmosphere of any farmers market in the region. Kids are welcome and the vendors love them."}
  ]'::jsonb
WHERE slug = 'summer-fun';

-- ── BIRTHDAY PARTY GUIDE ──────────────────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'River Region parents know how to do a birthday party. The market for party venues, entertainers, cake artists, and specialty rentals has grown significantly over the last decade — partly because the region skews young (Hyundai, Maxwell, military families) and partly because Alabama culture takes celebrations seriously.

The options now range from classic venue rentals and bounce house parties to escape rooms, pottery studios, cooking classes, laser tag, roller rinks, and indoor climbing. The challenge is no longer finding something — it is narrowing down the right fit for your child''s age, interests, and the size of the guest list your partner is okay with.

This guide organizes the River Region birthday party ecosystem by category: food and desserts, venues, entertainment, rentals, and services. Most venues book 4–8 weeks out for weekend slots. Some of the most popular dates (the weekend before school starts, end-of-year weekends) book even faster.',
  insider_tips = '[
    {"tip": "Book weekend party slots 6–8 weeks out for popular venues. The Saturday slots in May (end of school year) and October fill first."},
    {"tip": "Bruster''s Ice Cream offers party cake orders that are genuinely better than most baked cakes and cost less. Order 2 weeks in advance."},
    {"tip": "The 2211 Ultimate Play Zone on McGehee Road is the go-to for high-energy birthday parties for ages 5–12. Roller skating + arcade + party room. Book early."},
    {"tip": "For older kids (10+), escape rooms and cooking classes are replacing traditional venue parties. These tend to book much further out because they have smaller capacity."},
    {"tip": "Ask venues what is included in the base rental: tables, chairs, linens, serving equipment. The nickel-and-dime add-ons can double the cost if you are not careful."},
    {"tip": "Outdoor parties in April, September, and October are beautiful in the River Region. Outdoor parties in June, July, and August require serious shade and a backup indoor plan."}
  ]'::jsonb
WHERE slug = 'birthday-party';

-- ── AFTERSCHOOL GUIDE ─────────────────────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'The hours between 3pm and 6pm define a child''s week in ways that school does not. They are the hours when kids are tired but also more open — when they discover they love climbing walls, or that they can play guitar, or that they are actually good at chess when someone takes time to teach them.

The afterschool program landscape in the River Region has expanded considerably. Beyond the traditional YMCA and church programs, there are now dedicated music academies, robotics clubs, art studios, martial arts studios, tutoring networks, and competitive sports organizations that structure these hours into something meaningful for families who need reliable care and enriching experiences simultaneously.

The challenge for working parents is not finding options — it is finding options that are logistically workable: close to school or home, with the right pickup window, at a price that fits the budget across 9 months. This guide is organized by program type with the operational details that make or break a working parent''s decision.',
  insider_tips = '[
    {"tip": "Programs with limited slots (art studios, instrument lessons, specialty clubs) fill in late summer when families are finalizing fall schedules. Do not wait until September."},
    {"tip": "The YMCA afterschool program runs buses from many Montgomery elementary schools and offers sliding-scale fees. It is the most accessible option for working parents who need reliable daily pickup."},
    {"tip": "Abrakadoodle offers afterschool art programs at select schools in the region — less driving, same quality as their standalone studio classes."},
    {"tip": "For kids who need academic support alongside enrichment, look for programs that combine homework time with activity. An hour of structured homework before the activity reduces evening stress significantly."},
    {"tip": "Guitar Center on Eastern Boulevard offers private 1-on-1 lessons with professional instructors. Less expensive than specialty music studios and more flexible scheduling."},
    {"tip": "Many church-based afterschool programs are open to non-members and offer excellent care, community, and programming at below-market prices. Do not rule them out based on name alone."}
  ]'::jsonb
WHERE slug = 'afterschool';

-- ── SPECIAL NEEDS GUIDE ───────────────────────────────────────────────────────
UPDATE guide_types SET
  editorial_intro = 'Navigating special needs resources in a mid-size city means knowing who to call, which waiting lists to get on early, and which organizations actually move the needle for families like yours. The River Region has more resources than most families discover on their own — the challenge is that they are spread across county services, private providers, nonprofit organizations, and the school system.

Early intervention is the most time-sensitive resource in this guide. If you have any developmental concerns about a child under 3, contact the Early Intervention program through the Alabama Department of Rehabilitation Services before anything else. The evaluation timeline is long and the services are free.

For families of school-age children, the IEP process through Montgomery Public Schools and the surrounding districts is the formal channel — but many families also find private therapists, social skills groups, and advocacy organizations essential to complement what the school system provides. This guide brings all of it together.',
  insider_tips = '[
    {"tip": "Early Intervention (for children under 3) is free and federally funded. Contact Alabama Department of Rehabilitation Services as soon as you have concerns. Do not wait for a diagnosis."},
    {"tip": "C.H.A.D.D. (Children and Adults with Attention-Deficit Disorders) at chadd.org is the best national resource for ADHD, but the local chapter connects you to River Region-specific providers and support groups."},
    {"tip": "The IEP (Individualized Education Program) process at Montgomery Public Schools can feel overwhelming. Ask for a parent advocate — it is your right, it is free, and it changes the dynamic completely."},
    {"tip": "Private occupational therapy and speech therapy providers often have shorter waitlists than the school system''s contracted providers. If the wait is long, pursue both simultaneously."},
    {"tip": "Alabama''s ABLE Act allows tax-advantaged savings accounts for individuals with disabilities. If your child has a qualifying diagnosis, open an ABLE account — the financial planning implications are significant."},
    {"tip": "Seek out the Facebook group ''Montgomery AL Special Needs Families'' — it is where parents share real-time intel on providers, waitlists, and IEP strategies that you will not find in any directory."}
  ]'::jsonb
WHERE slug = 'special-needs';
