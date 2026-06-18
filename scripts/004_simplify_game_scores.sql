-- Migracion 004: simplifica game_scores para el nuevo juego "Nadie Runner".
-- El nuevo flujo guarda SOLO {alias, score} (sin email ni concierto).
-- No destructiva: conserva filas y las columnas email/concert_id (ahora opcionales).

-- 1) Quitar el UNIQUE(email) (nombre auto-generado: se localiza dinamicamente).
DO $$
DECLARE
  cons_name text;
BEGIN
  SELECT conname INTO cons_name
  FROM pg_constraint
  WHERE conrelid = 'game_scores'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(email)%';
  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE game_scores DROP CONSTRAINT %I', cons_name);
  END IF;
END $$;

-- 2) email y concert_id pasan a ser opcionales (el nuevo flujo no los envia).
ALTER TABLE game_scores ALTER COLUMN email DROP NOT NULL;
ALTER TABLE game_scores ALTER COLUMN concert_id DROP NOT NULL;

-- 3) Indices para el ranking (idempotentes). El segundo da desempate estable.
CREATE INDEX IF NOT EXISTS idx_game_scores_score_desc ON game_scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_score_created ON game_scores (score DESC, created_at ASC);

-- Las politicas RLS "No direct *" de 003 siguen vigentes: todo el acceso pasa
-- por las API routes con service role.

-- (Opcional) Arranque limpio del torneo — descomentar para vaciar el ranking:
-- TRUNCATE TABLE game_scores;
