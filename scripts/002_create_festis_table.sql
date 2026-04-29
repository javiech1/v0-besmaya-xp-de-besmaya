-- Create festis table for festival dates
CREATE TABLE IF NOT EXISTS public.festis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  sala TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.festis ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (anyone can view festivals)
CREATE POLICY "Allow public read access to festis"
ON public.festis FOR SELECT
USING (true);

-- Writes go through the cron cleanup route using SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS. No public INSERT/UPDATE/DELETE policies — the anon key
-- ships to the browser, so opening writes here = anyone can wipe the table.
