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

-- For now, allow anyone to insert/update/delete festivals
-- In production, you might want to restrict this to authenticated users
CREATE POLICY "Allow public insert access to festis"
ON public.festis FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to festis"
ON public.festis FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access to festis"
ON public.festis FOR DELETE
USING (true);
