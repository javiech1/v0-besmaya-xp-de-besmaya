-- Tabla para almacenar los scores del Torneo de Nadie
-- Los emails son privados y nunca se exponen al cliente
-- El ranking solo muestra alias + score

CREATE TABLE IF NOT EXISTS game_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alias TEXT NOT NULL CHECK (char_length(alias) BETWEEN 1 AND 20),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 999999),
  email TEXT NOT NULL UNIQUE,
  concert_id UUID REFERENCES concerts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_score_desc ON game_scores (score DESC);

ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Sin acceso público directo: todo pasa por API routes con service role
CREATE POLICY "No direct select" ON game_scores FOR SELECT USING (false);
CREATE POLICY "No direct insert" ON game_scores FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update" ON game_scores FOR UPDATE USING (false);
CREATE POLICY "No direct delete" ON game_scores FOR DELETE USING (false);
