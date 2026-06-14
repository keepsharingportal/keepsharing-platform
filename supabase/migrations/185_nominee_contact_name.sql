-- ── Distinguish nominee (subject) from contact (who-we-email) ────────────────
--
-- For nominations where the nominee can be a MINOR (Play Ball
-- athletes, Student Spotlight), the kid is the subject of the
-- article but the contact info we collect is the PARENT or
-- GUARDIAN. The same split applies for business-spotlight nominations
-- (Parent Picks) — the business is the subject, the email goes to a
-- contact person at the business.
--
-- nominee_name           = WHO is being featured  (athlete / student / business)
-- nominee_contact_name   = WHO we reach out to    (parent / guardian / biz contact)
-- nominee_email/phone    = contact's email/phone  (already-existing columns)
--
-- For self-nomination types (teacher, mom-to-mom, grands), the
-- contact IS the nominee — nominee_contact_name stays NULL and the
-- outreach API falls back to nominee_name's first name for the
-- greeting.

ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS nominee_contact_name TEXT;

COMMENT ON COLUMN community_submissions.nominee_contact_name IS
  'Name of the parent/guardian/business-contact who receives the outreach email. NULL when the contact = nominee (self-nomination types).';


-- ── Refresh outreach email templates ─────────────────────────────────────────
--
-- Play Ball + Student Spotlight previously addressed the nominee
-- directly ("Hi {{nominee_first}}"). When the nominee is an 8-year-
-- old, that email lands in a parent's inbox saying "Hi Marcus" which
-- is confusing and unprofessional. Switching to {{contact_first}}
-- which the outreach API substitutes from nominee_contact_name (parent)
-- when present, falling back to nominee_name (adult) otherwise.

UPDATE submission_type_columns SET
  outreach_email_subject = '{{subject_name}} was nominated for Play Ball in {{brand_name}}',
  outreach_email_body = '<p>Hi {{contact_first}},</p>

<p><strong>{{nominator_name}}</strong> nominated <strong>{{subject_name}}</strong> for our <strong>Play Ball</strong> feature in {{brand_name}}.</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Play Ball features local youth athletics — players, coaches, and teams whose stories deserve a wider audience. We''d love to feature {{subject_first}}.</p>

<p><strong>How it works:</strong></p>
<ul>
  <li>Reply "we''re in" and we''ll send a short interview form (6 questions, ~10 min). Most parents fill it out with their player.</li>
  <li>You upload 1–3 photos (action shot + portrait ideal)</li>
  <li>Our team writes the feature using your answers</li>
  <li>You see + approve everything before publication</li>
</ul>

<p>Not a great time, or want to pass? Just reply "not now" and we''ll close it out — no pressure.</p>

<p>Thanks for the chance to share {{subject_first}}''s story.</p>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>',
  interview_email_subject = '{{subject_first}}''s Play Ball interview — {{brand_name}}',
  interview_email_body = '<p>Hi {{contact_first}},</p>

<p>Thanks for saying yes! Here''s the interview form for {{subject_first}}''s Play Ball feature:</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{interview_url}}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open the interview form →</a>
</p>

<p>Six questions, about 10 minutes. You can fill it out with {{subject_first}} (kids often have the best lines). Action photos are great if you have them.</p>

<p>— The {{brand_name}} team</p>'
WHERE submission_type = 'play-ball';


UPDATE submission_type_columns SET
  outreach_email_subject = '{{subject_name}} was nominated as a Student Spotlight in {{brand_name}}',
  outreach_email_body = '<p>Hi {{contact_first}},</p>

<p><strong>{{nominator_name}}</strong> nominated <strong>{{subject_name}}</strong> for our <strong>Student Spotlight</strong> feature in {{brand_name}}.</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Student Spotlight celebrates kids doing something remarkable — academically, athletically, artistically, or in the community. We''d love to share {{subject_first}}''s story.</p>

<p><strong>If you''re open to it:</strong></p>
<ul>
  <li>Reply "we''re in" → we''ll send a short interview form (7 questions, ~10 min)</li>
  <li>Most parents fill it out with their child — kids often write the best parts</li>
  <li>You upload 1–2 photos</li>
  <li>You + {{subject_first}} see + approve before anything publishes</li>
</ul>

<p>Either way, congratulations on the nomination — being noticed by your community is the bigger thing.</p>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>',
  interview_email_subject = '{{subject_first}}''s Student Spotlight interview — {{brand_name}}',
  interview_email_body = '<p>Hi {{contact_first}},</p>

<p>Awesome — thanks for saying yes! Here''s the interview form for {{subject_first}}:</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{interview_url}}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open the interview form →</a>
</p>

<p>Seven questions, ~10 minutes. Best filled out with {{subject_first}} so the answers are in their voice.</p>

<p>— The {{brand_name}} team</p>'
WHERE submission_type = 'student-spotlight';


-- ── Mom-to-Mom outreach refresh ──────────────────────────────────────────────
-- Migration 182's mom-to-mom template was written when the form was
-- self-application — it greeted "Hi {{nominee_first}}" assuming the
-- submitter was the subject. Mom-to-mom is now a nomination flow
-- (someone nominates a mom), so we use {{contact_first}} which the
-- API resolves to nominee_name (the nominee IS the contact for
-- self-role nominations; the template still works when no separate
-- contact name is set, falling back to nominee_first).

UPDATE submission_type_columns SET
  outreach_email_body = '<p>Hi {{contact_first}},</p>

<p><strong>{{nominator_name}}</strong> nominated you to be featured in our <strong>Mom to Mom</strong> column in {{brand_name}}. Here''s what they said:</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Mom to Mom is our most-read column because it''s real moms talking honestly about what motherhood feels like — no Pinterest-perfect, no judgment. Just one mom sharing what she''s learned with the others reading.</p>

<p><strong>How it works:</strong></p>
<ul>
  <li>Reply "I''m in" and we''ll send a short interview form (7 questions, ~10 min)</li>
  <li>You upload 1–3 photos of yourself / your family</li>
  <li>Our editorial team writes the piece using your answers, in your voice</li>
  <li>You see + approve before anything publishes</li>
</ul>

<p>If now''s not a good time, just reply "not now" and we''ll close it out. No pressure either way.</p>

<p>Thanks for considering — and either way, thank {{nominator_name}} for thinking of you.</p>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>'
WHERE submission_type = 'mom-to-mom';


-- Teacher of the Month + Grands Are the Greatest are self-role too;
-- {{contact_first}} resolves to the nominee's first name when no
-- separate contact name is recorded. Update the greeting variable for
-- consistency so adding a separate contact name later (e.g. a school
-- HR contact for the teacher) just works.

UPDATE submission_type_columns SET
  outreach_email_body = REPLACE(outreach_email_body, '{{nominee_first}}', '{{contact_first}}'),
  interview_email_body = REPLACE(interview_email_body, '{{nominee_first}}', '{{contact_first}}')
WHERE submission_type IN ('teacher-of-the-month', 'grands-are-the-greatest');
