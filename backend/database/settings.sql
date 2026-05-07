-- Add settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(3) DEFAULT 'USD',
  currency_symbol VARCHAR(5) DEFAULT '$',
  currency_name VARCHAR(50) DEFAULT 'US Dollar',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);

-- Create unique constraint to ensure only one settings row
ALTER TABLE settings ADD CONSTRAINT settings_single_row CHECK (id = (SELECT id FROM settings LIMIT 1));

-- Insert default settings
INSERT INTO settings (currency_code, currency_symbol, currency_name, updated_by)
SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1
UNION ALL SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM settings)
ON CONFLICT DO NOTHING;

-- If the above doesn't work, use simpler approach
DELETE FROM settings;
INSERT INTO settings (currency_code, currency_symbol, currency_name)
VALUES ('USD', '$', 'US Dollar');

-- Create trigger for settings update timestamp
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
