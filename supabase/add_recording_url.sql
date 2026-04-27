-- Add recording_url column to leads table
-- Run this in the Supabase SQL editor before deploying the sync changes.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS recording_url text;
