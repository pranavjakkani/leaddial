-- Run this in your Supabase SQL Editor
-- Dashboard: https://app.supabase.com → SQL Editor

-- ── Shared trigger function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── leads ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Lead info (from site manager)
  first_name TEXT NOT NULL,
  phone      TEXT NOT NULL,              -- E.164 format: +919820000001
  salutation TEXT DEFAULT 'Sir',         -- Sir | Ma'am
  source     TEXT DEFAULT 'NoBroker',    -- NoBroker | Housing.com | MagicBricks | Direct
  bhk_type   TEXT DEFAULT '2 BHK',      -- 1 BHK | 2 BHK | 3 BHK

  -- Lead status (business outcome — single source of truth)
  status TEXT DEFAULT 'pending',
  -- pending | calling | visit_confirmed | callback_requested
  -- not_interested | follow_up | no_answer

  -- Extracted by Bolna agent post-call
  possession_preference TEXT,            -- ready | under_construction | both
  confirmed_bhk         TEXT,            -- e.g. 2 BHK
  budget_range          TEXT,            -- e.g. 80 lakh to 1 crore
  visit_slot            TEXT,            -- e.g. Thursday at 5 PM
  call_outcome          TEXT,            -- mirrors status values above
  lead_score            INTEGER,         -- 1–10

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON leads
  FOR ALL USING (true) WITH CHECK (true);

-- ── calls ──────────────────────────────────────────────────────────────────
-- One row per Bolna execution. A lead can have many calls over time.

CREATE TABLE IF NOT EXISTS calls (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Bolna execution tracking
  execution_id TEXT,                     -- returned by POST /call (Bolna run_id)

  -- Post-call data (populated by webhook or sync)
  summary      TEXT,                     -- full conversation transcript
  recording_url TEXT,                    -- S3 URL from telephony_data.recording_url
  call_outcome TEXT,                     -- extracted call_outcome value

  -- Technical call state (not business outcome — use leads.status for that)
  status TEXT DEFAULT 'calling',         -- calling | completed

  -- Timestamps
  called_at  TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access calls" ON calls
  FOR ALL USING (true) WITH CHECK (true);

-- ── properties ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Property info
  name          TEXT NOT NULL,
  location      TEXT,
  configurations TEXT[] DEFAULT '{}'::text[],
  area_min      INTEGER,
  area_max      INTEGER,
  price_starting TEXT,
  description   TEXT,
  listing_type  TEXT DEFAULT 'Residential',  -- Residential | Commercial | Premium Listing
  status        TEXT DEFAULT 'pending',

  -- Bolna knowledgebase (RAG) tracking
  bolna_rag_id              TEXT,            -- rag_id returned by POST /knowledgebase
  bolna_knowledge_status    TEXT,            -- processing | processed | error
  bolna_knowledge_file_name TEXT,
  bolna_knowledge_source_type TEXT,          -- pdf | url

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access properties" ON properties
  FOR ALL USING (true) WITH CHECK (true);

-- ── Seed sample leads for demo ─────────────────────────────────────────────

INSERT INTO leads (first_name, phone, salutation, source, bhk_type, status)
VALUES
  ('Rahul Mehta',  '+919820001001', 'Sir',   'NoBroker',    '1 BHK', 'pending'),
  ('Priya Sharma', '+919820001002', 'Ma''am', 'Housing.com', '3 BHK', 'pending'),
  ('Amit Desai',   '+919820001003', 'Sir',   'MagicBricks', '2 BHK', 'pending');
