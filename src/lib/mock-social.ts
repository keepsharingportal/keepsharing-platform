export type SocialPlatform = 'instagram' | 'facebook' | 'both'
export type SocialStatus = 'draft' | 'pending' | 'approved' | 'posted'
export type PostType = 'spotlight' | 'article_share' | 'event' | 'birthday' | 'school_news' | 'guide_promo' | 'general'

export interface SocialPost {
  id: string
  publication: string
  platform: SocialPlatform
  imageUrl: string | null
  caption: string
  hashtags: string
  scheduledAt: string
  status: SocialStatus
  type: PostType
  sourceArticle?: string
  generatedBy: 'claude' | 'manual' | 'ghl'
  approvedBy?: string
  postedAt?: string
  reach?: number
  engagements?: number
}

export const MOCK_SOCIAL_POSTS: SocialPost[] = [
  {
    id: 'sp001', publication: 'RRP', platform: 'instagram',
    imageUrl: null,
    caption: '✨ Mama. Physician. Community hero.\n\nMeet Dr. Angela Williams — this month\'s River Region Parents cover feature. She works full-time as a doctor AND runs a free after-school tutoring program serving 40+ kids every week in Montgomery.\n\nRead her story in our May issue (link in bio) 💛',
    hashtags: '#RiverRegionParents #MontgomeryMom #CommunityHero #MontgomeryAL #MayIssue',
    scheduledAt: '2026-04-29T10:00:00', status: 'pending', type: 'spotlight', generatedBy: 'claude',
    sourceArticle: 'Dr. Angela Williams Cover Profile',
  },
  {
    id: 'sp002', publication: 'RRP', platform: 'facebook',
    imageUrl: null,
    caption: '🏕️ Summer Camp registration is OPEN, Montgomery families!\n\nWe\'ve put together our full Summer Camp Guide with 28 local options — from overnight camps to day camps, sports to arts, ages 4 to 17.\n\nFind the perfect fit for your kids → link in comments below 👇',
    hashtags: '#SummerCamp #MontgomeryAL #RiverRegionParents #SummerFun',
    scheduledAt: '2026-04-28T09:00:00', status: 'approved', type: 'guide_promo', generatedBy: 'claude',
    approvedBy: 'Jason Watson',
  },
  {
    id: 'sp003', publication: 'RRP', platform: 'both',
    imageUrl: null,
    caption: '🎂 Happy Birthday to our April Birthday Stars!\n\nThese incredible kids are celebrating this month and we are here for ALL of it 🎉 Tag a birthday kid in the comments!\n\n#BirthdaySpotlight link in bio to feature your child\'s birthday in River Region Parents.',
    hashtags: '#HappyBirthday #RiverRegionParents #MontgomeryBirthday',
    scheduledAt: '2026-04-27T11:00:00', status: 'posted', type: 'birthday', generatedBy: 'claude',
    postedAt: '2026-04-27T11:01:33', reach: 2840, engagements: 143,
  },
  {
    id: 'sp004', publication: 'RRP', platform: 'instagram',
    imageUrl: null,
    caption: '📚 Did you know Carver High\'s robotics team just qualified for STATE?\n\nThe "Iron Eagles" built their competition robot in 6 weeks. Coach Chen calls it the best team he\'s worked with in 22 years. Competition is May 3rd in Birmingham 🤖\n\nCheer \'em on! 🎉',
    hashtags: '#CarverHighSchool #MontgomeryRobotics #FIRST #MontgomeryAL #LocalPride',
    scheduledAt: '2026-04-30T09:00:00', status: 'pending', type: 'school_news', generatedBy: 'claude',
    sourceArticle: 'Carver Robotics State Qualifier',
  },
  {
    id: 'sp005', publication: 'MBP', platform: 'facebook',
    imageUrl: null,
    caption: '📖 Mobile Bay Parents May issue is almost here!\n\nThis month: Summer Camp Guide, Mom to Mom with a local entrepreneur, and our Child Care Guide featuring 30+ daycares and preschools in the Mobile Bay area.\n\nFollow us for first-look content all week! 🌊',
    hashtags: '#MobileBayParents #MobileAL #MayIssue #SummerCamp',
    scheduledAt: '2026-04-29T14:00:00', status: 'draft', type: 'general', generatedBy: 'claude',
  },
  {
    id: 'sp006', publication: 'AOP', platform: 'instagram',
    imageUrl: null,
    caption: '🍎 Teacher of the Month: Mr. David Chen, Carver High\n\n22 years teaching AP Chemistry. 40+ students sent to pre-med programs. Personally mentors every student.\n\nNominate a teacher who changed your child\'s life → link in bio 🏆\n\n#TeacherOfTheMonth #AuburnOpelika #LocalTeachers',
    hashtags: '#TeacherOfTheMonth #AuburnOpelikaParents #LocalHero',
    scheduledAt: '2026-05-01T10:00:00', status: 'pending', type: 'spotlight', generatedBy: 'claude',
  },
  {
    id: 'sp007', publication: 'RRP', platform: 'facebook',
    imageUrl: null,
    caption: '☀️ What are YOUR kids doing this summer?\n\nWe surveyed 400 Montgomery families and the #1 answer was: "We\'re still figuring it out!" 😂\n\nDon\'t panic — our Summer Camp Guide has 28 options across every age group and budget. Tap the link in our bio 👆',
    hashtags: '#SummerPlanning #MontgomeryMoms #RiverRegionParents',
    scheduledAt: '2026-05-02T09:00:00', status: 'draft', type: 'guide_promo', generatedBy: 'claude',
  },
]

export function getSocialPostsByPub(pub?: string): SocialPost[] {
  if (!pub) return MOCK_SOCIAL_POSTS
  return MOCK_SOCIAL_POSTS.filter((p) => p.publication === pub)
}

export function getSocialStats() {
  return {
    total:    MOCK_SOCIAL_POSTS.length,
    draft:    MOCK_SOCIAL_POSTS.filter((p) => p.status === 'draft').length,
    pending:  MOCK_SOCIAL_POSTS.filter((p) => p.status === 'pending').length,
    approved: MOCK_SOCIAL_POSTS.filter((p) => p.status === 'approved').length,
    posted:   MOCK_SOCIAL_POSTS.filter((p) => p.status === 'posted').length,
  }
}
