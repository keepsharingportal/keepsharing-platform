-- Migration 086: Multi-image support for School Bits
--
-- Up to 3 images per bit. ONE is designated the hero (used as the feed-card
-- cover); the rest are visible in the per-bit lightbox/gallery and included
-- in the print export ZIP.
--
-- school_bits.image_web_url / image_orig_path stay as a denormalized snapshot
-- of the HERO image, so all existing read paths keep working untouched —
-- feed cards, the discovery panel, the homepage block, etc. The new
-- school_bit_images table holds every image (including the hero, with
-- is_hero=true) plus a 16:10 attention-cropped variant for card surfaces.

CREATE TABLE IF NOT EXISTS school_bit_images (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bit_id         UUID NOT NULL REFERENCES school_bits(id) ON DELETE CASCADE,
  position       SMALLINT NOT NULL DEFAULT 0,        -- display order (0/1/2)
  is_hero        BOOLEAN NOT NULL DEFAULT FALSE,
  web_url        TEXT NOT NULL,                       -- natural-aspect WebP (public bucket)
  card_url       TEXT,                                -- 16:10 attention-cropped WebP (public bucket)
  orig_path      TEXT,                                -- full-res JPEG (private bucket, for print export)
  width          INT,                                 -- natural-aspect dimensions
  height         INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_bit_images_bit_position
  ON school_bit_images (bit_id, position);

-- At most one hero per bit
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_bit_images_one_hero_per_bit
  ON school_bit_images (bit_id)
  WHERE is_hero = TRUE;
