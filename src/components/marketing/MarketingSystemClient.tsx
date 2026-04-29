'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, ExternalLink, RefreshCw, Send, FileText, Users,
  TrendingUp, DollarSign, Clock, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, Mail, MessageSquare, Target,
  Globe, BarChart2, Megaphone, Copy, Zap, X,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Industry =
  | 'orthodontist' | 'dental' | 'childcare' | 'private_school'
  | 'pediatric' | 'after_school' | 'party_venue' | 'hvac' | 'other'

type ClientStatus = 'trial' | 'active' | 'paused' | 'cancelled'

type MarketingClient = {
  id: string
  businessName: string
  industry: Industry
  primaryOffer: string
  targetAudience: string
  serviceAreaZips: string[]
  ghlAccountId: string | null
  metaAdAccountId: string | null
  landingPageUrl: string | null
  trialStartedAt: string
  trialConvertedAt: string | null
  status: ClientStatus
  leadCountThisMonth: number
  metaSpendThisMonth: number
  costPerLead: number | null
  lastReportDate: string | null
  lastReportSent: boolean
  lastReportId: string | null
}

type Tab = 'dashboard' | 'onboard' | 'templates' | 'reports'

type Template = {
  headline: string
  offer: string
  landingPage: { sections: string[]; formFields: string[] }
  emails: { day: number; subject: string; preview: string; body: string }[]
  sms: { step: string; trigger: string; delay: string; message: string }[]
  ads: { variant: string; headline: string; body: string; cta: string }[]
  targeting: { age: string; radius: string; interests: string[]; income?: string; notes: string }
}

// ── Industry options ──────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: 'orthodontist',   label: 'Orthodontist' },
  { value: 'dental',         label: 'Dental' },
  { value: 'childcare',      label: 'Childcare' },
  { value: 'private_school', label: 'Private School' },
  { value: 'pediatric',      label: 'Pediatric' },
  { value: 'after_school',   label: 'After-School Program' },
  { value: 'party_venue',    label: 'Party Venue' },
  { value: 'hvac',           label: 'HVAC' },
  { value: 'other',          label: 'Other' },
]

const INDUSTRY_COLOR: Record<Industry, string> = {
  orthodontist:   'bg-blue-50 text-blue-700 ring-blue-200',
  dental:         'bg-teal-50 text-teal-700 ring-teal-200',
  childcare:      'bg-pink-50 text-pink-700 ring-pink-200',
  private_school: 'bg-purple-50 text-purple-700 ring-purple-200',
  pediatric:      'bg-green-50 text-green-700 ring-green-200',
  after_school:   'bg-orange-50 text-orange-700 ring-orange-200',
  party_venue:    'bg-rose-50 text-rose-700 ring-rose-200',
  hvac:           'bg-amber-50 text-amber-700 ring-amber-200',
  other:          'bg-gray-50 text-gray-600 ring-gray-200',
}

// ── Template library ──────────────────────────────────────────────────────────

const TEMPLATES: Record<Industry, Template> = {
  orthodontist: {
    headline: 'Get Your FREE Smile Consultation',
    offer: 'Free orthodontic consultation + smile assessment',
    landingPage: {
      sections: [
        'Hero — Before/after gallery with bold headline and urgency badge ("Limited spots this month")',
        'Offer bar — "FREE consultation + smile assessment — $0 today"',
        'Trust strip — Years in practice, AAO membership, patient count, Google rating',
        'Process steps — 1. Book online → 2. Free exam → 3. Custom plan',
        'Parent testimonials — 3 quotes with photo and child age',
        'FAQ accordion — 6 questions (cost, age, duration, pain, insurance, what to expect)',
        'Sticky footer CTA — Name, parent email, child\'s age, phone, best time to call',
      ],
      formFields: ['First name', 'Parent email', "Child's age", 'Phone', 'Best time to call'],
    },
    emails: [
      { day: 0, subject: "You're confirmed! Here's what happens next", preview: 'Thanks for requesting your free smile consultation…', body: 'Hi {first_name}, great news — you\'ve taken the first step toward your child\'s perfect smile! Our patient coordinator will call within 1 business day to confirm your appointment. Here\'s what to bring and what to expect at your free visit.' },
      { day: 2, subject: 'What to expect at your FREE consultation', preview: 'No X-rays required. No pressure. Just answers.', body: 'Your free consultation includes a full orthodontic assessment, digital photos, and a personalized treatment overview. Most parents are surprised at how simple — and affordable — the process can be.' },
      { day: 5, subject: '3 signs your child may be ready for treatment', preview: 'Most parents don\'t notice these until it\'s too late…', body: '1. Crowded or overlapping teeth. 2. Difficulty chewing or biting. 3. Early or late loss of baby teeth. The AAO recommends an evaluation by age 7 — early detection makes treatment easier and less costly.' },
      { day: 10, subject: 'Meet the {city} families who chose us', preview: '"My daughter loves her smile now." — Sarah M.', body: 'We\'ve helped hundreds of families right here in {city} achieve beautiful, healthy smiles. Here are a few of their stories. [Testimonial 1] [Testimonial 2] [Testimonial 3]. Ready to write your own success story?' },
      { day: 14, subject: 'Your free consultation expires in 48 hours ⏰', preview: 'We\'re holding a spot for you — but not for long…', body: 'Hi {first_name}, we\'re holding your free consultation slot, but we can only do that for a few more days. Click below to pick a time — it takes 60 seconds.' },
    ],
    sms: [
      { step: '1', trigger: 'Form submitted', delay: '< 5 min', message: 'Hi {first_name}! {practice} here — thanks for your interest in a FREE smile consultation! Our team will call you shortly to confirm your appointment. Reply STOP to opt out.' },
      { step: '2', trigger: 'No call response', delay: '24 hours', message: '{first_name}, we tried to reach you! We\'d love to get your child\'s free consultation on the calendar. Reply YES and we\'ll call between 9–5, or text a good time.' },
      { step: '3', trigger: 'Appointment confirmed', delay: '24 hrs before', message: 'Reminder: {child_name}\'s free ortho consultation is tomorrow at {time} at {practice}. Reply CONFIRM or RESCHEDULE. See you soon! 😊' },
    ],
    ads: [
      { variant: 'A — Social proof', headline: 'Transform Your Child\'s Smile in {city}', body: 'Hundreds of local families trust {practice} for beautiful, lasting results. Right now: FREE smile consultations — no obligation, no pressure. Limited spots this month.', cta: 'Book Free Consultation' },
      { variant: 'B — Scarcity', headline: 'Only 8 Free Consultation Slots Left This Month', body: "Don't miss your chance for a complimentary orthodontic assessment for your child. We'll review their smile, answer all your questions, and outline a plan — completely free.", cta: 'Claim Your Spot' },
      { variant: 'C — Educational', headline: 'The #1 Mistake Parents Make With Orthodontics', body: 'Waiting too long. The AAO recommends evaluations by age 7. Find out if your child is on track with a FREE assessment at {practice} — {city}\'s top-rated orthodontic office.', cta: 'Get Free Assessment' },
    ],
    targeting: {
      age: '26–45', radius: '15 miles',
      interests: ['Parenting', 'Family & relationships', 'Child development', 'Pediatric dentistry'],
      income: '$65,000+',
      notes: 'Parents with children ages 5–16. Exclude existing patients via custom audience upload.',
    },
  },

  dental: {
    headline: 'New Patient Special: $89 Cleaning, Exam & X-Rays',
    offer: 'Complete new patient visit — all-inclusive, no surprises',
    landingPage: {
      sections: [
        'Hero — Smiling patient photo with "$89 New Patient Special" badge and urgency line',
        'Includes section — Full exam, professional cleaning, X-rays, treatment plan',
        'Availability — "Same-week appointments available" with simple online form',
        'Trust strip — Google rating, years in practice, insurance accepted, BBB',
        'Team intro — Headshots + short bios of providers',
        'Patient reviews — 4 Google reviews with star ratings',
        'FAQ — Insurance, pain, appointment length, what to bring',
        'Footer CTA — Name, email, phone, insurance carrier, preferred time',
      ],
      formFields: ['Full name', 'Email', 'Phone', 'Insurance provider', 'Preferred time'],
    },
    emails: [
      { day: 0, subject: 'Your $89 appointment is confirmed!', preview: 'Welcome to {practice} — here\'s everything you need…', body: 'Thank you for choosing {practice}! Your new patient special is locked in at just $89. Here\'s what to bring to your first appointment, what to expect, and why our patients never go anywhere else.' },
      { day: 2, subject: '5 things your new dentist wants you to know', preview: 'Make the most of your first appointment…', body: '1. Arrive 10 min early for paperwork. 2. Bring insurance card if applicable. 3. List any medications. 4. Tell us about dental anxiety — we\'re here to help. 5. Everything is included in your $89 fee.' },
      { day: 5, subject: 'Meet the {practice} team', preview: 'Real people. Genuine care.', body: 'We know choosing a new dentist is a big decision. We want you to feel completely comfortable before you walk through our doors. Here\'s a little about our team and what drives our practice.' },
      { day: 10, subject: '"I hadn\'t been to a dentist in 3 years" — Tom\'s story', preview: 'No judgment. Just great care.', body: 'Tom was nervous about his first visit after years away. Here\'s what he said: "I can\'t believe I waited so long. The team was amazing and I felt zero judgment." We hear this more than you\'d think. We\'re here when you\'re ready.' },
      { day: 14, subject: 'Your $89 appointment is still available', preview: 'Don\'t let this slip away…', body: 'Hey {first_name}, I wanted to make sure you didn\'t miss out on the new patient special. We\'re ready to get you scheduled — it takes 30 seconds.' },
    ],
    sms: [
      { step: '1', trigger: 'Form submitted', delay: 'Immediate', message: 'Hi {first_name}! {practice} here. We\'d love to get your $89 new patient appointment scheduled. When\'s a good time for a quick call? Or reply with your preferred date/time!' },
      { step: '2', trigger: 'No response', delay: '48 hours', message: 'Still interested in the new patient special at {practice}? We have openings this week. Reply BOOK and we\'ll reach out ASAP, or call {phone}.' },
      { step: '3', trigger: 'Appointment set', delay: '24 hrs before', message: 'Reminder: your appointment at {practice} is tomorrow at {time}. Please bring ID and insurance card. Questions? Reply here. See you soon!' },
    ],
    ads: [
      { variant: 'A — Price anchor', headline: '$89 New Patient Special in {city}', body: 'Complete cleaning, full exam, and X-rays for just $89. No insurance required. Same-week appointments at {practice}. Hundreds of 5-star reviews from your neighbors.', cta: 'Book $89 Appointment' },
      { variant: 'B — Pain point', headline: 'Avoiding the Dentist? We Get It.', body: 'Dental anxiety is real — and so is our commitment to gentle, judgment-free care. New patients get a complete exam, cleaning, and X-rays for just $89. See why {city} loves {practice}.', cta: 'See What We\'re About' },
      { variant: 'C — Convenience', headline: 'Your New Dentist is Closer Than You Think', body: 'Located right in {city}, {practice} offers flexible hours, same-week appointments, and a team that truly cares. $89 new patient special — limited time.', cta: 'Schedule Today' },
    ],
    targeting: {
      age: '22–55', radius: '10 miles',
      interests: ['Health & wellness', 'Dental health', 'Family health'],
      notes: 'Exclude existing patient custom audience. Target homeowners and renters alike.',
    },
  },

  childcare: {
    headline: 'Schedule Your FREE Center Tour Today',
    offer: 'Free guided tour + $200 enrollment discount for new families',
    landingPage: {
      sections: [
        'Hero — Bright classroom/playground photo with enrollment urgency banner',
        'Tour offer — "Free 30-min guided tour — see our program for yourself"',
        'Curriculum highlights — Learning philosophy, age groups served, accreditation',
        'Daily schedule preview — Sample day-in-the-life infographic',
        'Safety & security — Camera system, background checks, CPR-certified staff',
        'Parent testimonials — 3 quotes with child age and photo',
        'Enrollment availability — Open spots by age group',
        'Footer form — Child\'s name, age, parent name, phone, email, desired start date',
      ],
      formFields: ["Child's name", 'Age', 'Parent/guardian name', 'Phone', 'Email', 'Desired start date'],
    },
    emails: [
      { day: 0, subject: 'Your tour request is confirmed!', preview: 'We can\'t wait to meet you and {child_name}…', body: 'Thank you for your interest in {center}! A member of our enrollment team will call within 24 hours to schedule your tour. In the meantime, here\'s a quick overview of what makes our program special.' },
      { day: 2, subject: '7 questions every parent should ask on a childcare tour', preview: 'Make the most of your visit…', body: 'Teacher-to-child ratios, curriculum documentation, outdoor play space, safety protocols, meal program, communication style, and licensing status. We\'re proud to excel in every category — and we welcome every question.' },
      { day: 5, subject: 'A day in the life at {center}', preview: "Here's what {child_name}'s typical day looks like…", body: '7–9am Drop-off & free play. 9–9:30 Morning circle. 9:30–11 Learning centers. 11–11:30 Outdoor play. 11:30–12:30 Lunch. 12:30–2:30 Nap/quiet time. 2:30–4 Enrichment activities. 4–6 Pickup window.' },
      { day: 10, subject: '"The best decision we ever made" — The Johnson Family', preview: 'See what {center} families are saying…', body: '"We toured 6 centers before choosing {center}. The teachers know every child by name and the curriculum actually challenges {child_name}." We\'d love to be your family\'s best decision too.' },
      { day: 14, subject: 'Fall enrollment is filling fast — {child_name}\'s spot is at risk', preview: 'We have limited openings this season…', body: '{first_name}, we\'re entering our busy enrollment period and spots for {child_age} are filling quickly. Can we schedule your tour this week?' },
    ],
    sms: [
      { step: '1', trigger: 'Form submitted', delay: 'Immediate', message: 'Hi {first_name}! {center} here — thanks for your interest! We\'d love to schedule your FREE tour. When works best for your family? Reply with a day/time!' },
      { step: '2', trigger: 'No response', delay: '48 hours', message: 'Hey {first_name}! We have morning and afternoon tour slots available this week. Reply YES and we\'ll find a time that works for you!' },
      { step: '3', trigger: 'Tour scheduled', delay: '24 hrs before', message: 'Can\'t wait to see you tomorrow at {time}! {address}. Feel free to bring {child_name} — we\'d love to meet them. 🌟 Reply here with any questions.' },
    ],
    ads: [
      { variant: 'A — Availability urgency', headline: 'Fall 2026 Enrollment Now Open — Limited Spots', body: '{center} is now accepting applications for Fall. Our [curriculum] program offers [age range]-year-olds a nurturing, enriching environment. Schedule a free tour today.', cta: 'Schedule Free Tour' },
      { variant: 'B — Parent testimonial', headline: '"Best Decision We Ever Made for Our Kids"', body: 'Join hundreds of {city} families who trust {center} for high-quality early childhood education. Licensed, accredited, and passionate about every child\'s success. Free tours available now.', cta: 'Book Your Tour' },
      { variant: 'C — Peace of mind', headline: 'While You\'re at Work, They\'re Thriving', body: "At {center}, your child isn't just in safe hands — they're learning, growing, and building friendships every day. Accepting new enrollments for ages [X]–[X].", cta: 'See Inside Our Center' },
    ],
    targeting: {
      age: '24–40', radius: '8 miles',
      interests: ['Parenting', 'Early childhood education', 'Working parents'],
      notes: 'Parents with children under age 6. Employed (working parents). Proximity to center is key.',
    },
  },

  private_school: {
    headline: 'Schedule Your Enrollment Tour & Open House',
    offer: 'Personalized admissions tour + open house invitation',
    landingPage: {
      sections: [
        'Hero — Campus photography with "Applications Now Open" admissions banner',
        'Differentiators — Academic outcomes, average class size, college placement, extracurriculars',
        'Grade levels + tuition range + financial aid availability',
        'Faculty credentials and student-to-teacher ratios',
        'Upcoming open house dates with RSVP CTA',
        'Alumni spotlight — 2 short outcome stories',
        'Application form — Student name, current grade, applying grade, parent info, preference',
      ],
      formFields: ['Student name', 'Current grade', 'Applying for grade', 'Parent name', 'Email', 'Phone', 'Tour or open house?'],
    },
    emails: [
      { day: 0, subject: 'Thank you for your interest in {school}', preview: 'Your inquiry has been received — here\'s what happens next…', body: 'We\'re delighted to hear from you! An admissions counselor will contact you within 1 business day to discuss your child\'s educational goals and schedule a personalized tour.' },
      { day: 3, subject: 'What makes {school} different', preview: '6 things our families consistently mention…', body: '1. Small class sizes (avg. 14 students). 2. Teachers who know every student by name. 3. Academic excellence without high pressure. 4. Robust arts and athletics. 5. College placement support from grade 9. 6. A community that feels like family.' },
      { day: 7, subject: 'Financial aid: More families qualify than you\'d expect', preview: "Don't let cost be the deciding factor…", body: 'Tuition assistance is available at {school}, and the process is straightforward. Last year, [X]% of our families received some level of financial support. We want the right families in our community.' },
      { day: 12, subject: 'Hear from {school} alumni', preview: '"I credit {school} with where I am today."', body: 'From college admissions to leadership roles, our alumni consistently credit their time at {school} as transformational. Read a few of their stories below.' },
      { day: 18, subject: 'Application deadline is approaching — reserve your spot', preview: 'Spots for [grade] are limited…', body: '{first_name}, spots for the [grade] grade are filling. I\'d love to schedule a tour for your family this week. Just reply to this email or click below.' },
    ],
    sms: [
      { step: '1', trigger: 'Inquiry submitted', delay: 'Immediate', message: 'Hi {first_name}! Thanks for your interest in {school}. Our admissions team will be in touch within 1 business day. Feel free to reply with any questions!' },
      { step: '2', trigger: 'No contact', delay: '72 hours', message: '{first_name}, this is {school} admissions. We\'d love to schedule a personal tour for your family. Reply with your availability this week.' },
      { step: '3', trigger: 'Tour scheduled', delay: '24 hrs before', message: 'Looking forward to your tour tomorrow at {time}! Parking is at {address}. Please allow 60–75 minutes. Bring your student if you\'d like! 🎓' },
    ],
    ads: [
      { variant: 'A — Outcomes focused', headline: '100% College Placement. Small Classes. Real Community.', body: '{school} offers a private education experience unlike any other in {city}. Personalized attention, rigorous academics, and a supportive community from K–12. Now accepting applications.', cta: 'Schedule a Tour' },
      { variant: 'B — Open house', headline: 'Open House: See {school} for Yourself', body: "If you've been curious about private school for your child, there's no better way to understand the difference than a visit. Join us for an upcoming open house — tours and refreshments included.", cta: 'Reserve Your Spot' },
      { variant: 'C — Financial aid', headline: 'Private School May Be More Affordable Than You Think', body: '{school} offers financial aid to qualifying families. Last year, [X]% of students received assistance. Don\'t rule out the best education in {city} without learning what\'s available to you.', cta: 'Explore Financial Aid' },
    ],
    targeting: {
      age: '30–50', radius: '20 miles',
      interests: ['Education', 'Academic achievement', 'College preparation', 'Gifted education'],
      income: '$85,000+',
      notes: 'Parents with school-age children. Broad radius — families will commute for the right school.',
    },
  },

  pediatric: {
    headline: 'Welcoming New Patients — Same-Week Appointments Available',
    offer: 'New patient welcome visit + free developmental screening',
    landingPage: {
      sections: [
        'Hero — Colorful, child-friendly office photo with "Now Accepting New Patients" banner',
        'Ages served — Newborn through teen (or specify)',
        'Insurance accepted + self-pay pricing',
        'What to expect — Easy check-in, no long waits, kid-friendly rooms, gentle approach',
        'Meet the doctors — Friendly headshots + board certifications + years of experience',
        'Google reviews — 4 recent reviews with star ratings',
        'Parent FAQ — Vaccinations, sick visits, telehealth, emergency protocol',
        'Quick-book form — Child name, DOB, parent name, phone, email, insurance',
      ],
      formFields: ["Child's name", 'Date of birth', 'Parent name', 'Phone', 'Email', 'Insurance carrier'],
    },
    emails: [
      { day: 0, subject: 'Welcome to {practice}!', preview: "You're in great hands…", body: "We're so glad to have {child_name} joining the {practice} family! Our team is dedicated to making every visit positive. Here's everything you need to prepare for your first appointment." },
      { day: 2, subject: 'How to prepare your child for their first visit', preview: 'Age-appropriate prep that actually works…', body: 'For toddlers (1–3): Keep it simple and positive — "The doctor helps make sure you\'re healthy!" For preschoolers (3–5): Play doctor at home first. For school-age (6+): Explain the process clearly — no surprises.' },
      { day: 7, subject: 'Your child\'s health checklist by age', preview: 'Are they hitting their milestones?', body: 'Every age has recommended screenings, vaccines, and developmental checkpoints. Here\'s a quick overview of what to expect at each well-child visit, and why staying on schedule matters.' },
      { day: 14, subject: 'Sick visits: When to call, when to come in', preview: 'Save the ER trip. We\'ve got you.', body: 'One of the most stressful parts of parenthood is knowing when something is serious. Our team is here for same-day sick visits, so you don\'t have to rely on urgent care.' },
      { day: 21, subject: 'Is {child_name} due for a well-child visit?', preview: "We want to make sure they're on track…", body: 'Regular well-child visits are one of the most important things you can do for your child\'s long-term health. Click below to book {child_name}\'s next checkup.' },
    ],
    sms: [
      { step: '1', trigger: 'Form submitted', delay: 'Immediate', message: "Hi {first_name}! Welcome to {practice}. Our front desk will call shortly to schedule {child_name}'s first appointment. Questions? Reply here anytime!" },
      { step: '2', trigger: 'No response', delay: '48 hours', message: "Hey {first_name}! We'd love to get {child_name} scheduled. We have new patient openings this week. Call {phone} or reply YES to have us reach out." },
      { step: '3', trigger: 'Appointment set', delay: '24 hrs before', message: "Reminder: {child_name}'s appointment at {practice} is tomorrow at {time}. Please bring insurance card + completed new patient forms. See you soon! 👶" },
    ],
    ads: [
      { variant: 'A — Availability', headline: 'Now Accepting Pediatric Patients in {city}', body: '{practice} is welcoming new patients from newborn through teen. Same-week appointments available. Our kid-friendly office makes every visit a positive experience.', cta: 'Book a New Patient Visit' },
      { variant: 'B — Relationship', headline: 'Your Child Deserves a Doctor Who Knows Their Name', body: "At {practice}, we build real relationships — not rushed appointments. Our team has cared for thousands of {city} families. Currently accepting new patients of all ages.", cta: 'Meet Our Team' },
      { variant: 'C — Frustration', headline: 'Tired of Waiting 6 Weeks for a Sick Visit?', body: '{practice} offers same-day sick appointments and priority scheduling for new patients. If your current pediatrician has a 2-month wait, it\'s time for a change.', cta: 'Switch Today' },
    ],
    targeting: {
      age: '22–42', radius: '12 miles',
      interests: ['Parenting', 'Baby & toddler', 'Child health', 'New parents'],
      notes: 'New parents, parents with children under 18. Recently moved to area is a strong signal.',
    },
  },

  after_school: {
    headline: 'Try It FREE for One Week — No Commitment',
    offer: 'Free trial week — homework help, activities & safe supervision until 6 PM',
    landingPage: {
      sections: [
        'Hero — Kids doing activities with bold headline and free trial badge',
        'Trial offer — "1 full week, completely free — see the difference for yourself"',
        'What\'s included — Homework assistance, snack, organized activities, outdoor time',
        'Hours and pickup — Program hours, flexible pickup, late pickup policy',
        'Staff credentials — Trained educators, background checked, CPR certified',
        'Parent app feature — Daily updates, attendance tracking, messaging',
        'Registration form — Child name, grade, current school, parent contact, desired start',
      ],
      formFields: ["Child's name", 'Grade', 'Current school', 'Parent name', 'Phone', 'Email', 'Desired start date'],
    },
    emails: [
      { day: 0, subject: 'Your FREE trial week is confirmed!', preview: "Here's everything you need to get started…", body: 'Welcome to {program}! We\'re so excited to have {child_name} join us for a free trial week. Here\'s what you need to know before the first day.' },
      { day: 2, subject: "A sneak peek at {child_name}'s first week", preview: "Here's what we have planned…", body: 'Monday — STEM challenge. Tuesday — art project. Wednesday — outdoor games. Thursday — homework focus. Friday — movie/free choice. We make every day worth showing up for.' },
      { day: 5, subject: "How's the trial week going?", preview: 'We want your honest feedback…', body: 'We hope {child_name} has had a great first week! We\'d love to hear how things have gone. Also: enrollment spots are limited and your free trial ends in 2 days.' },
      { day: 7, subject: 'Your trial ends tomorrow — lock in your spot', preview: "We'd love to keep {child_name} with us…", body: '{first_name}, we\'ve loved having {child_name} with us this week! We\'d hate for them to lose their spot. Enrollment is easy — click below to continue.' },
      { day: 14, subject: 'Is there anything holding you back?', preview: "I want to make sure this is the right fit…", body: 'I noticed {child_name} hasn\'t re-enrolled yet and wanted to check in personally. If there\'s anything about our program, pricing, or scheduling that isn\'t working, I\'d love to talk through it.' },
    ],
    sms: [
      { step: '1', trigger: 'Registration submitted', delay: 'Immediate', message: "Hi {first_name}! {program} here. Your FREE trial week is all set! {child_name} starts {start_date}. Drop-off is at {address} from {time}. Questions? Text us anytime!" },
      { step: '2', trigger: 'Day 1 complete', delay: 'End of first day', message: "{child_name} had a great first day at {program}! 🎉 They worked on {activity} and made new friends. See you tomorrow!" },
      { step: '3', trigger: 'Trial ending', delay: 'Day 5 of trial', message: "{first_name}, {child_name}'s free trial week wraps up tomorrow! Loved having them. Want to continue? Reply ENROLL and we'll set everything up today. 😊" },
    ],
    ads: [
      { variant: 'A — Free trial', headline: 'After-School Care in {city} — First Week FREE', body: '{program} gives your child a safe, enriching place to be after school until 6 PM. Homework help, activities, snack, and supervision from trained educators. First week free — no commitment.', cta: 'Claim Free Trial Week' },
      { variant: 'B — Working parent', headline: 'The After-School Gap Is Real. We Solve It.', body: "School ends at 3. Work ends at 5:30. {program} bridges that gap with homework assistance, activities, and genuine care for your child until you pick them up.", cta: 'See Program Details' },
      { variant: 'C — Academic', headline: 'Kids Leave {program} With Their Homework Done', body: 'Our structured homework hour means no more homework battles at home. Add enrichment activities, outdoor play, and a daily snack — and you\'ve got after-school that parents and kids both love.', cta: 'Start Free Trial' },
    ],
    targeting: {
      age: '25–45', radius: '8 miles',
      interests: ['Working parents', 'Parenting', 'Child education', 'Elementary school'],
      notes: 'Parents of children ages 5–13. Employed full-time. School proximity targeting recommended.',
    },
  },

  party_venue: {
    headline: 'Book Your FREE Venue Tour & Get a Custom Quote',
    offer: 'Free 30-min tour + same-day custom event quote',
    landingPage: {
      sections: [
        'Hero — Stunning event gallery slideshow with bold headline',
        'Event types — Birthday parties, quinceañeras, sweet 16s, graduations, corporate events',
        'Capacity and amenities — Square footage, max guests, catering, A/V, décor options',
        'Packages and pricing — Starting price range, what\'s included, add-on menu',
        'Availability calendar — Live calendar embed or "check availability" CTA',
        'Recent events gallery — 6 photos from real events with event type labels',
        'Testimonials — 3 event reviews with event type and guest count',
        'Quote form — Event type, date, guest count, name, phone, email, budget range',
      ],
      formFields: ['Event type', 'Preferred date', 'Guest count', 'Your name', 'Phone', 'Email', 'Budget range'],
    },
    emails: [
      { day: 0, subject: 'Your venue inquiry has been received!', preview: "We'll be in touch within 24 hours…", body: "Thanks for reaching out to {venue}! We've received your inquiry and are excited to help you plan your event. A member of our events team will contact you within 24 hours with availability and pricing." },
      { day: 1, subject: 'Your custom quote from {venue}', preview: "Here's what we can do for your {event_type}…", body: 'Based on your inquiry, here\'s a quick overview: Capacity up to {capacity} guests. Your date appears to be available. Starting packages from {price}. Would you like to schedule a tour this week?' },
      { day: 4, subject: '{venue} is available on your date — here\'s what to do next', preview: 'Dates fill up fast, especially on weekends…', body: 'Great news — {event_date} is still available on our calendar! However, we get multiple inquiries for popular dates, and availability is first-come, first-served. Here\'s how to reserve.' },
      { day: 8, subject: 'Behind the scenes at {venue}', preview: 'See what makes our events so special…', body: 'We thought you\'d love to see what goes into a {venue} event. From setup to breakdown, our events team handles every detail so you can focus on celebrating.' },
      { day: 14, subject: 'Your date may not be available much longer', preview: "We want to make sure you don't miss out…", body: "{first_name}, {event_date} is still showing as available, but we've had recent interest for that time slot. A small deposit holds your date. Reply or call us at {phone}." },
    ],
    sms: [
      { step: '1', trigger: 'Inquiry submitted', delay: 'Immediate', message: "Hi {first_name}! {venue} here — thanks for your inquiry! We'd love to schedule a quick tour. What does your availability look like this week? Reply here or call {phone}." },
      { step: '2', trigger: 'No response', delay: '48 hours', message: "{first_name}, your event date {event_date} is still available at {venue}! Want a tour or quick call to discuss pricing? Reply YES and we'll reach out ASAP." },
      { step: '3', trigger: 'Tour scheduled', delay: '24 hrs before', message: "Looking forward to showing you around {venue} tomorrow at {time}! Enter through the main entrance on {street}. Tour takes about 30 minutes. See you then! 🎉" },
    ],
    ads: [
      { variant: 'A — Gallery showcase', headline: 'The Most Stunning Events in {city} Happen Here', body: 'From intimate birthday parties to 200-person celebrations, {venue} sets the stage for unforgettable memories. Now booking for 2026. Get a free quote and tour today.', cta: 'Get Free Quote' },
      { variant: 'B — Stress-free', headline: "Planning a Party Shouldn't Be This Stressful", body: "{venue}'s all-inclusive packages take the guesswork out of event planning. Tables, chairs, décor, catering coordination — we handle it all. You just show up and celebrate.", cta: 'Book a Free Tour' },
      { variant: 'C — Urgency', headline: '{month} Weekend Dates Are Booking Fast in {city}', body: "If you're planning an event in the next 90 days, now is the time to check availability at {venue}. We have a limited number of weekend dates remaining.", cta: 'Check Availability' },
    ],
    targeting: {
      age: '25–55', radius: '25 miles',
      interests: ['Event planning', 'Party planning', 'Quinceañera planning', 'Celebrations'],
      notes: 'Life events targeting: recently engaged, expecting, birthday approaching. Parents of teens.',
    },
  },

  hvac: {
    headline: 'FREE System Check + $50 Off Your Next Service',
    offer: 'Free 20-point HVAC inspection + $50 service coupon',
    landingPage: {
      sections: [
        'Hero — Uniformed technician with headline and "Same-Day Service Available" badge',
        'Offer — FREE 20-point system inspection + $50 coupon valid for 30 days',
        'Services — AC repair, furnace service, new installations, annual maintenance plans',
        'Urgency hook — Energy savings stat + "don\'t wait until it breaks"',
        'Trust signals — Licensed, insured, years in business, manufacturer certifications',
        'Google reviews — Star rating + 4 recent reviews with specific job types',
        'Service area — Map or ZIP code checker',
        'Lead form — Name, phone, email, address, system type, issue description, preferred time',
      ],
      formFields: ['Full name', 'Phone', 'Email', 'Service address', 'System type', 'Issue description', 'Preferred time'],
    },
    emails: [
      { day: 0, subject: 'Your free system check is confirmed!', preview: 'What to expect from your appointment…', body: "Thanks for reaching out to {company}! We've received your request for a free system inspection. A technician will contact you within 4 hours to confirm your appointment window. Here's what your free 20-point check covers." },
      { day: 1, subject: '5 signs your HVAC system is costing you money', preview: 'Are you paying too much on energy bills?', body: 'An inefficient HVAC system can add 20–30% to your monthly energy bill. Here are 5 signs it\'s time for a tune-up: 1. Uneven temps by room. 2. System runs constantly. 3. Unusual noises/smells. 4. Bills higher than last year. 5. System is 10+ years old.' },
      { day: 4, subject: 'Your $50 coupon is expiring soon', preview: "Don't let this go to waste…", body: '{first_name}, the $50 coupon from your free inspection offer expires in 10 days. It applies to any service — routine maintenance, a repair, or a new system consultation.' },
      { day: 10, subject: 'Before the [season] [heat/cold] hits {city}…', preview: 'Is your system ready?', body: "[Season] in {city} means [hot/cold] weather is coming fast. The worst time to find out your system isn't working is when you need it most. Schedule a pre-season tune-up now while we have availability." },
      { day: 20, subject: 'Special offer: maintenance plan enrollment', preview: 'Save up to $300/year with our plan…', body: 'Our annual maintenance plan members get: 2 tune-ups per year, priority emergency service, 15% off all repairs, and peace of mind all year long. {first_name}, I\'d love to set this up for your home.' },
    ],
    sms: [
      { step: '1', trigger: 'Lead form submitted', delay: 'Immediate', message: "Hi {first_name}! {company} here. Got your request for a free system check! A technician will call within the hour to confirm your slot. Questions? Reply here or call {phone}." },
      { step: '2', trigger: 'No call response', delay: '2 hours', message: "{first_name}, we tried to reach you about your free HVAC inspection. We have an opening {today/tomorrow} between {time_range}. Reply YES to claim it, or call {phone}." },
      { step: '3', trigger: 'Appointment confirmed', delay: '1 hr before', message: "Heads up — your {company} technician is on the way! Expected arrival: {time_window}. They'll have ID and company uniform. Reply here if you need to reschedule." },
    ],
    ads: [
      { variant: 'A — Free offer', headline: 'FREE HVAC Inspection for {city} Homeowners', body: '{company} is offering a complimentary 20-point HVAC inspection. Catch problems early, improve efficiency, and get $50 off your first service. Same-week appointments available.', cta: 'Claim Free Inspection' },
      { variant: 'B — Seasonal urgency', headline: 'Is Your System Ready for [Season]?', body: "Don't find out the hard way. Get your system checked by licensed professionals at {company} before peak season. Free inspection + $50 off your first service. {city}-based, locally owned, fully insured.", cta: 'Schedule Free Check' },
      { variant: 'C — Emergency / trust', headline: 'HVAC Emergency? {company} is Available Today', body: 'When your system goes down, you need someone fast and trustworthy. {company} has served {city} homeowners for [X] years — same-day service, licensed techs, upfront pricing.', cta: 'Get Same-Day Service' },
    ],
    targeting: {
      age: '28–65', radius: '20 miles',
      interests: ['Home improvement', 'Homeownership', 'Energy savings', 'Home maintenance'],
      notes: 'Homeowners only. Seasonal timing matters — run AC campaigns in spring, furnace in fall.',
    },
  },

  other: {
    headline: 'Get Your FREE Consultation Today',
    offer: 'Free consultation — limited availability this month',
    landingPage: {
      sections: [
        'Hero — Business photo with clear value proposition and availability urgency',
        'Primary offer — Clear description of the free/low-barrier lead magnet',
        'Key benefits — 3–4 bullet points on what prospects receive',
        'Social proof — Reviews, credentials, years in business, certifications',
        'Process steps — How it works in 3 simple steps',
        'FAQ — 5 common questions and honest answers',
        'Lead form — Name, email, phone, one qualifying question',
      ],
      formFields: ['Full name', 'Email', 'Phone', 'How can we help you?'],
    },
    emails: [
      { day: 0, subject: 'Thanks for reaching out to {business}!', preview: "Here's what happens next…", body: "Hi {first_name}, we've received your request and are excited to help. A team member will follow up within 1 business day. In the meantime, here's a bit about what makes {business} different." },
      { day: 2, subject: 'More about {business}', preview: 'What you should know before we talk…', body: 'Before our conversation, we wanted to share a little more about who we are and how we work. [Business description, key differentiators, team info, social proof]' },
      { day: 5, subject: 'Client story: How we helped [client type] achieve [outcome]', preview: 'A real example from a real client…', body: "Here's a recent example of the kind of results we achieve for our clients: [Client story/case study]. We'd love to do the same for you." },
      { day: 10, subject: 'Your questions, answered', preview: 'Our most common FAQs…', body: 'Here are the questions we hear most often: [FAQ 1] [FAQ 2] [FAQ 3] [FAQ 4]. Still have questions? Reply to this email and I\'ll personally respond.' },
      { day: 14, subject: 'Still interested in learning more?', preview: "Let's find a time that works for you…", body: "{first_name}, I wanted to check in one more time. If you're still interested in [service/offer], I'd love to schedule a quick conversation. Click below to find a time that works." },
    ],
    sms: [
      { step: '1', trigger: 'Form submitted', delay: 'Immediate', message: "Hi {first_name}! {business} here — thanks for reaching out! A team member will call you within 1 business day. Questions? Reply here anytime!" },
      { step: '2', trigger: 'No response', delay: '48 hours', message: "{first_name}, we'd love to connect with you about {offer}. Still interested? Reply YES and we'll reach out right away!" },
      { step: '3', trigger: 'Appointment set', delay: '24 hrs before', message: 'Reminder: Your appointment with {business} is tomorrow at {time}. Reply CONFIRM or call {phone} if you need to reschedule. Looking forward to talking!' },
    ],
    ads: [
      { variant: 'A — Offer focused', headline: 'Free Consultation for {city} Residents', body: '{business} is offering a complimentary consultation to qualified {city} residents. Learn how we can help you [achieve outcome]. Limited appointments available this month.', cta: 'Book Free Consultation' },
      { variant: 'B — Problem / solution', headline: 'Struggling With [Problem]? We Can Help.', body: '{city} residents trust {business} to [solve problem / deliver outcome]. Proven results, friendly team, and a free initial consultation to see if we\'re the right fit.', cta: 'Get Started Free' },
      { variant: 'C — Social proof', headline: '[X] Happy Clients in {city} Can\'t Be Wrong', body: 'Join hundreds of {city} residents who\'ve experienced the {business} difference. We offer [service] with a focus on [differentiator]. Free consultation available now.', cta: 'See What Others Say' },
    ],
    targeting: {
      age: '25–55', radius: '15 miles',
      interests: ['[Customize to your business type]'],
      notes: 'Customize interests, age range, and radius based on your specific audience and offer.',
    },
  },
}

// ── Mock data (shown when Supabase is not configured) ─────────────────────────

const MOCK_CLIENTS: MarketingClient[] = [
  {
    id: 'mock-1',
    businessName: 'Bright Smiles Orthodontics',
    industry: 'orthodontist',
    primaryOffer: 'Free smile consultation',
    targetAudience: 'Parents of children ages 6–16',
    serviceAreaZips: ['36117', '36116', '36106'],
    ghlAccountId: 'ghl_demo_001',
    metaAdAccountId: null,
    landingPageUrl: 'https://brightsmiles.pages.dev/landing',
    trialStartedAt: new Date(Date.now() - 12 * 864e5).toISOString(),
    trialConvertedAt: null,
    status: 'trial',
    leadCountThisMonth: 18,
    metaSpendThisMonth: 485,
    costPerLead: 26.94,
    lastReportDate: null,
    lastReportSent: false,
    lastReportId: null,
  },
  {
    id: 'mock-2',
    businessName: 'Little Stars Childcare',
    industry: 'childcare',
    primaryOffer: 'Free tour + $200 enrollment discount',
    targetAudience: 'Working parents with children under 6',
    serviceAreaZips: ['36117', '36118'],
    ghlAccountId: 'ghl_demo_002',
    metaAdAccountId: 'act_demo_002',
    landingPageUrl: 'https://littlestars.pages.dev/landing',
    trialStartedAt: new Date(Date.now() - 45 * 864e5).toISOString(),
    trialConvertedAt: new Date(Date.now() - 15 * 864e5).toISOString(),
    status: 'active',
    leadCountThisMonth: 31,
    metaSpendThisMonth: 620,
    costPerLead: 20.0,
    lastReportDate: new Date(Date.now() - 7 * 864e5).toISOString(),
    lastReportSent: true,
    lastReportId: 'rep-mock-2',
  },
  {
    id: 'mock-3',
    businessName: 'Comfort Air HVAC',
    industry: 'hvac',
    primaryOffer: 'Free 20-point system check + $50 off',
    targetAudience: 'Homeowners in service area',
    serviceAreaZips: ['36104', '36105', '36107'],
    ghlAccountId: null,
    metaAdAccountId: null,
    landingPageUrl: null,
    trialStartedAt: new Date(Date.now() - 5 * 864e5).toISOString(),
    trialConvertedAt: null,
    status: 'trial',
    leadCountThisMonth: 4,
    metaSpendThisMonth: 0,
    costPerLead: null,
    lastReportDate: null,
    lastReportSent: false,
    lastReportId: null,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function trialDaysRemaining(startedAt: string): number {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 864e5)
  return Math.max(0, 30 - elapsed)
}

function trialDaysUsed(startedAt: string): number {
  return Math.min(30, Math.floor((Date.now() - new Date(startedAt).getTime()) / 864e5))
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls = 'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400'
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

// ── Main component ────────────────────────────────────────────────────────────

export function MarketingSystemClient() {
  const [tab, setTab]                           = useState<Tab>('dashboard')
  const [clients, setClients]                   = useState<MarketingClient[]>([])
  const [loading, setLoading]                   = useState(true)
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>('orthodontist')
  const [expandedSection, setExpandedSection]   = useState<string | null>('landingPage')
  const [expandedEmail, setExpandedEmail]       = useState<number | null>(null)
  const [copiedId, setCopiedId]                 = useState<string | null>(null)

  const [form, setForm] = useState({
    businessName: '', industry: '' as Industry | '',
    primaryOffer: '', targetAudience: '',
    serviceAreaZips: '', ghlAccountId: '',
    metaAdAccountId: '', landingPageUrl: '',
  })
  const [submitting, setSubmitting]   = useState(false)
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)

  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [sendingFor, setSendingFor]       = useState<string | null>(null)
  const [convertingFor, setConvertingFor] = useState<string | null>(null)

  // ── Load clients ────────────────────────────────────────────────────────────

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/clients')
      if (!res.ok) throw new Error('Not configured')
      const data = await res.json()
      if (Array.isArray(data)) setClients(data)
      else setClients(MOCK_CLIENTS)
    } catch {
      setClients(MOCK_CLIENTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.businessName || !form.industry) return
    setSubmitting(true)
    try {
      const zips = form.serviceAreaZips.split(',').map(z => z.trim()).filter(Boolean)
      const res = await fetch('/api/marketing/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, serviceAreaZips: zips }),
      })
      if (!res.ok) throw new Error('Failed')
      setSubmitResult('success')
      setForm({ businessName: '', industry: '', primaryOffer: '', targetAudience: '', serviceAreaZips: '', ghlAccountId: '', metaAdAccountId: '', landingPageUrl: '' })
      loadClients()
    } catch {
      setSubmitResult('error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateReport = async (clientId: string) => {
    setGeneratingFor(clientId)
    try {
      const res = await fetch('/api/marketing/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', clientId }),
      })
      if (res.ok) await loadClients()
    } finally {
      setGeneratingFor(null)
    }
  }

  const handleSendReport = async (reportId: string) => {
    setSendingFor(reportId)
    try {
      const res = await fetch('/api/marketing/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', reportId }),
      })
      if (res.ok) await loadClients()
    } finally {
      setSendingFor(null)
    }
  }

  const handleConvertTrial = async (clientId: string) => {
    setConvertingFor(clientId)
    try {
      const res = await fetch('/api/marketing/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert_trial', clientId }),
      })
      if (res.ok) await loadClients()
    } finally {
      setConvertingFor(null)
    }
  }

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // ── Derived stats ───────────────────────────────────────────────────────────

  const totalLeads     = clients.reduce((s, c) => s + c.leadCountThisMonth, 0)
  const totalSpend     = clients.reduce((s, c) => s + c.metaSpendThisMonth, 0)
  const trialClients   = clients.filter(c => c.status === 'trial')
  const activeClients  = clients.filter(c => c.status === 'active')
  const tpl            = TEMPLATES[selectedIndustry]

  // ── Render: header + tab nav ────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard',  icon: BarChart2 },
    { id: 'onboard',   label: 'New Client', icon: Plus },
    { id: 'templates', label: 'Templates',  icon: FileText },
    { id: 'reports',   label: 'Reports',    icon: Send },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#f4f5f7]">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone size={20} className="text-blue-600" />
            Marketing System
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Done-for-you lead generation — landing pages, nurture sequences, Meta ads</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            GHL + Meta integration — configure in Settings
          </div>
          <button
            onClick={() => { setTab('onboard') }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> New Client
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ─── DASHBOARD ────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div className="p-6 space-y-6">

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Clients',      value: clients.length,       icon: Users,      color: 'text-blue-600',  bg: 'bg-blue-50'  },
                { label: 'Active Trials',       value: trialClients.length,  icon: Clock,      color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Leads This Month',    value: totalLeads,           icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Total Ad Spend',      value: formatCurrency(totalSpend), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
                    <s.icon size={18} className={s.color} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Deployment dashboard table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Deployment Dashboard</h2>
                <button onClick={loadClients} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
              {loading ? (
                <div className="px-5 py-8 text-sm text-gray-400 text-center">Loading clients…</div>
              ) : clients.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Megaphone size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No marketing system clients yet.</p>
                  <button onClick={() => setTab('onboard')} className="mt-3 text-xs text-blue-600 hover:underline">Onboard your first client →</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Business', 'Industry', 'Landing Page', 'Leads / Mo', 'Meta Spend', 'CPL', 'Status', 'Last Report', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clients.map(c => {
                        const daysLeft = trialDaysRemaining(c.trialStartedAt)
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{c.businessName}</td>
                            <td className="px-4 py-3">
                              <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium ring-1', INDUSTRY_COLOR[c.industry])}>
                                {INDUSTRY_OPTIONS.find(o => o.value === c.industry)?.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {c.landingPageUrl ? (
                                <a href={c.landingPageUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:underline">
                                  <Globe size={11} /> View
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Not deployed</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-gray-900">{c.leadCountThisMonth}</span>
                              {c.ghlAccountId && <span className="ml-1 text-[10px] text-green-600">GHL</span>}
                            </td>
                            <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-gold-600)' }}>
                              {c.metaSpendThisMonth > 0 ? formatCurrency(c.metaSpendThisMonth) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {c.costPerLead ? formatCurrency(c.costPerLead) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {c.status === 'trial' ? (
                                <span className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1',
                                  daysLeft <= 5 ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
                                )}>
                                  <Clock size={9} /> {daysLeft}d left
                                </span>
                              ) : c.status === 'active' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 bg-green-50 text-green-700 ring-green-200">
                                  <CheckCircle2 size={9} /> Active
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 bg-gray-50 text-gray-500 ring-gray-200">
                                  {c.status}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {c.lastReportDate ? (
                                <span className={c.lastReportSent ? 'text-green-700' : ''}>
                                  {fmtDate(c.lastReportDate)}
                                  {c.lastReportSent && <span className="ml-1 text-[10px]">✓ Sent</span>}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {!c.lastReportDate || !c.lastReportSent ? (
                                  <button
                                    disabled={!!generatingFor}
                                    onClick={() => c.lastReportDate && !c.lastReportSent && c.lastReportId
                                      ? handleSendReport(c.lastReportId)
                                      : handleGenerateReport(c.id)}
                                    className="px-2 py-1 text-[11px] font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {generatingFor === c.id ? <RefreshCw size={10} className="animate-spin" /> : <FileText size={10} />}
                                    {c.lastReportDate && !c.lastReportSent ? 'Send' : 'Generate'}
                                  </button>
                                ) : null}
                                {c.status === 'trial' && (
                                  <button
                                    disabled={convertingFor === c.id}
                                    onClick={() => handleConvertTrial(c.id)}
                                    className="px-2 py-1 text-[11px] font-medium text-green-700 border border-green-300 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50"
                                  >
                                    {convertingFor === c.id ? '…' : '→ Paid'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Trial tracker */}
            {trialClients.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">30-Day Trial Tracker</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {trialClients.map(c => {
                    const used    = trialDaysUsed(c.trialStartedAt)
                    const left    = trialDaysRemaining(c.trialStartedAt)
                    const pct     = (used / 30) * 100
                    const urgent  = left <= 5
                    return (
                      <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{c.businessName}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Started {fmtDate(c.trialStartedAt)}
                            </div>
                          </div>
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[11px] font-medium ring-1',
                            urgent ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
                          )}>
                            {left === 0 ? 'Expired' : `${left} days left`}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                            <span>Day {used} of 30</span>
                            <span>{Math.round(pct)}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', urgent ? 'bg-red-500' : 'bg-amber-400')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <div className="text-base font-bold text-gray-900">{c.leadCountThisMonth}</div>
                            <div className="text-[10px] text-gray-500">Leads Generated</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <div className="text-base font-bold" style={{ color: 'var(--color-gold-600)' }}>
                              {c.costPerLead ? formatCurrency(c.costPerLead) : '—'}
                            </div>
                            <div className="text-[10px] text-gray-500">Cost Per Lead</div>
                          </div>
                        </div>

                        <button
                          disabled={convertingFor === c.id}
                          onClick={() => handleConvertTrial(c.id)}
                          className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {convertingFor === c.id
                            ? <RefreshCw size={11} className="animate-spin" />
                            : <CheckCircle2 size={11} />}
                          Convert to Paid Client
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Active clients summary */}
            {activeClients.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Active Paid Clients</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {activeClients.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{c.businessName}</div>
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 mt-1 inline-block', INDUSTRY_COLOR[c.industry])}>
                            {INDUSTRY_OPTIONS.find(o => o.value === c.industry)?.label}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 bg-green-50 text-green-700 ring-green-200">
                          <CheckCircle2 size={9} /> Active
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900">{c.leadCountThisMonth}</div>
                          <div className="text-[10px] text-gray-500">Leads</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold" style={{ color: 'var(--color-gold-600)' }}>{formatCurrency(c.metaSpendThisMonth)}</div>
                          <div className="text-[10px] text-gray-500">Spend</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900">{c.costPerLead ? formatCurrency(c.costPerLead) : '—'}</div>
                          <div className="text-[10px] text-gray-500">CPL</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                        <span>Last report: {fmtDate(c.lastReportDate)}</span>
                        {c.lastReportSent
                          ? <span className="text-green-600 flex items-center gap-0.5"><CheckCircle2 size={10} /> Sent</span>
                          : c.lastReportDate
                          ? <button
                              disabled={!!sendingFor}
                              onClick={() => c.lastReportId && handleSendReport(c.lastReportId)}
                              className="text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <Send size={10} /> Send report
                            </button>
                          : <button
                              disabled={!!generatingFor}
                              onClick={() => handleGenerateReport(c.id)}
                              className="text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <FileText size={10} /> Generate
                            </button>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ONBOARD ──────────────────────────────────────────────── */}
        {tab === 'onboard' && (
          <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Onboard New Marketing Client</h2>
                <p className="text-xs text-gray-500 mt-0.5">Starts a 30-day trial. Connect integrations after onboarding.</p>
              </div>

              {submitResult === 'success' ? (
                <div className="px-6 py-10 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" />
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Client onboarded!</h3>
                  <p className="text-sm text-gray-500 mb-4">30-day trial started. Go to Dashboard to configure integrations.</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setTab('dashboard')} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                      View Dashboard →
                    </button>
                    <button onClick={() => setSubmitResult(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      Add Another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                  {submitResult === 'error' && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <AlertCircle size={14} /> Failed to save. Make sure the database schema has been run.
                    </div>
                  )}

                  {/* Business info */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Business Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className={labelCls}>Business Name <span className="text-red-500">*</span></label>
                        <input required value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                          className={inputCls} placeholder="e.g. Bright Smiles Orthodontics" />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Industry <span className="text-red-500">*</span></label>
                        <select required value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value as Industry }))} className={inputCls}>
                          <option value="">Select industry…</option>
                          {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Offer details */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Offer Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>Primary Offer</label>
                        <input value={form.primaryOffer} onChange={e => setForm(f => ({ ...f, primaryOffer: e.target.value }))}
                          className={inputCls} placeholder="e.g. Free smile consultation" />
                      </div>
                      <div>
                        <label className={labelCls}>Target Audience</label>
                        <input value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                          className={inputCls} placeholder="e.g. Parents of children ages 6–16" />
                      </div>
                      <div>
                        <label className={labelCls}>Service Area ZIP Codes</label>
                        <input value={form.serviceAreaZips} onChange={e => setForm(f => ({ ...f, serviceAreaZips: e.target.value }))}
                          className={inputCls} placeholder="36117, 36116, 36106 (comma-separated)" />
                      </div>
                    </div>
                  </div>

                  {/* Integrations */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Integrations (optional)</h3>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>GHL Account ID</label>
                        <input value={form.ghlAccountId} onChange={e => setForm(f => ({ ...f, ghlAccountId: e.target.value }))}
                          className={inputCls} placeholder="GoHighLevel account or sub-account ID" />
                      </div>
                      <div>
                        <label className={labelCls}>Meta Ad Account ID</label>
                        <input value={form.metaAdAccountId} onChange={e => setForm(f => ({ ...f, metaAdAccountId: e.target.value }))}
                          className={inputCls} placeholder="act_123456789" />
                      </div>
                      <div>
                        <label className={labelCls}>Landing Page URL</label>
                        <input type="url" value={form.landingPageUrl} onChange={e => setForm(f => ({ ...f, landingPageUrl: e.target.value }))}
                          className={inputCls} placeholder="https://…" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={submitting || !form.businessName || !form.industry}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                      Start 30-Day Trial
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Tip */}
            {form.industry && TEMPLATES[form.industry as Industry] && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                  <FileText size={12} /> Template available for {INDUSTRY_OPTIONS.find(o => o.value === form.industry)?.label}
                </div>
                <p className="text-xs text-blue-700">
                  Headline: <strong>&ldquo;{TEMPLATES[form.industry as Industry].headline}&rdquo;</strong> —
                  visit the Templates tab to see the full landing page, email sequence, SMS workflow, and Meta ad copy.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── TEMPLATES ────────────────────────────────────────────── */}
        {tab === 'templates' && (
          <div className="p-6">

            {/* Industry selector */}
            <div className="flex flex-wrap gap-2 mb-5">
              {INDUSTRY_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => { setSelectedIndustry(o.value); setExpandedSection('landingPage'); setExpandedEmail(null) }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                    selectedIndustry === o.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">

              {/* Template header */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 mb-2', INDUSTRY_COLOR[selectedIndustry])}>
                      {INDUSTRY_OPTIONS.find(o => o.value === selectedIndustry)?.label}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{tpl.headline}</h2>
                    <p className="text-sm text-gray-500 mt-1">{tpl.offer}</p>
                  </div>
                </div>
              </div>

              {/* Landing page layout */}
              <TemplateSection
                id="landingPage"
                title="Landing Page Layout"
                icon={Globe}
                expanded={expandedSection === 'landingPage'}
                onToggle={() => setExpandedSection(expandedSection === 'landingPage' ? null : 'landingPage')}
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Page Sections</div>
                    <div className="space-y-1.5">
                      {tpl.landingPage.sections.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Form Fields</div>
                    <div className="flex flex-wrap gap-2">
                      {tpl.landingPage.formFields.map((f, i) => (
                        <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </TemplateSection>

              {/* Email sequence */}
              <TemplateSection
                id="emails"
                title="5-Email Nurture Sequence"
                icon={Mail}
                expanded={expandedSection === 'emails'}
                onToggle={() => setExpandedSection(expandedSection === 'emails' ? null : 'emails')}
              >
                <div className="space-y-2">
                  {tpl.emails.map((email, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedEmail(expandedEmail === i ? null : i)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{email.subject}</div>
                          <div className="text-xs text-gray-500 truncate">{email.preview}</div>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 mr-2">Day {email.day}</span>
                        {expandedEmail === i ? <ChevronDown size={13} className="shrink-0 text-gray-400" /> : <ChevronRight size={13} className="shrink-0 text-gray-400" />}
                      </button>
                      {expandedEmail === i && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="mt-3 bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                              <span>Send on Day {email.day}</span>
                              <button onClick={() => copyText(email.body, `email-${i}`)} className="flex items-center gap-1 text-blue-600 hover:underline">
                                <Copy size={11} /> {copiedId === `email-${i}` ? 'Copied!' : 'Copy body'}
                              </button>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{email.body}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TemplateSection>

              {/* SMS workflow */}
              <TemplateSection
                id="sms"
                title="SMS Workflow"
                icon={MessageSquare}
                expanded={expandedSection === 'sms'}
                onToggle={() => setExpandedSection(expandedSection === 'sms' ? null : 'sms')}
              >
                <div className="space-y-3">
                  {tpl.sms.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">{step.step}</div>
                        {i < tpl.sms.length - 1 && <div className="w-px flex-1 bg-green-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-gray-700">{step.trigger}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{step.delay}</span>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-gray-700 relative">
                          {step.message}
                          <button
                            onClick={() => copyText(step.message, `sms-${i}`)}
                            className="absolute top-2 right-2 text-[10px] text-green-700 hover:underline flex items-center gap-0.5"
                          >
                            <Copy size={10} /> {copiedId === `sms-${i}` ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TemplateSection>

              {/* Meta ad copy */}
              <TemplateSection
                id="ads"
                title="Meta Ad Copy — 3 Variants"
                icon={Megaphone}
                expanded={expandedSection === 'ads'}
                onToggle={() => setExpandedSection(expandedSection === 'ads' ? null : 'ads')}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {tpl.ads.map((ad, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{ad.variant}</div>
                      <div className="text-sm font-bold text-gray-900">{ad.headline}</div>
                      <p className="text-xs text-gray-600 leading-relaxed">{ad.body}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-semibold rounded-md">{ad.cta}</span>
                        <button onClick={() => copyText(`Headline: ${ad.headline}\n\n${ad.body}\n\nCTA: ${ad.cta}`, `ad-${i}`)}
                          className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                          <Copy size={11} /> {copiedId === `ad-${i}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </TemplateSection>

              {/* Targeting */}
              <TemplateSection
                id="targeting"
                title="Suggested Targeting Parameters"
                icon={Target}
                expanded={expandedSection === 'targeting'}
                onToggle={() => setExpandedSection(expandedSection === 'targeting' ? null : 'targeting')}
              >
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: 'Age Range', value: tpl.targeting.age },
                    { label: 'Radius', value: tpl.targeting.radius },
                    ...(tpl.targeting.income ? [{ label: 'Min. HH Income', value: tpl.targeting.income }] : []),
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{item.label}</div>
                      <div className="text-sm font-semibold text-gray-900">{item.value}</div>
                    </div>
                  ))}
                  <div className="col-span-2 md:col-span-4 bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Interests</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.targeting.interests.map((int, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-xs text-gray-700 rounded-full">{int}</span>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1">Notes</div>
                    <p className="text-xs text-blue-800">{tpl.targeting.notes}</p>
                  </div>
                </div>
              </TemplateSection>

            </div>
          </div>
        )}

        {/* ─── REPORTS ──────────────────────────────────────────────── */}
        {tab === 'reports' && (
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <strong>Auto-report generator:</strong> Reports are generated as performance snapshots from the current month&apos;s GHL lead data and Meta ad spend. Connect integrations in Settings to enable live sync. Until then, you can manually update performance data and generate reports for any client.
              </div>
            </div>

            {clients.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center">
                <FileText size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No clients yet — onboard a client to generate reports.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Performance Reports</h2>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Client', 'Industry', 'Leads / Mo', 'Meta Spend', 'CPL', 'Report Status', 'Last Generated', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clients.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{c.businessName}</td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium ring-1', INDUSTRY_COLOR[c.industry])}>
                            {INDUSTRY_OPTIONS.find(o => o.value === c.industry)?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{c.leadCountThisMonth}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-gold-600)' }}>
                          {c.metaSpendThisMonth > 0 ? formatCurrency(c.metaSpendThisMonth) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{c.costPerLead ? formatCurrency(c.costPerLead) : '—'}</td>
                        <td className="px-4 py-3">
                          {!c.lastReportDate ? (
                            <span className="text-gray-400 italic">Not generated</span>
                          ) : c.lastReportSent ? (
                            <span className="flex items-center gap-1 text-green-700">
                              <CheckCircle2 size={11} /> Sent {fmtDate(c.lastReportDate)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-700">
                              <Clock size={11} /> Generated — awaiting send
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(c.lastReportDate)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={generatingFor === c.id}
                              onClick={() => handleGenerateReport(c.id)}
                              className="px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {generatingFor === c.id
                                ? <RefreshCw size={10} className="animate-spin" />
                                : <FileText size={10} />}
                              Generate
                            </button>
                            {c.lastReportDate && !c.lastReportSent && c.lastReportId && (
                              <button
                                disabled={sendingFor === c.lastReportId}
                                onClick={() => handleSendReport(c.lastReportId!)}
                                className="px-2.5 py-1 text-[11px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {sendingFor === c.lastReportId
                                  ? <RefreshCw size={10} className="animate-spin" />
                                  : <Send size={10} />}
                                Mark Sent
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Sub-component: collapsible template section ───────────────────────────────

function TemplateSection({
  id, title, icon: Icon, expanded, onToggle, children,
}: {
  id: string
  title: string
  icon: React.ElementType
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-blue-600" />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-900">{title}</span>
        {expanded
          ? <ChevronDown size={15} className="text-gray-400 shrink-0" />
          : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}
