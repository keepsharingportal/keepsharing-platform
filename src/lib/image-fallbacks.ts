/**
 * Curated Unsplash fallback images.
 *
 * Deterministic selection: same slug ALWAYS gets the same image.
 * This means a listing's fallback won't change between page loads,
 * which is important for users developing pattern-recognition with
 * the platform ("oh, that's the brown bear cafe").
 */

const UNSPLASH = {
  person_woman: [
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80&auto=format&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80&auto=format&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80&auto=format&fit=crop&crop=faces',
  ],
  person_kid: [
    'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=400&q=80&auto=format&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80&auto=format&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1595967083638-d6ad65d2fb16?w=400&q=80&auto=format&fit=crop&crop=faces',
  ],
  person_grandparent: [
    'https://images.unsplash.com/photo-1558898479-33c0057a5d12?w=400&q=80&auto=format&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1581579438747-104c53e7c2e1?w=400&q=80&auto=format&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1559963110-71b394e7494d?w=400&q=80&auto=format&fit=crop&crop=faces',
  ],
  family: [
    'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607317149721-3ce55b3a3c83?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1623091410901-00e2d268901f?w=1200&q=80&auto=format&fit=crop',
  ],
  summer_camp: [
    'https://images.unsplash.com/photo-1496080174650-637e3f22fa03?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530041930197-ff16ac917b0e?w=1200&q=80&auto=format&fit=crop',
  ],
  festival: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80&auto=format&fit=crop',
  ],
  outdoors: [
    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1200&q=80&auto=format&fit=crop',
  ],
  arts: [
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=80&auto=format&fit=crop',
  ],
  education: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80&auto=format&fit=crop',
  ],
  health: [
    'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=1200&q=80&auto=format&fit=crop',
  ],
  parenting: [
    'https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=1200&q=80&auto=format&fit=crop',
  ],
  business: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80&auto=format&fit=crop',
  ],
  school_zone: [
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&q=80&auto=format&fit=crop',
  ],
  students: [
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1484820540004-14229fe36ca4?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1543269864-e3c379c29469?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&q=80&auto=format&fit=crop',
  ],
  education_matters: [
    // Superintendent-column-appropriate: campuses, classrooms in use,
    // engaged students, teacher-and-class moments. Wider pool (8) so
    // 4 districts × 1 article/month = ~48 slots before any collision.
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80&auto=format&fit=crop', // pencil on notebook
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80&auto=format&fit=crop', // students at desks
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80&auto=format&fit=crop', // hands raised class
    'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&q=80&auto=format&fit=crop', // classroom books
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop', // library shelves
    'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1200&q=80&auto=format&fit=crop', // school corridor
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=1200&q=80&auto=format&fit=crop', // graduation caps
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=80&auto=format&fit=crop', // school building exterior
  ],
  summer_fun: [
    'https://images.unsplash.com/photo-1527090526205-beaac8dc3c62?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1530041930197-ff16ac917b0e?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1200&q=80&auto=format&fit=crop',
  ],
  mom_life: [
    'https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1578926288207-a90a5366a1bc?w=1200&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=1200&q=80&auto=format&fit=crop',
  ],
}

export type FallbackCategory = keyof typeof UNSPLASH

/** Hash a string into a stable integer (FNV-1a). */
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** Get a deterministic Unsplash fallback for a given (category, key). */
export function getFallback(category: FallbackCategory, key: string): string {
  const pool = UNSPLASH[category] ?? UNSPLASH.family
  return pool[hash(key) % pool.length]
}

/** Smart fallback that picks category from event/listing/article context. */
export function getFallbackByContext(
  contextCategory: string | null | undefined,
  key: string,
): string {
  const cat = (contextCategory ?? '').toLowerCase()
  const map: Array<[string, FallbackCategory]> = [
    ['festival', 'festival'],
    ['concert', 'arts'],
    ['music', 'arts'],
    ['art', 'arts'],
    ['theater', 'arts'],
    ['outdoor', 'outdoors'],
    ['hike', 'outdoors'],
    ['nature', 'outdoors'],
    ['summer-camp', 'summer_camp'],
    ['camp', 'summer_camp'],
    ['school-bits', 'school_zone'],
    ['school-zone', 'school_zone'],
    ['teacher-of-month', 'school_zone'],
    ['education-matters', 'education_matters'],  // dedicated pool — 4 districts × ~1 article/mo each; larger pool avoids the same photo twice per district
    ['student-spotlight', 'students'],
    ['school', 'school_zone'],
    ['private-school', 'school_zone'],
    ['education', 'school_zone'],
    // Both spellings: guide_types.slug is 'afterschool' (no hyphen) while the
    // URL slug is 'after-school-guide'. Only the hyphenated token was listed,
    // so every After-School listing fell through to the 'school' token below
    // and got classroom-and-school-bus stock photos instead of the activity
    // imagery this guide is about. Must stay above 'school'.
    ['afterschool', 'education'],
    ['after-school', 'education'],
    ['summer-fun', 'summer_fun'],
    ['summer', 'summer_fun'],
    ['mom-to-mom', 'mom_life'],
    ['mom-life', 'mom_life'],
    ['health', 'health'],
    ['dental', 'health'],
    ['medical', 'health'],
    ['pediatric', 'health'],
    ['parenting', 'parenting'],
    ['mom', 'parenting'],
    ['family', 'family'],
    ['business', 'business'],
  ]
  for (const [token, fallback] of map) {
    if (cat.includes(token)) return getFallback(fallback, key)
  }
  return getFallback('family', key)
}
