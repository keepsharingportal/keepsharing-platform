-- Migration 224: After-School Guide — 2026-27 refresh from RRP-Afterschool Guide-26.csv
--
-- The guide has been live since the 2 May import (85 listings). This applies
-- the publisher's 2026-27 spreadsheet to those rows in place, so URLs, click
-- history and listing IDs all survive.
--
-- Decisions confirmed with the publisher before writing this:
--   * The CSV is authoritative on who is featured. 7 businesses lose featured
--     status and 2 gain it.
--   * The 5 listings absent from the CSV are unpublished, not deleted, so
--     restoring one is a single toggle if it turns out to be an oversight.
--   * Rows are updated in place as listing_year 2026 rather than forked to a
--     new edition.
--
-- Source data notes, all handled below rather than imported as-is:
--   * The file is Windows-1252. Read as UTF-8, "C.J.'s", "Lisa's" and
--     "YMCA Barracuda's" corrupt to U+FFFD. Decoded correctly here.
--   * Every Website cell is a bare domain; https:// is prefixed.
--   * 5 Phone cells are not phone numbers. Abrakadoodle's holds its own
--     business name (dropped). Three hold "Contact Name, (334) ..." and
--     Montgomery YMCA's holds 11 branches with separate numbers — the first
--     number drives office_phone for the tel: link and the full original is
--     preserved in guide_data.phone_note so nothing is lost.
--   * Facebook cells are page NAMES, not URLs — all 61 of them. Stored as
--     guide_data.facebook_name; deliberately not rendered as links, because
--     there is no reliable way to turn a page name into a profile URL.
--   * CSV row 82 is the editorial footer ("contact us if you know of after
--     school activities not listed"), not a business, and points at
--     editor@montgomeryparents.com — a different brand. Not imported.
--
-- Verify at the bottom of this file.

BEGIN;

UPDATE guide_listings SET
  business_name = 'Abrakadoodle Art Education',
  category = 'Art and Music',
  listing_tier = 'featured',
  office_phone = NULL,
  website_url = 'https://abrakadoodle.com/al-montgomery-register/',
  contact_email = 'mcornwell@abrakadoodle.com',
  address = NULL,
  city_state_zip = 'Montgomery, AL',
  guide_data = '{"category":"Art and Music","description":"Classes hosted at your school. Plus, Home School and Studio classes throughout the Fall and Spring. Online registration is open now! We also offer summer camps, parties, glitter tattoos and face painting."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 2,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'b481f788-4abf-45c8-9b0c-f963b452e81c';

UPDATE guide_listings SET
  business_name = 'Guitar Center',
  category = 'Art and Music',
  listing_tier = 'free',
  office_phone = '(334) 396-6245',
  website_url = 'https://stores.guitarcenter.com/montgomery',
  contact_email = NULL,
  address = '2572 Eastern Blvd',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Art and Music","description":"Guitar Center offers private 1-on-1 music lessons. Learning to play music can be an amazing, life-changing experience. Our fully-engaging lesson program provides a solid academic foundation and at the same time, encourages students to express themselves through music and helps them discover their inner artist.","facebook_name":"Guitar Center"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 3,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '4a3c31fb-36e5-42e1-92e7-d8caa6149fef';

UPDATE guide_listings SET
  business_name = 'Montgomery Museum of Fine Arts: Studio Programs',
  category = 'Art and Music',
  listing_tier = 'featured',
  office_phone = '(334) 240.4365',
  website_url = 'https://mmfa.org',
  contact_email = 'bmorrison@mmfa.org',
  address = '1 Museum Drive',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Art and Music","description":"Drawing and painting for preschoolers, children and adults. Afternoons and on weekends. Call for class, times, and cost information. Scholarships are available. Classes begin in September. Teens, ages 13 and up, are welcome to join! For more information, please contact epalmer@mmfa.org","facebook_name":"Montgomery Museum of Fine Arts"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 4,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '2940f970-cacb-494d-a763-898f7fa7d77a';

UPDATE guide_listings SET
  business_name = 'Montgomery Music Project',
  category = 'Art and Music',
  listing_tier = 'free',
  office_phone = '(334) 240.4004',
  website_url = 'https://montgomerysymphony.org',
  contact_email = 'montgomerymusicproject@gmail.com',
  address = '507 Columbus St.',
  city_state_zip = 'Montgomery, AL 36104',
  guide_data = '{"category":"Art and Music","description":"The mission of the Montgomery Music Project (MMP) is to develop young people and bring communities together through music. We do this by delivering affordable, high-quality music instruction to the children of Montgomery and the River Region and by uniting diverse geographic, ethnic, and social-economic communities under the umbrella of the arts. 2026/2027 Montgomery Music Project classes will begin late August. Please check our Facebook page/website for updates.","facebook_name":"Montgomery Music Project"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 5,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'f5f45037-a4e1-4ae1-9f0d-389837e86b2d';

UPDATE guide_listings SET
  business_name = 'Montgomery Symphony Youth Orchestra',
  category = 'Art and Music',
  listing_tier = 'free',
  office_phone = '(334) 414.1261',
  website_url = 'https://montgomerysymphony.org',
  contact_email = 'rdrawls@charter.net',
  address = '507 Columbus Street',
  city_state_zip = 'Montgomery, AL 36104',
  guide_data = '{"category":"Art and Music","description":"Runs concurrent with the school year. Audition date will be in September. Please check our website for updates.","facebook_name":"Montgomery Symphony Orchestra"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 6,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '72893f08-c4ed-4b39-b7f3-417823af6445';

UPDATE guide_listings SET
  business_name = 'Music Education on Wheels',
  category = 'Art and Music',
  listing_tier = 'free',
  office_phone = '(334) 676.1449',
  website_url = 'https://M.E.O.W. or at our website meowacademy.com',
  contact_email = 'meowforschool@gmail.com',
  address = '104 Mendel Pkwy.',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Art and Music","description":"M.E.O.W. is designed the positive influence of music within the education system. Group and private music lessons designed to make sure each student develops a lifelong relationship with music.","facebook_name":"Facebook under Music Education on Wheels"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 7,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'a0468332-fa8c-4585-9fc1-715a9d6743fe';

UPDATE guide_listings SET
  business_name = 'P''Zazz Art Studio',
  category = 'Art and Music',
  listing_tier = 'free',
  office_phone = '(334) 354.1975',
  website_url = 'https://pzazzart.com',
  contact_email = 'pzazzart@gmail.com',
  address = '1812 Glynnwood Drive',
  city_state_zip = 'Prattville, AL 36066',
  guide_data = '{"category":"Art and Music","description":"Fall classes start in September. Pick a day and time that fit your schedule. Classes meet once a week. $60 for the month. $20 supply fee per semester. This covers supplies for Sept. – Dec. After school and Homeschool classes available.","facebook_name":"P''zazz Art Studio"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 8,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '4631555f-7817-41e2-bea2-7fcd45837a2e';

UPDATE guide_listings SET
  business_name = 'Suncho School of Music',
  category = 'Art and Music',
  listing_tier = 'free',
  office_phone = '(334) 625.0306',
  website_url = 'https://sunchomusic.com',
  contact_email = 'sunchomusic@gmail.com',
  address = NULL,
  city_state_zip = 'Wetumpka, AL 36093',
  guide_data = '{"category":"Art and Music","description":"Learn to play the music that you love to listen to! We provide excellent private lessons in guitar, piano, singing, drums, and ukulele. We teach kids, teens, and adults ages 5 and up. We also teach beginner, intermediate, and advanced levels. Our lessons can take place in our Wetumpka home studio for local students, or online for learners outside of the area. We teach technique, music theory, and songs in the student''s favorite musical styles.","facebook_name":"Suncho School of Music"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 9,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '04f362ac-22a3-47f1-9676-cc4a4ec484f7';

UPDATE guide_listings SET
  business_name = 'BAMA Lanes',
  category = 'Bowling',
  listing_tier = 'free',
  office_phone = '(334) 272.5423',
  website_url = 'https://bamalanes.com',
  contact_email = NULL,
  address = '3020 Atlanta Highway',
  city_state_zip = 'Montgomery, AL 36109',
  guide_data = '{"category":"Bowling","description":"Youth leagues on Fridays at 6:30. Ages 3-20. Pre-registration with free bowling.","facebook_name":"Bama Lanes Montgomery"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 10,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'ef94ae7a-73f8-46f7-a025-b86a0ce947f2';

UPDATE guide_listings SET
  business_name = 'BAMA Lanes in Prattville',
  category = 'Bowling',
  listing_tier = 'free',
  office_phone = '(334) 358.8600',
  website_url = 'https://bamalanesprattville.com',
  contact_email = NULL,
  address = '1734 East Main Street',
  city_state_zip = 'Prattville, AL 36066',
  guide_data = '{"category":"Bowling","description":"Youth leagues on Saturdays. Ages 3-20. Registration will begin in August. Youth leagues start in September. Please call for more information. Free bowling with paid membership. Please call for more information.","facebook_name":"Bama Lanes of Prattville"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 11,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '2b0f92e7-ae39-4d5a-ac89-a704a3cb0281';

UPDATE guide_listings SET
  business_name = 'Bowlero',
  category = 'Bowling',
  listing_tier = 'free',
  office_phone = '(334) 819.7171',
  website_url = 'https://bowlero.com',
  contact_email = NULL,
  address = '1661 Eastern Blvd.',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Bowling","description":"Youth Leagues will be starting up in the fall. You may come in and sign up anytime."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 12,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '80a2696d-bc53-407a-a120-00c37efcda89';

UPDATE guide_listings SET
  business_name = 'Tammy''s Academy of Dance',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 221.2657',
  website_url = 'https://tammysacademyofdance.net',
  contact_email = 'info@tammysacademyofdance.net',
  address = '742 U.S. Hwy 231',
  city_state_zip = 'Wetumpka, AL 36092',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Registration going on now. Ballet, Tap, Jazz, Pointe and Contemporary and Tumbling. Classes for ages 3 through adult.","phone_note":"Tammy Rauch, \n(334) 221.2657","facebook_name":"Tammy''s Academy of Dance"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 13,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'bdd58a92-ab09-42e9-9112-a31d03daa9d7';

UPDATE guide_listings SET
  business_name = 'Alabama Dance Theatre',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'featured',
  office_phone = '(334) 241.2590',
  website_url = 'https://alabamadancetheatre.org',
  contact_email = NULL,
  address = '1018 Madison Ave.',
  city_state_zip = 'Montgomery, AL 36104',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"The Alabama Dance Theatre will be offering fall classes in classical ballet (pre-ballet to the professional level), pointe, modern, jazz, hip-hop, contemporary and tap. Classes will be held at the Armory Learning Arts Center, home of the Alabama Dance Theatre located at 1018 Madison Avenue.","facebook_name":"Alabama Dance Theatre"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 14,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '441c3940-aae1-496f-bc94-5eb78c817bb7';

UPDATE guide_listings SET
  business_name = 'Armory Athletics Center',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 241.2789',
  website_url = 'https://armoryathletics.com',
  contact_email = 'armoryathletics1@gmail.com',
  address = '1018 Madison Ave.',
  city_state_zip = 'Montgomery, AL 36104',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Fall classes begin in August. Ongoing registration. Various leveled classes offered in Gymnastics, Tumbling, and Ninja. Ages 3-18, all skill levels. Cheer, Competitive Gymnastics Team, Private lessons, Monthly special events, Parents Night Out and Camps offered. Classes offered are 45-1 hour classes: Various evening class times Monday through Thursday. Please call for rates.","facebook_name":"Armory Athletics"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 15,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'dd95420a-4252-4bad-9334-384128d1d5d6';

UPDATE guide_listings SET
  business_name = 'C.J.’s Dance Factory (home of the Prattville Ballet)',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 467.8603',
  website_url = 'https://cjsdancefactory.com',
  contact_email = NULL,
  address = '145 S. Court St.',
  city_state_zip = 'Prattville, AL 36067',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Registration on Thursdays in Prattville 5:30-7:00. Instruction in: Classical Ballet/Pointe, Jazz/Lyrical, Tap, PowerTumble Gymnastics and Preschool Dance (ages 18 months to 5 years). Meet your instructor, tour the facility, watch the Nutcracker with refreshments, purchase dancewear, and pick up your costume! All students will participate in this year’s winter Production of the Grinch Ballet, as well as many other performances. Open auditions, for all dancers 5 and up are Thursday, August 27th at 5:30. Ages preschool to professional.","facebook_name":"CJ''s Dance Factory"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 16,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'ca336f61-754d-4d78-b06a-4bc545946f24';

UPDATE guide_listings SET
  business_name = 'Dance Generation',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'featured',
  office_phone = '(334) 395.4300',
  website_url = 'https://dancegenerationstudio.com',
  contact_email = NULL,
  address = '65 Ashburton Drive',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Tap, Ballet, Jazz/Hip hop, Lyrical, Baton and Gymnastics Registration going on now at the Studio. Visit our Facebook page or please call 334-395-4300 or 334-283-2201","facebook_name":"Dance Generation"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 17,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'f43f53b7-f296-4454-96bc-92d7184bc77b';

UPDATE guide_listings SET
  business_name = 'Evolve Dance Company',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 730.0310',
  website_url = NULL,
  contact_email = 'info@efsta.com',
  address = '2072 Fairview Avenue (Pratt''s Mill Shopping Center)',
  city_state_zip = 'Prattville, AL 36066',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"We offer a variety of styles of dance for ages 2 and older. Please check our website for fall class dates.","facebook_name":"Evolve Studio for the Arts"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 18,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '768819df-ecaf-4b9a-a35b-9ca46fe0b096';

UPDATE guide_listings SET
  business_name = 'Lisa’s Dance Dimensions',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 303.7279',
  website_url = 'https://lisasdancedimensions.com',
  contact_email = 'LDDNDG@aol.com',
  address = '101 Penser Blvd.',
  city_state_zip = 'Millbrook, AL 36054',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Offer Parent/Tot, Ballet, Pointe, Lyrical, Jazz, Tap, and Gymnastics. Class times vary according to age and level. Registration August 5 & 6 from 4-6 p.m. Registration will take place at Gym Location 101 A Penser Blvd., Millbrook.","phone_note":"(334) 303.7279 or (334) 300.6285","facebook_name":"Lisa''s Dance Dimensions"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 19,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'dd93d091-f68e-461a-997b-7f5d49482543';

UPDATE guide_listings SET
  business_name = 'Mann Dance Studio',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 365.5154',
  website_url = 'https://manndancestudio.net',
  contact_email = NULL,
  address = '422 Pratt St.',
  city_state_zip = 'Prattville, AL 36054',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"The studio offers and excels in all forms of dance, offering beginner, intermediate, and advanced classes. Registration going on now and classes start in August .Tap, Lyrical/Contemporary, Pointe, Ballet, Gymnastics, Hip Hop, Baton and Jazz. Call for class times and dates.","facebook_name":"Mann Dance Studio"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 20,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'e4c98a19-d492-4611-abca-b92f605e33df';

UPDATE guide_listings SET
  business_name = 'Next Dimension Gymnastics',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 303.7279',
  website_url = 'https://lisasdancedimensions.com',
  contact_email = NULL,
  address = '101A Penser Blvd.,',
  city_state_zip = 'Millbrook, AL 36054',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Classes offered: Parent/Tot Tumbling (ages 18mths-3), Tumble Tots (ages3-5), Super Hero Gymnastics (ages 3-5 boys), Junior Olympic Gymnastics (ages 5 and up), Cheer/Jump/Tumble (ages 7 and up). Class times vary according to age and level. Registration August 5 & 6 from 4-6 p.m. Registration will take place at Gym Location 101 A Penser Blvd., Millbrook.","phone_note":"(334) 303.7279 or (334) 300.6285","facebook_name":"Lisa''s Dance Dimensions"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 21,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'c6af1cc4-e548-4595-90c3-52cc137f8cae';

UPDATE guide_listings SET
  business_name = 'Pike Road Dance Academy',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 782.9200',
  website_url = 'https://pikeroaddance.com',
  contact_email = 'pikeroaddance@gmail.com',
  address = '232 West Elizabeth Lane',
  city_state_zip = 'Pike Road, AL 36013',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Offering 9 levels of dance classes ranging from beginner, intermediate to advanced, and competition style (professional) instruction. These classes were developed for beginners all the way to more serious dancers seeking a progressive curriculum. Please visit our website for more information."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 22,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'd4f32fef-74f8-4ec5-9e55-4d4b9cd2b5f8';

UPDATE guide_listings SET
  business_name = 'Tutu School',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 363.3360',
  website_url = NULL,
  contact_email = NULL,
  address = '2690G Zelda Road',
  city_state_zip = 'Montgomery, AL 36106',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Tutu School is a whimsical storybook ballet school for children 18 months to 8 years old offering classes, parties, and camps. Registration is on going. Please call for more information and rates. We offer a free trial class before enrolling.","facebook_name":"Tutu School of Montgomery"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 23,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '7235a147-58fc-43ef-ad3b-d0e43d2ccb76';

UPDATE guide_listings SET
  business_name = 'Alabama River Region Ballet',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'featured',
  office_phone = '(334) 356.5460',
  website_url = 'https://alabamariverregionballet.com',
  contact_email = NULL,
  address = '7981 Vaughn Road',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Registration going on now. Classes begin in September. Classes offered in all levels of Classical Ballet, Pre-Pointe and Pointe, Creative Movement and Jazz. Audition information for the Alabama River Region Ballet’s Youth Company will be announced on our website.","facebook_name":"Alabama River Region Ballet"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 24,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '83876350-8529-41b3-a742-f56842d2047a';

UPDATE guide_listings SET
  business_name = 'The Montgomery Ballet',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'free',
  office_phone = '(334) 721.3687',
  website_url = 'https://montgomeryballet.org',
  contact_email = 'info@montgomeryballet.org',
  address = '440 Coliseum Blvd.',
  city_state_zip = 'Montgomery, AL 36109',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"The Montgomery Ballet is the producer of Performance on the Green, Ballet and the Beasts and The Nutcracker. Training provided in Classical Ballet for children and adults of all ages (2 1/2 to adult). Classes for different levels, (divided both by age and skill). As the Official School of The Montgomery Ballet Company, we are committed to developing first class ballet artists through quality training by experienced professional dancers in a healthy, nurturing and disciplined atmosphere. Please call for dates Classes begin in August and the annual School Performance will be held in May. Open enrollment. Classes offered in Classical Ballet, Pointe, Variation, Modern, Tap, Jazz, Musical Theatre, Hip Hop and Contemporary. We also have a Civic Company.","facebook_name":"Montgomery Ballet"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 25,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '3e3572e5-8440-419f-b77e-26f542ac23fe';

UPDATE guide_listings SET
  business_name = 'Tonya Speed''s Dance Connection',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'featured',
  office_phone = '(334) 277.1098',
  website_url = NULL,
  contact_email = NULL,
  address = '3370 Harrison Rd.',
  city_state_zip = 'Montgomery, AL 36109',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Fall registration will be August 10th from 3-7 p.m. Classes in Ballet, Tap, Tumbling, Jazz, Lyrical/Contemporary, Hip Hop, Baton and Competitive dance. Ages 2 ½ to Adult (beginner and advanced) Please call for class dates and times. Preschool classes also available on site.","facebook_name":"Tonya Speed’s Dance Connection"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 26,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'fc7531e0-41a0-4701-9254-8ea1305982c4';

UPDATE guide_listings SET
  business_name = 'United Gym Stars & Cheer, L.L.C.',
  category = 'Dance, Gymnastics & Cheer',
  listing_tier = 'featured',
  office_phone = '(334) 284.2244',
  website_url = 'https://unitedgymstarsandcheer.com',
  contact_email = NULL,
  address = '6100 Brewbaker Blvd.',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Dance, Gymnastics & Cheer","description":"Offer Baby gym for ages 1&2, Kinder Gym for girls ages 3-4, Boys’ Preschool for boys ages 3-5, Junior Gym ages 5 & 6 yrs., Boys’ Progressive ages 6 and up, Girls’ Progressive ages 7 and up. Beginning, Intermediate, & Advanced Tumbling. Cheer and Tumble for Girls’ ages 9 and up. Please call for times and prices. Family discounts available. Registration on a monthly basis.","facebook_name":"United Gymstars & Cheer"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 27,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '9bd5c632-7dcf-4297-a15b-92b665f83875';

UPDATE guide_listings SET
  business_name = 'Alabama Shakespeare Festival: Acting Academy',
  category = 'Drama Classes & Public Speaking',
  listing_tier = 'free',
  office_phone = '(334) 271.5324',
  website_url = 'https://asf.net',
  contact_email = 'glambert@asf.net',
  address = '1 Festival Drive',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Drama Classes & Public Speaking","description":"Learn more about the craft of acting at ASF’s Acting Academy. Fall Academy classes are open to new and returning students and will feature different content and material from the fall session. Please call or check our website for fall class dates and information.","phone_note":"Will Cotter, (334) 271.5324","facebook_name":"Alabama Shakespeare Festival"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 28,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '080caeb0-13d1-4514-bb09-2c6bb8f8b92c';

UPDATE guide_listings SET
  business_name = 'Wetumpka Depot Players',
  category = 'Drama Classes & Public Speaking',
  listing_tier = 'free',
  office_phone = '(334) 868.1440',
  website_url = 'https://wetumpkadepot.com',
  contact_email = 'kmeanor@wetumpkadepot.com',
  address = '300 South Main Street',
  city_state_zip = 'Wetumpka, AL 36092',
  guide_data = '{"category":"Drama Classes & Public Speaking","description":"Fall Afterschool Sessions and Homeschool sessions available. Please email to be contacted when those programs are finalized.","facebook_name":"Wetumpka Depot"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 29,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '2e0c7da3-d15e-40c1-9e36-f8129b3ead9d';

UPDATE guide_listings SET
  business_name = 'Foxwood Farms',
  category = 'Horses',
  listing_tier = 'free',
  office_phone = '(334) 546.7622',
  website_url = 'https://foxwoodfarms.biz',
  contact_email = NULL,
  address = NULL,
  city_state_zip = 'Pike Road, AL 36064',
  guide_data = '{"category":"Horses","description":"Safe and structured lessons offered from beginning riders to experienced competitors. Lessons are taught on a semester basis. Please visit our website for rates.","facebook_name":"Foxwood Farms"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 30,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'dcc01fd9-c112-4dad-8c0e-713f7e61f3fb';

UPDATE guide_listings SET
  business_name = 'MANE (Montgomery Area Non-traditional Equestrian)',
  category = 'Horses',
  listing_tier = 'free',
  office_phone = '(334) 213.0909',
  website_url = 'https://maneweb.org',
  contact_email = NULL,
  address = '3699 Wallhatchie Road',
  city_state_zip = 'Montgomery, AL 36064',
  guide_data = '{"category":"Horses","description":"Applications available online. Successfully teaching independent riding skills to children with cerebral palsy, mental disabilities, autism, hearing impairment and other disabilities. Goals developed individually for clients. We offer camps during the summer and winter months.","facebook_name":"Horses and Hope"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 31,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'bfa667e9-29f7-4014-a760-35a5401618da';

UPDATE guide_listings SET
  business_name = 'Family Karate Center',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(334) 277.4911',
  website_url = 'https://montgomeryfamilykarate.com',
  contact_email = NULL,
  address = '8159 Vaughn Rd, Peppertree Shopping Center',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Martial Arts","description":"Montgomery’s Christian Martial Arts. Mon.- Saturday (ages 2 and up): No enrollment fee, no contract. Specialize in ADD, LD, handicapped, mentally challenged, visually impaired, blind, autistic, deaf, overweight children, and children with depression anxiety disorder. Founders of the “Stranger Danger Child Abduction Prevention Program, ASK MOM FIRST Child Molestation Prevention, and the How to Handle Bullies and Aggressive People Program. Family Karate Center now also offers Japanese Martial Arts Training and Weaponry.","facebook_name":"Montgomery Family Karate Center"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 32,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '82fc0425-94fd-4b41-8abb-5c1edaa1b3e6';

UPDATE guide_listings SET
  business_name = 'Fleming''s Martial Arts',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(334) 277.5425',
  website_url = 'https://flemingsmartialarts.net',
  contact_email = NULL,
  address = '5521 Wares Ferry Road',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Martial Arts","description":"Classes for children and adults. A structured, systematic curriculum is offered in a focused and safe training environment."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 33,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '70330b62-0297-4e6d-b5e4-2dc066d11222';

UPDATE guide_listings SET
  business_name = 'Johnson Karate and Fitness Center',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(334) 284.2344',
  website_url = 'https://johnsonsmartialartsacademy.com',
  contact_email = NULL,
  address = '1751 Eastern Blvd.',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Martial Arts","description":"Classes for ages 3 to Adults. At Johnson’s Karate & Fitness Academy we teach Tae Kwon Do, Self-Defense, Private Lessons, Fitness Kickboxing, Pilates, and Sport Karate. We are now offering early morning Kick Boxing classes. We offer free trial lessons. Phil. 4:13.","facebook_name":"Johnson’s Martial Arts Academy"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 34,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '9ec2f1b2-5618-47e2-ac4d-7c156cffc3b7';

UPDATE guide_listings SET
  business_name = 'Martial Arts Center',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(334) 301.3722',
  website_url = NULL,
  contact_email = NULL,
  address = '565 Pike Road',
  city_state_zip = 'Pike Road, AL 36064',
  guide_data = '{"category":"Martial Arts","description":"Martial Arts combined with discipline and etiquette. Martial Arts is good, clean fun for kids and a great way to give them a head start in life. Our primary focus is to teach children life skills. Because a structure of respect, courtesy and honesty is built into KUK SOOL, children develop the ability to learn, listen and achieve within a highly regulated environment. Ages 6 yrs.-8 yrs. and 9 yrs. – 15 yrs. Call for times and prices.","facebook_name":"The Martial Arts Center Inc."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 35,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'd2c41e11-97f4-4d4d-989a-6ca980befebe';

UPDATE guide_listings SET
  business_name = 'Montgomery Judo Academy',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(631) 767.8052',
  website_url = 'https://usja.net',
  contact_email = NULL,
  address = '1555 Eastern Blvd',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Martial Arts","description":"Your child will reach new heights when they learn judo the gentle way! Gain confidence, build character, and learn respect. Teaching kids, teens and adults. Louis A. Balestrieri, Coach/Sensei"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 36,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '6f983408-3818-4b17-9005-7e74aab38ac1';

UPDATE guide_listings SET
  business_name = 'NextGen Martial Arts, Prattville',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(334) 590.3759',
  website_url = 'https://nextgenmartialarts.com',
  contact_email = NULL,
  address = '698 Old Farm Lane N',
  city_state_zip = 'Prattville, AL 36066',
  guide_data = '{"category":"Martial Arts","description":"Tang Soo Do, Li’l Dragons (4-6 years) and XMA (Xtreme Martial Arts) offered. Many programs available.","facebook_name":"Next Gen Martial Arts"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 37,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '721f8877-9a88-4c48-986c-a1b8ef920053';

UPDATE guide_listings SET
  business_name = 'Tiger Park TKD',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(334) 277.2627',
  website_url = 'https://tigerparktkd.com',
  contact_email = NULL,
  address = '3125 Bell Road',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Martial Arts","description":"Classes for everyone Ages 3 to adult. We now offer an After-school Program. We provide free transportation from your child''s school to our facility. Our program is designed to help your child be the best they can be, develop great self confidence, strengthen mental and physical discipline and create an interactive and educational environment.","facebook_name":"Chungs Taekwondo Center Tiger Park Taekwondo"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 38,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '9d77a35e-62ea-4c79-b7a0-3d5b914af689';

UPDATE guide_listings SET
  business_name = 'Taekwondo Mojo',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(334) 462.4758',
  website_url = 'https://taekwondomojo.com',
  contact_email = NULL,
  address = '7919 Vaughn Road',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Martial Arts","description":"We are dedicated to providing a supportive and empowering environment for individuals of all ages to learn and grow through the practice of Taekwondo. Please call or visit our website for more information."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 39,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'd92e8d2d-73f3-4f25-a2a6-c6a5c9096364';

UPDATE guide_listings SET
  business_name = 'US Yoshukai Karate',
  category = 'Martial Arts',
  listing_tier = 'free',
  office_phone = '(334) 657.2032',
  website_url = 'https://usyka.com',
  contact_email = 'usyka1997@gmail.com',
  address = '290 N. Burbank Dr.',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Martial Arts","description":"Visit us on Facebook under US Yoshukai Karate for more details and classes offered. Ages 5 and up.","facebook_name":"US Yoshukai Karate"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 40,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '6f2588e9-8187-4b44-b9df-445214e10d38';

UPDATE guide_listings SET
  business_name = 'Alabama Nature Center  Fall Homeschool classes',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 285.4550',
  website_url = 'https://alabamawildlife.org/homeschool-programs/',
  contact_email = NULL,
  address = '3050 Lanark Road',
  city_state_zip = 'Millbrook, AL 36054',
  guide_data = '{"category":"Recreational & Sports","description":"Fall registration for the 8 classes is open on the website. $80.00 per child for the 8 class program. There is a $5 per sibling discount for each family. Class days are Wednesdays or Thursdays for the fall. There are 2 time options to choose from; 10:00 a.m. – 12:00 p.m. or 1:30 – 3:30 p.m. for Wednesdays or Thursdays. There is a 10 student class limit for the Discoverers. (3.5 – 5 year old class) You may need to register earlier rather than later for the Discoverers class. Each other class will have a 15 student class limit. The number of classes offered each day is subject to the availability of staff here at the nature center. As registrations come in we will adjust our classes. Students will be placed in classes with students who are closest to their ages."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 41,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '7005bfdd-eda1-4c73-9795-11c34995a54e';

UPDATE guide_listings SET
  business_name = 'Boys & Girls Clubs of the River Region',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 832.4288',
  website_url = 'https://bgcmala.org',
  contact_email = NULL,
  address = '412 North Hull Street',
  city_state_zip = 'Montgomery, AL 36104',
  guide_data = '{"category":"Recreational & Sports","description":"Chisholm, (334) 265.2469, 2612 Lower Wetumpka Rd. West End, (334) 263.3371, 220 Crenshaw Street Wetumpka, (334) 478.4904 499 Alabama Street Provides programs and opportunities, which encourage young people, particularly the disadvantaged, to maximize their potential and become caring productive citizens of our community. Activities include character and leadership development, health and life skills, education and career development, sports, fitness and recreation, and the arts. Clubs are open Mon-Fri from 3-9 p.m. during the school year and 9-5 on school holidays and in the summer. All locations serve children ages 6-18. $5.00 a year per child.","phone_note":"Administrative Office, (334) 832.4288","facebook_name":"Boys and Girls Club of Montgomery"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 42,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '42a1c0d4-7b5a-41d3-abcb-7d357852f787';

UPDATE guide_listings SET
  business_name = 'Boy Scouts',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 262.2697',
  website_url = 'https://tukabatcheebsa.org',
  contact_email = NULL,
  address = '3067 Carter Hill Rd.',
  city_state_zip = 'Montgomery, AL 36111',
  guide_data = '{"category":"Recreational & Sports","description":"About 100 Cub Scout packs located in various private and public schools, churches, etc. August/September, city wide Fall Recruitment night for Scouts, parents can enroll their child in a pack that night. Someone will be handing out brochures at all schools in August/September. Homeschoolers are welcome."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 43,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '0d84a998-3957-4b57-ac5e-740a57881406';

UPDATE guide_listings SET
  business_name = 'Churches',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = NULL,
  website_url = 'https://awana.org',
  contact_email = NULL,
  address = NULL,
  city_state_zip = 'Montgomery, AL',
  guide_data = '{"category":"Recreational & Sports","description":"Check local churches for programs. AWANA Programs are popular."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 44,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '20c34855-8aef-4980-9be6-c73758b55775';

UPDATE guide_listings SET
  business_name = 'Daycares',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = NULL,
  website_url = NULL,
  contact_email = NULL,
  address = NULL,
  city_state_zip = 'Montgomery, AL',
  guide_data = '{"category":"Recreational & Sports","description":"Please check with local daycare centers for the option of after school care. Check out Montgomery Parents on the web at www.montgomeryparents.com and use our archived April Child Care Directory to get started."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 45,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '3e06f180-5af6-4544-8ca0-515fff8727de';

UPDATE guide_listings SET
  business_name = 'Doster Center, Prattville',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 361.3640',
  website_url = NULL,
  contact_email = NULL,
  address = '101 West Main Street',
  city_state_zip = 'Prattville, AL 36066',
  guide_data = '{"category":"Recreational & Sports","description":"Various after school activities include Afterschool Recreation Club for grades K-6th. Monday – Friday, 3 p.m. – 6 p.m. (After school transportation provided.), Vacation Club Day (for school holidays when children are out of school but parents are still working) Grades K-6, 7:30 a.m. – 5:30 p.m."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 46,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '2a8624f5-df6f-4e06-9f0a-e1e9110291dc';

UPDATE guide_listings SET
  business_name = 'Frazer Upward Basketball',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 495.6459',
  website_url = 'https://frazer.church',
  contact_email = NULL,
  address = 'Atlanta Hwy',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Recreational & Sports","description":"Program available for girls 5 years through 8th grade and boys 5 years through 8th grade. Registration only during the month of October. Practice begins in December. Games begin in January.","facebook_name":"Frazer Church"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 47,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'c3721941-8e26-4be0-a27d-220397835f22';

UPDATE guide_listings SET
  business_name = 'Frazer Upward Football & Cheerleading',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 495.6459',
  website_url = 'https://frazer.church',
  contact_email = NULL,
  address = 'Atlanta Hwy',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Recreational & Sports","description":"Registration begins July and runs through August. Program offered Aug.-Oct. for rising 1st- 6th grade. Spiritual development through devotionals, coaching and athletic skills. Registration is open now. Please visit us at www.frazer.church under the family and sports & fitness tabs for registration link.","facebook_name":"Frazer Church"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 48,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '70f23942-5c68-4f93-9ab1-175ec21edf1f';

UPDATE guide_listings SET
  business_name = 'Girl Scouts',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(800) 239.6636',
  website_url = 'https://girlscoutssa.org',
  contact_email = NULL,
  address = '2501 Bell Road',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Recreational & Sports","description":"Daisies, Brownies and Girl Scouts. Girls discover who they are, where their talents lie, and what they care the most about. And they take action to change the world. Through our program, the Girl Scout Leadership Experience, girls develop a strong sense of self, display positive values, and seek challenges.","facebook_name":"Girl Scouts of Southern Alabama"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 49,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '4e9293da-4b6d-418c-b17c-518465e9adf2';

UPDATE guide_listings SET
  business_name = 'Montgomery YMCA',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 396.9754',
  website_url = NULL,
  contact_email = NULL,
  address = NULL,
  city_state_zip = 'Montgomery, AL',
  guide_data = '{"category":"Recreational & Sports","description":"Offering over 100 different programs for all ages. Including inside and outside youth and adult soccer, football (grades 1-6), basketball (year-round & all ages), track, soccer (ages 6 & up), mini-soccer (ages 4 & 5), aquatic program, cheerleading (grades 1-6), Leaders Club & Tri-Hi-Y (grades 7-12), and much more. Fees vary by activity and membership. Boys and girls can enjoy teamwork, sportsmanship and healthy competition. Contact your local YMCA branch. Cheerleading Cheerleading will build confidence and self esteem while developing social skills and healthy relationships with others. Ages 5-12 (no 7th graders allowed) Season: September-November. Games on Saturdays. Registration going on now until August 4th. Basketball for ages 4-15 Registration begins in September. Youth Tackle Football Season: September-November. Ages 6-12 (No 7th grade players will be allowed.) Games will be on Tuesdays, Thursdays and Saturdays. Registration will be going on until Aug 4th. Late Registration from August 5th-13th. Mini Flag Football Ages: 4-7. Provide players the opportunity to learn the basics of football in a developmental environment. Registration will be going on until Aug 4th. Late Registration from August 5th-13th. Ice Hockey Ages 4-11. Children will learn the fundamentals of ice skating and begin to practice the skills needed to play ice hockey. This program will begin as an instructional program and evolve into a developmental league program. Please call for more information. Fall Outdoor Mini-Soccer for ages 3 & 6 Registration June 14 through August 12. Season begins in August and will end in October. LaCrosse The YMCA Montgomery Capitals will be formed as a competitive youth lacrosse Club. Our philosophy will be to allow all youth participants the opportunity to participate, develop a love for the game and continue to develop their skills and fundamentals. Please call for more information. Soccer Website: www.capitalcitystreaks.org Email: msanchez@capitalcitystreaks.org. Participants can sign up at any local YMCA. Recreational Soccer: Season- September-November and April-May. Ages 6-18. Games Mondays, Tuesdays, Thursdays, Fridays and Saturdays. Registration is open now. Practice begins in August and games begin in September. Indoor Soccer Season December-January, February-March, June-August. Ages 7-17. Games Monday, Tuesdays, Thursday, Friday and Saturday depending on age group. Registration TBA Barracuda’s Competitive Swim Team The YMCA has a year-round competitive swim program based at the East YMCA. Contact (334) 272.3390. Tryouts will held in August. Please call for more information. They can also be contacted online at www.ymcamontgomery.org. Indian Guide (Parent-Child Program) The Adventure Guides and Princesses offers activities for children K-3rd grade and their parents. Program that aids in the growth and development of families. Contact Jeff Reynolds at (334) 269.4362 for additional information. Starts in September.","phone_note":"Soccer Branch, (334) 396.9754 or (678) 571-7605\nKershaw Center, W. Fairview Ave. (334) 265.1433\nCleveland Ave., Rosa Parks Ave. (334) 265.0566\nDowntown, South Perry Street (334) 269.4362\nEast Y, Pelzer Avenue (334) 272.3390\nBell Road Y, Bell Road (334) 271.4343\nGoodtimes Center, off Bell Road (334) 279.8666\nSoutheast Y, Carter Hill Road (334) 262.6411\nCamp Chandler, Lake Jordan (334) 269.4362\nCamp Grandview, Millbrook (334) 290.9622\nJames Wilson Jr, 1445 Wilson Park Dr., (334) 356.8471"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 50,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '9ef93927-ba8f-4fb4-a5e0-2780ce683807';

UPDATE guide_listings SET
  business_name = 'Montgomery YMCA Goodtimes Center',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 279.8666',
  website_url = 'https://ymcamontgomery.org',
  contact_email = NULL,
  address = '2325 Mill Ridge Dr., off Bell Road',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Recreational & Sports","description":"Staffed from 2:30 to 6 p.m. After school programs are at the schools. Programs include snack and juice, homework time, music and language, storytelling time, outside activities, arts and crafts, projects, Science and Nature, multicultural activities, and creative time. Open registration. Also, before school programs at certain schools from 6:45 and 7 a.m. til school starts.","facebook_name":"YMCA of Greater Montgomery"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 51,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'c6d6ab2c-4629-462e-b9c7-833797306bf1';

UPDATE guide_listings SET
  business_name = 'Prattville YMCA',
  category = 'Recreational & Sports',
  listing_tier = 'featured',
  office_phone = '(334) 365.8852',
  website_url = 'https://prattvilleymca.org',
  contact_email = NULL,
  address = '972 McQueen Smith Rd. S,      600 E. Main Street
348 Hwy 82 West',
  city_state_zip = 'Prattville, AL 36066, 36067',
  guide_data = '{"category":"Recreational & Sports","description":"Registration going on now. Main After School Program, Kindergarten After School, Primary After School, Pine Level, and Daniel Pratt. Prepay first week at registration. Vans will pick up kids at public school and take them to the Main Site Program. Main Site cost is $70 for first child for members and $85 for non-members per week. Discounts for second and third children. Family discounts available. Fall sports are as follows: Football, Cheerleading, Baseball, Basketball, Taekwondo, Volleyball, Cheer, tumble, gymnastics and swim lessons available. Please call for fall sports registration dates.","phone_note":"(334) 365.8852 or for the Prattville Bradford Branch call (334) 358.1446.","facebook_name":"Prattville YMCA"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 52,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'e8120911-8d8a-420b-abe6-54389c3ccc10';

UPDATE guide_listings SET
  business_name = 'Therapeutic Recreation Center',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 240.4595',
  website_url = 'https://montgomeryal.gov',
  contact_email = NULL,
  address = '604 Augusta Street',
  city_state_zip = 'Montgomery, AL 36111',
  guide_data = '{"category":"Recreational & Sports","description":"For the mentally and physically challenged. Various programs available. Classes run from 4 p.m. – 5 p.m. Monday thru Friday. Transportation is provided for Montgomery public schools. Space is limited, so please register on time. Please call for more information about registrations dates and times.","facebook_name":"Montgomery Therapeutic Recreation Center"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 53,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'e73b6a85-5714-4886-8e84-d59b97fad2b9';

UPDATE guide_listings SET
  business_name = 'Wetumpka YMCA',
  category = 'Recreational & Sports',
  listing_tier = 'free',
  office_phone = '(334) 567.8282',
  website_url = 'https://ymcamontgomery.org',
  contact_email = NULL,
  address = '200 Red Eagle Drive',
  city_state_zip = 'Wetumpka, AL 36092',
  guide_data = '{"category":"Recreational & Sports","description":"YMCA Goodtimes after hours for school age children (5 to 11 yrs.) pick up and keep them until 6 p.m. Have several programs, including: Summer Camp, Youth Sports, Football, Volleyball, cheerleading, basketball, karate, T-Ball, Swim Team and soccer. Open registration. The following sports are available beginning in the fall: Football for boys’ ages 6-12, cheerleading for girls’ grades 1-6, Mini-soccer for ages 4-5.","facebook_name":"Wetumpka YMCA"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 54,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '13751091-655c-48ed-85e2-56ed038e2a6e';

UPDATE guide_listings SET
  business_name = 'FC Montgomery Futsal Soccer',
  category = 'Soccer',
  listing_tier = 'free',
  office_phone = '(334) 207.5442',
  website_url = 'https://fcmontgomery.com',
  contact_email = 'brunomr@fcmontgomery.com',
  address = '5334 Atlanta Hwy.',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Soccer","description":"Outdoor Travel Soccer and Indoor Local Futsal club. A variety of programs offered, including; Soccer Camps, 3v3 Tourneys, Lessons, Soccer Parties, Soccer Tours and Homeschool. Registration is on going. Please check our website for our training and games schedule and team evaluation dates. Coach Bruno (Former pro & College coach – Masters Phy. Ed.","facebook_name":"FC Montgomery"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 55,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '1e3b70a6-98af-44c2-a0a8-011b6ad2b64a';

UPDATE guide_listings SET
  business_name = 'Frazer Sonshine Soccer',
  category = 'Soccer',
  listing_tier = 'free',
  office_phone = '(334) 495.6458',
  website_url = 'https://frazer.church',
  contact_email = NULL,
  address = 'Atlanta Hwy.',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Soccer","description":"Held at Frazer Soccer Fields will be held in the Spring. Ages 5-12.","facebook_name":"Frazer Church"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 56,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '4d0a07cc-b57c-496f-bab5-f18ebecdbe83';

UPDATE guide_listings SET
  business_name = 'St. James Upward Soccer',
  category = 'Soccer',
  listing_tier = 'free',
  office_phone = '(334) 277.3037',
  website_url = 'https://sjlife.com',
  contact_email = 'kari@sjlife.com',
  address = '9045 Vaughn Rd.',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Soccer","description":"Registration available online. K4 through 4 grade (boys and girls welcome) Registration is going on now.","facebook_name":"Upward Soccer Saint James UMC"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 57,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'e16b732f-3ff3-4e2c-abfb-716e0bf40686';

UPDATE guide_listings SET
  business_name = 'YMCA Capital City Streaks',
  category = 'Soccer',
  listing_tier = 'free',
  office_phone = '(334) 218.3750',
  website_url = 'https://capitalcitystreaks.org',
  contact_email = 'msanchez@capitalcitystreaks.or',
  address = '300 Brown Springs Road',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Soccer","description":"Participants can sign up at any local YMCA. Season- September-November and April-May. Ages 6-18. Games: Mondays, Tuesdays, Thursdays, Fridays and Saturdays. Registration is open now. Practice begins in August and games begin in September.","facebook_name":"Montgomery Capital City Streaks"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 58,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'f6b9379b-c172-4f9a-9a04-8a2a69668739';

UPDATE guide_listings SET
  business_name = '2211 Ultimate Playzone',
  category = 'Skating',
  listing_tier = 'free',
  office_phone = '(334) 593.7180',
  website_url = 'https://2211ultimateplayzone.com',
  contact_email = NULL,
  address = '3541 McGehee Road',
  city_state_zip = 'Montgomery, AL 36111',
  guide_data = '{"category":"Skating","description":"Skating, birthday parties and Inflatables. Laser Tag! Summer Open Skate and much more! Please visit our website for regular and holiday hours during current season. We offer unique educational and recreational opportunities for schools and colleges. Our STEM-focused field trips provide a fun and engaging way to learn outside the classroom, while our college building trips are perfect for team-building and socializing in a dynamic setting."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 59,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '6a0a6e52-62e3-487f-b7eb-6dcfdef600ab';

UPDATE guide_listings SET
  business_name = 'Skate Zone 2000',
  category = 'Skating',
  listing_tier = 'free',
  office_phone = '(334) 567.4434',
  website_url = NULL,
  contact_email = NULL,
  address = '88 Red Eagle Pkwy.',
  city_state_zip = 'Wetumpka, AL 36092',
  guide_data = '{"category":"Skating","description":"Birthday Parties, State of the Art Lasertag, Homeschool Days Skating and more.","facebook_name":"Skate Zone Wetumpka"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 60,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '06460f92-9769-43f3-9d07-ae3b4a27f874';

UPDATE guide_listings SET
  business_name = 'Adventure Sports Aquatic Center',
  category = 'Swimming & Scuba',
  listing_tier = 'featured',
  office_phone = '(334) 269.3483',
  website_url = 'https://advsports2.com',
  contact_email = NULL,
  address = '1546 E. Ann Street',
  city_state_zip = 'Montgomery, AL 36107',
  guide_data = '{"category":"Swimming & Scuba","description":"Heated indoor pool year round. Swimming Lessons, Scuba and Life Guard Classes.","facebook_name":"Adventure Sport II"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 61,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '2ed35122-d02c-4a54-8b36-6f9e4ad7e003';

UPDATE guide_listings SET
  business_name = 'Swim Prep',
  category = 'Swimming & Scuba',
  listing_tier = 'free',
  office_phone = '(334) 356.6116',
  website_url = 'https://swimprepllc.com',
  contact_email = 'rebecca@swimprepllc.com',
  address = '2212 Howard Murfee Blvd.',
  city_state_zip = 'Prattville, AL 36066',
  guide_data = '{"category":"Swimming & Scuba","description":"Private One-o-one swim lessons starting at 6 months. Maintenance and group classes offered after student has graduated our program. Please visit our website for more information and to register.","facebook_name":"Swim Prep, LLC"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 62,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'cb95b40e-5a5c-414b-a0ca-ca4a90f431e8';

UPDATE guide_listings SET
  business_name = 'YMCA Barracuda’s Competitive Swim Team',
  category = 'Swimming & Scuba',
  listing_tier = 'free',
  office_phone = '(334) 272.3390',
  website_url = 'https://ymcamontgomery.org',
  contact_email = 'rklages@ymcamontgomery.org',
  address = '3407 Pelzer Avenue',
  city_state_zip = 'Montgomery, AL 36109',
  guide_data = '{"category":"Swimming & Scuba","description":"The YMCA has a year-round competitive swim program based at the East YMCA. Please call (334) 272.3390. Tryouts will be held in August. Please call for more information.","facebook_name":"Montgomery YMCA Barracudos"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 63,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'e45fd844-8de0-4ef6-95ed-08ffefc4bece';

UPDATE guide_listings SET
  business_name = 'Hampstead Tennis',
  category = 'Tennis',
  listing_tier = 'free',
  office_phone = '(334) 207.9821',
  website_url = NULL,
  contact_email = 'Hampsteadtennis@att.net',
  address = 'Hampstead',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Tennis","description":"Tennis lessons open to both residents and visitors interested in enjoying the fun of tennis. Players welcomed from beginner to advanced level play of ages, and offer weekly organized private lessons","phone_note":"(334) 207.9821, Jan Gelabert"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 64,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '28de74ef-45d1-49fb-afd9-c05bc0c9af32';

UPDATE guide_listings SET
  business_name = 'O''Connor Tennis Center',
  category = 'Tennis',
  listing_tier = 'featured',
  office_phone = '(334) 240.4884',
  website_url = 'https://oconnortenniscenter.com',
  contact_email = 'bbradshaw10s@gmail.com',
  address = '500 Anderson Street',
  city_state_zip = 'Montgomery, AL 36107',
  guide_data = '{"category":"Tennis","description":"After-school Tennis Clinics offered during the school year for all ages. We follow the MPS school schedule.","facebook_name":"O''Conner Tennis Center"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 65,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'a4067816-da24-4f67-83c1-23378156a810';

UPDATE guide_listings SET
  business_name = 'Wynlakes Tennis',
  category = 'Tennis',
  listing_tier = 'free',
  office_phone = '(334) 273.8425',
  website_url = 'https://wynlakes.com',
  contact_email = 'dleal@mindspring.com',
  address = '7900 Wynlakes Blvd.',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Tennis","description":"The Wynlakes Junior Tennis Program offers classes for students 4 years and older. Beginning with “Pee Wee Tennis” the players graduate to “Rising Stars” and move to “Excellence” and finally to the “Wynlakes Junior Tour” where players receive state ranking. Tennis at Wynlakes is a sport for everyone and is the sport of a lifetime. Please call for class times and days.","facebook_name":"Wynlakes Tennis"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 66,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'f840807f-d71d-4075-9c2f-99fb5b89c5f0';

UPDATE guide_listings SET
  business_name = 'Better Than Average',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 802.1315',
  website_url = 'https://betterthanaverage.online',
  contact_email = NULL,
  address = '2820 Fairlane Dr., Suite A3',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Tutoring","description":"Building Confidence. Creating individuals who love learning. Our peer tutors aim to build relationships with our students to make learning more engaging and relatable. We strive to show our students their potential and to strengthen confidence in their capabilities by celebrating their acheivements. In-person and virtual."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 67,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'bc066f89-7dfc-4068-8eef-97eea5bf66f7';

UPDATE guide_listings SET
  business_name = 'Ed Tech Academy',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 296.2393',
  website_url = 'https://edtechacademy.org',
  contact_email = 'info@edtechacademy.org',
  address = NULL,
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Tutoring","description":"Do you want to see an improvement in your child’s academics? Offering STEM and technology daytime and afternoon programs. Tutoring, adult classes, parent’s night out, Saturday workshops and more. Homeschoolers welcome. Discounts for multiple children, military and state employees."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 68,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '530b1037-dac8-4ddd-82b7-cd5ff3578d07';

UPDATE guide_listings SET
  business_name = 'Enjoy Learning Center',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 625.9535',
  website_url = 'https://enjoylearningcenter.com',
  contact_email = 'fb@enjoylearningcenter.com',
  address = '2801 Vaughn Plaza Rd., Suite H',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Tutoring","description":"One-on-one tutoring for ages 4 to adult. Math, science, chemistry, reading, comprehension, phonics, spelling, writing, graduation exit exam, ACT and SAT. Certified, skilled teachers. Credit/debit cards accepted.","facebook_name":"Enjoy Learning Center Tutoring"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 69,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '7f5d1c87-1fde-436d-b54b-af94c27d43a2';

UPDATE guide_listings SET
  business_name = 'Huntington Learning Center',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 277.9200',
  website_url = 'https://huntingtonhelps.com',
  contact_email = NULL,
  address = '3251 Malcolm Drive',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Tutoring","description":"One on one instruction in a specific course. Tutoring for K-12 in reading, all levels of math, study skills, writing, phonics, vocabulary and more. SAT, ACT PSAT, Advanced Placement test prep."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 70,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '70f35207-d11a-43a0-a5c6-bcb269188faf';

UPDATE guide_listings SET
  business_name = 'Kumon Reading & Math Center',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 649.1178',
  website_url = 'https://kumon.com',
  contact_email = 'montgomerysoutheast_al@ikumon.com',
  address = '8115 Vaughn Rd',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Tutoring","description":"After-school academic enrichment program that helps children achieve success. The Kumon Math program develops necessary skills to help children progress from counting through calculus. The Kumon Reading program begins with basic phonics and progresses all the way through advanced reading comprehension."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 71,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'bba4ffff-3592-4257-b4d2-bfd2d6f4c808';

UPDATE guide_listings SET
  business_name = 'MasterRead',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 271.6295',
  website_url = NULL,
  contact_email = NULL,
  address = '2815-C Zelda Rd.,',
  city_state_zip = 'Montgomery, AL 36106',
  guide_data = '{"category":"Tutoring","description":"Grades K-12 individual tutoring. Sessions for reading, comprehension, phonemic awareness, phonics, math, composition, spelling, study skills and ACT/SAT preparation and Exit Exam preparation.","facebook_name":"Masterread Learning Center"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 72,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '443d7478-3968-4d79-94f3-65537aae19a8';

UPDATE guide_listings SET
  business_name = 'Mathnasium',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 239.8132',
  website_url = 'https://mathnasium.com/eastmontgomery',
  contact_email = 'eastmontgomery@mathnasium.com',
  address = '3453 Malcolm Drive',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Tutoring","description":"We specialize in teaching kids math the way that makes sense to them. We provide: Expert tutors, Custom learning plans and personalized instruction, and Homework help.","facebook_name":"Mathnasium of East Montgomery"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 73,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'ab27411b-b721-4534-b9b1-5f4570edc275';

UPDATE guide_listings SET
  business_name = 'Read Write Learning Center',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 328.2134',
  website_url = 'https://readwritelearningcenter.com',
  contact_email = 'montgomeryoffice@readwritelearningcenter',
  address = '6752 Taylor Circle',
  city_state_zip = 'Montgomery, AL 36116',
  guide_data = '{"category":"Tutoring","description":"Give your student the extra boost they need this year with Read Write! Read Write offers dyslexia testing and one-on-one therapy for students with language based learning disabilities. Our services include multisensory instruction in reading, math, grammar, writing and comprehension. We also offer early intervention for 4 and 5 year olds, which promotes a strong foundation for early literacy.","facebook_name":"Read Write Montgomery"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 74,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'e0be7d38-5c45-467c-8755-db2d2f129ba6';

UPDATE guide_listings SET
  business_name = 'Success Unlimited',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 213.0803',
  website_url = 'https://suacademy.com',
  contact_email = NULL,
  address = '2328 Fairlane Drive',
  city_state_zip = 'Montgomery, AL 36106',
  guide_data = '{"category":"Tutoring","description":"Tutoring available for any subject. Tutoring provided by Christian certified teachers. Please call for rates.","facebook_name":"Success Unlimited Academy"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 75,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '079fce31-9921-4fb0-8048-ba3954268b63';

UPDATE guide_listings SET
  business_name = 'Sylvan Learning of Prattville',
  category = 'Tutoring',
  listing_tier = 'free',
  office_phone = '(334) 380.4144',
  website_url = 'https://sylvanlearning.com/Prattville',
  contact_email = NULL,
  address = '2046 Farivew Ave.',
  city_state_zip = 'Prattville, AL 36066',
  guide_data = '{"category":"Tutoring","description":"Sylvan offers tutoring and individualized test prep for all math, reading, writing and more. We offer ACT/SAT Test prep. Monthly packages are available for Academic Coaching. Call or come by today for more information.","facebook_name":"Sylvan Learning Prattville"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 76,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '25ad09ca-1364-4381-91b4-3d9e06b742b3';

UPDATE guide_listings SET
  business_name = 'CCJ',
  category = 'Volleyball',
  listing_tier = 'free',
  office_phone = '(866) 942.2509',
  website_url = 'https://Capitalcityjuniors.com',
  contact_email = 'info@capitalcityjuniors.com',
  address = '5334 Atlanta Hwy.',
  city_state_zip = 'Montgomery, AL 36109',
  guide_data = '{"category":"Volleyball","description":"Capital City Juniors is the premier organization for girls club volleyball in Montgomery. Our mission is to blend passion with perspective and to combine the love of the sport and intensity with knowledge, integrity and discipline. We train girls from 6-18 from beginners to competitive teams.","facebook_name":"Capital City Juniors Volleyball Club"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 77,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '0d626c6c-1290-4e63-884e-2d38fe2cd71f';

UPDATE guide_listings SET
  business_name = 'Next Level Volleyball Club',
  category = 'Volleyball',
  listing_tier = 'free',
  office_phone = NULL,
  website_url = NULL,
  contact_email = 'nxtlevelvolleyballclub@gmail.com',
  address = NULL,
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Volleyball","description":"Come join us and develop yours skills essetial to the game of volleyball.","facebook_name":"Next Level Volleyball Club"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 78,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'b7426234-2efb-4129-b07f-1eb6f6af4c43';

UPDATE guide_listings SET
  business_name = 'Caesar Chess',
  category = 'Miscellaneous',
  listing_tier = 'free',
  office_phone = '334-868-0271',
  website_url = NULL,
  contact_email = 'CaesarChess@gmail.com',
  address = NULL,
  city_state_zip = 'Montgomery, AL',
  guide_data = '{"category":"Miscellaneous","description":"Teaching kids to play chess in metro Montgomery. ** Public ** Private ** Homeschooled ** Caesar Lawrence – Director & Chess Coach","facebook_name":"Caesar Chess"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 79,
  imported_at = NOW(), updated_at = NOW()
WHERE id = 'aebdb117-d5a6-41be-9ed6-9b054490a885';

UPDATE guide_listings SET
  business_name = 'Michaels',
  category = 'Miscellaneous',
  listing_tier = 'free',
  office_phone = '(334) 260.2846',
  website_url = 'https://michaels.com',
  contact_email = NULL,
  address = 'East Chase Market Center, 7991 Eastchase Pkwy',
  city_state_zip = 'Montgomery, AL 36117',
  guide_data = '{"category":"Miscellaneous","description":"Learn crafting skills when and where you want with online classes from Creativebug, or sign up for in store classes in jewelry making, art painting, paper crafting, mixed media, floral design, cake decorating or knitting and crocheting. Please visit your local Michaels’ for class descriptions, times and fees."}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 80,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '1ad0cb15-fab1-47f5-b941-bb5f1505379a';

UPDATE guide_listings SET
  business_name = 'Snapology',
  category = 'Miscellaneous',
  listing_tier = 'free',
  office_phone = '(334) 325.4679',
  website_url = NULL,
  contact_email = 'riverregion@snapology.com',
  address = NULL,
  city_state_zip = 'Montgomery, AL',
  guide_data = '{"category":"Miscellaneous","description":"Ages 6-14. Take time off your hands while your kids play, learn, and make life long friends. We offer amazing themes for our camps and workshops year-round including spring break camps and summer camps. Please call or visit our website or on Facebook under Snapology of the River Region. Please call for more information on classes being offered near you.","facebook_name":"Snapology of The River Region"}'::jsonb,
  is_published = true,
  source_csv_filename = 'RRP-Afterschool Guide-26.csv',
  source_csv_row_number = 81,
  imported_at = NOW(), updated_at = NOW()
WHERE id = '0641736b-5ddd-4043-b60e-3230b8c839ed';

-- ── Unpublish the 5 listings absent from the 2026-27 CSV ──────────────────
-- Rows kept intact; flip is_published back to true to restore any of them.
UPDATE guide_listings SET is_published = false, updated_at = NOW()
WHERE id IN ('b406a412-abd0-4df1-b0e9-3341f54c4cce', '9cb8688f-9ba8-4e28-8ff8-e36b17df0f74', '6713cad7-9d83-408d-8ccf-ca0b4ab9e6f8', '9c075364-2e53-4b67-98cf-2f49e096a3c5', '797d7d6f-c6bc-4892-8c6c-6fca17127508');

COMMIT;

-- Verify:
--   SELECT listing_tier, is_published, COUNT(*) FROM guide_listings
--    WHERE guide_type_slug = 'afterschool' AND listing_year = 2026
--    GROUP BY 1, 2 ORDER BY 1, 2;
--   -- expect: featured/true = 10, free/true = 70, free|featured/false = 5
--
--   SELECT business_name FROM guide_listings
--    WHERE guide_type_slug = 'afterschool' AND guide_data ? 'phone_note';
--   -- expect 8 rows, incl. Montgomery YMCA
