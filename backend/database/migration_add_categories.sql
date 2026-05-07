ALTER TABLE settings ADD COLUMN IF NOT EXISTS categories JSONB;
UPDATE settings SET categories = '[
  {"name":"Sales","type":"INCOME"},
  {"name":"Consulting","type":"INCOME"},
  {"name":"Other Income","type":"INCOME"},
  {"name":"Payroll","type":"EXPENSE"},
  {"name":"Software","type":"EXPENSE"},
  {"name":"Marketing","type":"EXPENSE"},
  {"name":"Operations","type":"EXPENSE"},
  {"name":"Other Expense","type":"EXPENSE"}
]'::jsonb WHERE categories IS NULL;
