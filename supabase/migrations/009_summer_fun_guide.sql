-- Summer Fun Guide: camps, activities, and programs for River Region kids

CREATE TABLE IF NOT EXISTS summer_fun_guide (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser            BOOLEAN NOT NULL DEFAULT FALSE,
  category              TEXT NOT NULL,
  business_name         TEXT NOT NULL,
  address               TEXT,
  city                  TEXT,
  state                 TEXT DEFAULT 'AL',
  zip                   TEXT,
  phone                 TEXT,
  website               TEXT,
  email                 TEXT,
  ages                  TEXT,                        -- e.g. "Ages 6-12" or "All Ages"
  description           TEXT,
  photo_url             TEXT,
  price_range           TEXT CHECK (price_range IN ('free','under-100','100-250','250-plus','varies')),
  registration_status   TEXT CHECK (registration_status IN ('open','waitlist','full','tbd')) DEFAULT 'open',
  indoor_outdoor        TEXT CHECK (indoor_outdoor IN ('indoor','outdoor','both')),
  financial_aid_available BOOLEAN DEFAULT FALSE,
  featured              BOOLEAN NOT NULL DEFAULT FALSE,
  slug                  TEXT UNIQUE NOT NULL,
  neighborhood_tag      TEXT,                        -- prattville | wetumpka | millbrook | pike-road | eastchase | montgomery
  publication           TEXT NOT NULL DEFAULT 'RRP',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sfg_category    ON summer_fun_guide(category);
CREATE INDEX IF NOT EXISTS idx_sfg_publication ON summer_fun_guide(publication);
CREATE INDEX IF NOT EXISTS idx_sfg_featured    ON summer_fun_guide(featured);
CREATE INDEX IF NOT EXISTS idx_sfg_neighborhood ON summer_fun_guide(neighborhood_tag);

ALTER TABLE summer_fun_guide ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read summer_fun_guide"
  ON summer_fun_guide FOR SELECT USING (true);

CREATE POLICY "Super admin full access to summer_fun_guide"
  ON summer_fun_guide
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Email capture leads (Summer Guide PDF requests → GHL)
CREATE TABLE IF NOT EXISTS summer_guide_leads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL,
  source      TEXT DEFAULT 'summer-guide-2026',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE summer_guide_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin access to summer_guide_leads"
  ON summer_guide_leads
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

CREATE POLICY "Anyone can insert summer_guide_leads"
  ON summer_guide_leads FOR INSERT WITH CHECK (true);
