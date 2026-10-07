-- Settings: the one row of workspace settings (currency, and the categories added later).
--
-- This used to stop a fresh install: a CHECK holding a subquery (which Postgres refuses) and an
-- INSERT whose SELECT did not match its columns. Now safe to run more than once; the app reads
-- the most recently updated row.

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(3) DEFAULT 'USD',
  currency_symbol VARCHAR(5) DEFAULT '$',
  currency_name VARCHAR(50) DEFAULT 'US Dollar',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);

-- The default row, only when there is none.
INSERT INTO settings (currency_code, currency_symbol, currency_name)
SELECT 'USD', '$', 'US Dollar'
 WHERE NOT EXISTS (SELECT 1 FROM settings);

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
