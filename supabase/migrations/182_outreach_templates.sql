-- ── Per-type outreach + interview email templates ───────────────────────────
--
-- The nomination workflow at phase=nominated should show the editor a
-- composable OUTREACH email — pre-filled per submission type, editable,
-- with one click to send. The interview-form invite (phase=nominee-
-- accepted) works the same way. Today both messages are hardcoded in
-- the /outreach API; this moves them to data so editorial can tune
-- the wording for each type without code changes.
--
-- Template variables substituted at send time:
--   {{nominee_first}}   — nominee's first name (or "there" fallback)
--   {{nominee_name}}    — full nominee name
--   {{nominator_name}}  — who nominated them
--   {{nomination_pitch}}— the nominator's excerpt (their why)
--   {{brand_name}}      — "River Region Parents" etc
--   {{type_label}}      — "Mom to Mom", "Teacher of the Month", etc
--   {{interview_url}}   — the per-nominee /interview/[token] link
--   {{ops_email}}       — reply-to address

ALTER TABLE submission_type_columns
  ADD COLUMN IF NOT EXISTS outreach_email_subject  TEXT,
  ADD COLUMN IF NOT EXISTS outreach_email_body     TEXT,
  ADD COLUMN IF NOT EXISTS interview_email_subject TEXT,
  ADD COLUMN IF NOT EXISTS interview_email_body    TEXT;

-- ── Seeds per type ──────────────────────────────────────────────────────────

UPDATE submission_type_columns SET
  outreach_email_subject = 'You were nominated for Mom to Mom in {{brand_name}}!',
  outreach_email_body = '<p>Hi {{nominee_first}},</p>

<p><strong>{{nominator_name}}</strong> nominated you to be featured in our <strong>Mom to Mom</strong> column in {{brand_name}}. Here''s what they said about you:</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Mom to Mom is our most-read column because it''s real moms talking honestly about what motherhood feels like — no Pinterest-perfect, no judgment. Just one mom sharing what she''s learned with the others reading.</p>

<p><strong>How it works:</strong></p>
<ul>
  <li>Reply to this email saying "I''m in" and we''ll send you a short interview form (7 questions, ~10 min)</li>
  <li>You upload 1-3 photos of yourself / your family</li>
  <li>Our editorial team writes the piece using your answers, in your voice</li>
  <li>You see + approve before anything publishes</li>
</ul>

<p>If now''s not a good time, just reply "not now" and we''ll close it out. No pressure either way.</p>

<p>Thanks for considering — and either way, thank {{nominator_name}} for thinking of you.</p>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>',
  interview_email_subject = 'Your Mom to Mom interview — {{brand_name}}',
  interview_email_body = '<p>Hi {{nominee_first}},</p>

<p>Thanks for saying yes! Here''s your interview form:</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{interview_url}}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open your interview form →</a>
</p>

<p>Seven questions, ~10 minutes. You''ll write in your own voice — we''ll polish before publication.</p>

<p>Questions? Just reply to this email.</p>

<p>— The {{brand_name}} team</p>'
WHERE submission_type = 'mom-to-mom';

UPDATE submission_type_columns SET
  outreach_email_subject = 'You were nominated for Teacher of the Month in {{brand_name}}!',
  outreach_email_body = '<p>Hi {{nominee_first}},</p>

<p>You''ve been nominated by <strong>{{nominator_name}}</strong> (and possibly other families) to be featured as <strong>Teacher of the Month</strong> in {{brand_name}}.</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Teacher of the Month is one of our most-loved features — it''s where parents tell our readership which teachers are changing kids'' lives, and we get to give those teachers the spotlight they deserve.</p>

<p><strong>If you''d like to participate:</strong></p>
<ul>
  <li>Reply with "I''m in" and we''ll send you a short interview form (6 questions, ~10 min)</li>
  <li>You upload 1-2 photos (portrait + classroom shot)</li>
  <li>We write the profile using your answers</li>
  <li>You see + approve before anything publishes</li>
</ul>

<p>Not a good time? Just reply "not now." We''ll close it out and re-nominate next year.</p>

<p>Thanks for everything you do for our community''s kids.</p>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>',
  interview_email_subject = 'Your Teacher of the Month interview — {{brand_name}}',
  interview_email_body = '<p>Hi {{nominee_first}},</p>

<p>Thanks for accepting! Here''s the interview form for your Teacher of the Month feature:</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{interview_url}}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open your interview form →</a>
</p>

<p>Six questions, about 10 minutes. Write the way you''d talk — we''ll polish the prose.</p>

<p>— The {{brand_name}} team</p>'
WHERE submission_type = 'teacher-of-the-month';

UPDATE submission_type_columns SET
  outreach_email_subject = '{{nominee_name}} nominated for Play Ball — {{brand_name}}',
  outreach_email_body = '<p>Hi {{nominee_first}},</p>

<p><strong>{{nominator_name}}</strong> nominated your team / your story for our <strong>Play Ball</strong> feature in {{brand_name}}.</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Play Ball features local youth athletics — teams, players, coaches whose stories deserve a wider audience. We''d love to feature you.</p>

<p><strong>What we''d need from you:</strong></p>
<ul>
  <li>Reply "I''m in" → we send a short interview (6 questions, ~10 min)</li>
  <li>1-3 photos (action shot + portrait ideal)</li>
  <li>We write the feature using your answers</li>
  <li>You see + approve before publication</li>
</ul>

<p>Not the right moment? Reply "not now" and we''ll close it out.</p>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>',
  interview_email_subject = 'Your Play Ball interview — {{brand_name}}',
  interview_email_body = '<p>Hi {{nominee_first}},</p>

<p>Thanks for participating! Interview form:</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{interview_url}}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open your interview form →</a>
</p>

<p>Six questions, action photos appreciated. ~10 minutes.</p>

<p>— The {{brand_name}} team</p>'
WHERE submission_type = 'play-ball';

UPDATE submission_type_columns SET
  outreach_email_subject = 'You were nominated as a Student Spotlight in {{brand_name}}!',
  outreach_email_body = '<p>Hi {{nominee_first}},</p>

<p>You''ve been nominated by <strong>{{nominator_name}}</strong> for our <strong>Student Spotlight</strong> feature in {{brand_name}}.</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Student Spotlight celebrates kids who are doing something remarkable — academically, athletically, artistically, in the community. We''d love to share your story.</p>

<p><strong>If a parent or guardian agrees:</strong></p>
<ul>
  <li>Reply with "yes, we''re in"</li>
  <li>We''ll send a short interview (7 questions, ~10 min)</li>
  <li>Upload 1-2 photos</li>
  <li>You + parent see + approve everything before it publishes</li>
</ul>

<p>Either way, congratulations on the nomination — being noticed by your community is the bigger thing.</p>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>',
  interview_email_subject = 'Your Student Spotlight interview — {{brand_name}}',
  interview_email_body = '<p>Hi {{nominee_first}},</p>

<p>Awesome — thanks for participating! Interview form:</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{interview_url}}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open your interview form →</a>
</p>

<p>Seven questions, ~10 minutes.</p>

<p>— The {{brand_name}} team</p>'
WHERE submission_type = 'student-spotlight';

UPDATE submission_type_columns SET
  outreach_email_subject = 'You were nominated for a Grands Are the Greatest feature in {{brand_name}}',
  outreach_email_body = '<p>Hi {{nominee_first}},</p>

<p><strong>{{nominator_name}}</strong> nominated you for our <strong>Grands Are the Greatest</strong> column in {{brand_name}}.</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Grands Are the Greatest celebrates the people raising the next generation alongside their parents. We''d love to feature you.</p>

<p><strong>If you''re interested:</strong></p>
<ul>
  <li>Reply "I''m in" → short interview form (6 questions, ~10 min)</li>
  <li>1-2 photos (portrait + with grandkids)</li>
  <li>We write the piece from your answers</li>
  <li>You approve before anything publishes</li>
</ul>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>',
  interview_email_subject = 'Your Grands Are the Greatest interview — {{brand_name}}',
  interview_email_body = '<p>Hi {{nominee_first}},</p>

<p>Wonderful — thanks for saying yes! Interview form:</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{interview_url}}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open your interview form →</a>
</p>

<p>Six questions, ~10 minutes.</p>

<p>— The {{brand_name}} team</p>'
WHERE submission_type = 'grands-are-the-greatest';

UPDATE submission_type_columns SET
  outreach_email_subject = 'You''ve been nominated for a Boom Profile feature in {{brand_name}}!',
  outreach_email_body = '<p>Hi {{nominee_first}},</p>

<p><strong>{{nominator_name}}</strong> nominated you for a <strong>Boom Profile</strong> in {{brand_name}}.</p>

<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">{{nomination_pitch}}</blockquote>

<p>Our long-form Boom Profiles feature 50+ readers who are doing this next chapter of life with intention — reinvention, reflection, community impact. We''d love to feature you.</p>

<p><strong>How it works:</strong></p>
<ul>
  <li>Reply "I''m in" → 10-question interview (~15 min)</li>
  <li>2-4 photos</li>
  <li>We write a long-form profile from your answers</li>
  <li>You see + approve before publication</li>
</ul>

<p>— The {{brand_name}} team<br><a href="mailto:{{ops_email}}">{{ops_email}}</a></p>',
  interview_email_subject = 'Your Boom Profile interview — {{brand_name}}',
  interview_email_body = '<p>Hi {{nominee_first}},</p>

<p>Thanks for participating. Your interview form:</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{interview_url}}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open your interview form →</a>
</p>

<p>Ten questions, ~15 minutes — write in your voice. We''ll do the rest.</p>

<p>— The {{brand_name}} team</p>'
WHERE submission_type = 'boom-profile';

-- Types that DON'T need outreach (school-news, birthday, parent-picks,
-- family-favorites) keep outreach_email_* as NULL — the OutreachComposer
-- panel is hidden for them on the detail page anyway.
