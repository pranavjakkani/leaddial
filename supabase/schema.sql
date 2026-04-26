-- Run this in your Supabase SQL Editor
-- Dashboard: https://app.supabase.com → SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Lead info (from site manager)
  first_name TEXT NOT NULL,
  phone TEXT NOT NULL,                        -- E.164 format: +919820000001
  salutation TEXT DEFAULT 'Sir',              -- Sir | Ma'am
  source TEXT DEFAULT 'NoBroker',             -- NoBroker | Housing.com | MagicBricks | Direct
  bhk_type TEXT DEFAULT '2 BHK',             -- 1 BHK | 2 BHK | 3 BHK
  
  -- Call status
  status TEXT DEFAULT 'pending',
  -- pending | calling | visit_confirmed | callback_requested | not_interested | follow_up | no_answer
  
  -- Extracted by Bolna agent post-call
  possession_preference TEXT,                 -- ready | under_construction | both
  confirmed_bhk TEXT,                         -- e.g. 2 BHK
  budget_range TEXT,                          -- e.g. 80 lakh to 1 crore
  visit_slot TEXT,                            -- e.g. Saturday afternoon
  call_outcome TEXT,                          -- visit_confirmed | callback_requested | not_interested | follow_up | no_answer
  call_summary TEXT,                          -- 2-3 sentence natural language summary
  lead_score INTEGER,                         -- 1-10
  
  -- Bolna tracking
  bolna_call_id TEXT,                         -- stored when call is triggered
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (disable for demo, enable for production)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow all operations from service role (server-side)
CREATE POLICY "Service role full access" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed sample leads for demo
INSERT INTO leads (first_name, phone, salutation, source, bhk_type, status)
VALUES
  ('Rahul Mehta',   '+919820001001', 'Sir',   'NoBroker',    '2 BHK', 'pending'),
  ('Priya Sharma',  '+919820001002', 'Ma''am', 'Housing.com', '3 BHK', 'pending'),
  ('Amit Desai',    '+919820001003', 'Sir',   'MagicBricks', '2 BHK', 'pending');
