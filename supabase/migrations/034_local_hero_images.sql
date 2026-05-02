-- Migration 034: Update guide_types.hero_image_url to locally hosted images

UPDATE guide_types SET hero_image_url = '/images/heroes/family-resource-hero.jpg'  WHERE slug = 'newcomer';
UPDATE guide_types SET hero_image_url = '/images/heroes/private-school-hero.jpg'   WHERE slug = 'private-school';
UPDATE guide_types SET hero_image_url = '/images/heroes/summer-camp-hero.jpg'      WHERE slug = 'summer-camp';
UPDATE guide_types SET hero_image_url = '/images/heroes/childcare-hero.jpg'        WHERE slug = 'childcare';
UPDATE guide_types SET hero_image_url = '/images/heroes/healthy-kids-hero.jpg'     WHERE slug = 'healthy-kids';
UPDATE guide_types SET hero_image_url = '/images/heroes/summer-fun-hero.jpg'       WHERE slug = 'summer-fun';
UPDATE guide_types SET hero_image_url = '/images/heroes/birthday-party-hero.jpg'   WHERE slug = 'birthday-party';
UPDATE guide_types SET hero_image_url = '/images/heroes/afterschool-hero.jpg'      WHERE slug = 'afterschool';
UPDATE guide_types SET hero_image_url = '/images/heroes/special-needs-hero.jpg'    WHERE slug = 'special-needs';
