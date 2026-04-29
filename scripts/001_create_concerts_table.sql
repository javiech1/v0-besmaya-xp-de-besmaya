-- Create concerts table for tour dates
CREATE TABLE IF NOT EXISTS public.concerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  sala TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.concerts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (anyone can view concerts)
CREATE POLICY "Allow public read access to concerts"
ON public.concerts FOR SELECT
USING (true);

-- Writes go through the cron cleanup route using SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS. No public INSERT/UPDATE/DELETE policies — the anon key
-- ships to the browser, so opening writes here = anyone can wipe the table.

-- Insert initial concert data
INSERT INTO public.concerts (fecha, ciudad, sala, link) VALUES
('30-ene', 'Valencia', 'Palau Alameda', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('31-ene', 'Zaragoza', 'Sala Oasis', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('06-feb', 'A Coruña', 'Sala INN', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('07-feb', 'Oviedo', 'Sala Tribeca', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('13-feb', 'Madrid', 'Live Las Ventas', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('19-feb', 'Murcia', 'Sala REM', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('05-mar', 'Granada', 'Sala El tren', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('06-mar', 'Córdoba', 'Sala Impala', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('19-mar', 'Pamplona', 'Sala Zentral', 'https://acqustic-platform.sumupstore.com/categoria/besmaya'),
('21-mar', 'Valladolid', 'Sala Lava', 'https://acqustic-platform.sumupstore.com/categoria/besmaya')
ON CONFLICT DO NOTHING;
