-- Shareholders — the people profit is distributed to.
--
-- This table was added to the running database by hand and never written down,
-- so init.sql doesn't create it while every distribution query depends on it:
-- a fresh install from the committed schema crashes on the first close. The
-- distributions table also gained shareholder_id, replacing the original
-- user_id, without that being recorded either.
--
-- Idempotent, so it is safe to run against a database that already has these.

CREATE TABLE IF NOT EXISTS shareholders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255),
  -- Bounded at the column, not just in the controller: a percentage outside
  -- 0–100 is money paid to nobody or money that doesn't exist.
  share_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00
                     CHECK (share_percentage >= 0 AND share_percentage <= 100),
  -- Priority partners take their percentage off the top; everyone else splits
  -- what's left.
  is_priority      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shareholders_active ON shareholders (is_active, is_priority);

-- distributions.shareholder_id — the code writes this; init.sql still declares
-- the older user_id column.
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS shareholder_id UUID REFERENCES shareholders(id);
CREATE INDEX IF NOT EXISTS idx_distributions_shareholder_id ON distributions (shareholder_id);

-- The original user_id is NOT NULL, which blocks inserts that only set
-- shareholder_id. Relax it rather than dropping the column, so existing rows
-- and any historical reporting that reads it stay intact.
ALTER TABLE distributions ALTER COLUMN user_id DROP NOT NULL;

-- A ledger must not be closed twice — the application locks the row, but the
-- database should refuse it regardless.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_distribution_ledger_per_ledger
  ON distribution_ledger (ledger_id);
