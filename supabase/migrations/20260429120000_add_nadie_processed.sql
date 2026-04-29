-- Track which user comments have been processed (or claimed) by Nadie batch processor
ALTER TABLE muro_comments
  ADD COLUMN IF NOT EXISTS nadie_processed boolean NOT NULL DEFAULT false;

-- Mark all existing rows as processed so the next webhook only picks up genuinely new ones
UPDATE muro_comments SET nadie_processed = true WHERE nadie_processed = false;

-- Partial index for fast lookup of pending comments
CREATE INDEX IF NOT EXISTS muro_comments_pending_nadie_idx
  ON muro_comments (created_at)
  WHERE nadie_processed = false AND is_nadie = false;

-- Single-row table used as a distributed mutex for the Nadie batch processor.
-- Acquired by an UPDATE ... WHERE locked_until < now() that is atomic at the row level.
-- Auto-expires after 30s if a worker crashes mid-processing.
CREATE TABLE IF NOT EXISTS nadie_lock (
  id integer PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  CONSTRAINT nadie_lock_singleton CHECK (id = 1)
);

INSERT INTO nadie_lock (id, locked_until)
VALUES (1, now() - interval '1 second')
ON CONFLICT (id) DO NOTHING;
