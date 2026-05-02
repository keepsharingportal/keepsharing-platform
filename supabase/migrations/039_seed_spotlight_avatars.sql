-- Migration 039: Seed real-looking avatars for community_spotlights
-- These are stable Unsplash URLs. No randomization; same image every page load.

UPDATE community_spotlights SET hero_image_url =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop&crop=faces'
WHERE spotlight_type = 'teacher' AND hero_image_url IS NULL;

UPDATE community_spotlights SET hero_image_url =
  'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=400&q=80&auto=format&fit=crop&crop=faces'
WHERE spotlight_type = 'student' AND hero_image_url IS NULL;

UPDATE community_spotlights SET hero_image_url =
  'https://images.unsplash.com/photo-1581579438747-104c53e7c2e1?w=400&q=80&auto=format&fit=crop&crop=faces'
WHERE spotlight_type = 'grands' AND hero_image_url IS NULL;
