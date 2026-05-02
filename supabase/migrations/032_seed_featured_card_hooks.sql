-- Migration 032: Seed magazine-quality card_hooks for top featured listings

UPDATE advertiser_accounts SET card_hook =
  'The pediatric dentist who designed her practice around making nervous kids actually want to come back.'
WHERE slug = 'dentistry-for-children' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'Where River Region kids have learned music for 50 years — private lessons, group classes, and the patient teachers who make it stick.'
WHERE slug = 'guitar-center' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'A K3-through-12 college-prep school where 100% of seniors receive academic scholarship offers and every student knows their teacher''s name.'
WHERE slug = 'saint-james-school' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'The River Region''s largest private school, with 45 athletic teams, an award-winning arts program, and the kind of community that forms over 70 years.'
WHERE slug = 'macon-east-academy' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'An independent K-12 school built for students who learn differently — 8:1 student-teacher ratio, flexible scheduling, and teachers who see the whole child.'
WHERE slug = 'river-region-academy' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'Where small classes, college-prep rigor, and a genuinely supportive community meet — the private school parents keep coming back to recommend.'
WHERE slug = 'aim-academy' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'Process-based, imagination-driven art camps that blend creativity and STEAM — trusted by River Region schools and families for over two decades.'
WHERE slug = 'abrakadoodle-art-education' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'The childcare center River Region families put on their list before the baby is born — and usually have to wait for.'
WHERE slug = 'hooper-childcare-early-learning-center' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'A summer roller-skating and arcade experience that''s been the default birthday party answer for Montgomery families for years.'
WHERE slug = '2211-the-ultimate-play-zone' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'From first-time guitar pickers to advanced players, Guitar Center''s private lesson instructors have introduced more River Region kids to music than any program in the area.'
WHERE slug = 'guitar-center-montgomery' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'The ice cream cake River Region moms order instead of baking — pick your flavors, add a fudge layer, and skip the stress.'
WHERE slug = 'brusters-ice-cream-yogurt' AND card_hook IS NULL;

UPDATE advertiser_accounts SET card_hook =
  'Montgomery''s longest-running early learning center, with a curriculum built for the whole child and a staff that''s been here longer than most kids have been alive.'
WHERE slug = 'cobblestone-learning-center' AND card_hook IS NULL;
