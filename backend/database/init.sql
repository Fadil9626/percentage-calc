-- Create ENUM types
CREATE TYPE user_role AS ENUM ('ADMIN', 'PARTNER', 'DATA_ENTRY');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE ledger_status AS ENUM ('OPEN', 'CLOSED');

-- Users table (replaces partners)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  is_priority BOOLEAN DEFAULT FALSE,
  share_percentage NUMERIC(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Ledgers table
CREATE TABLE ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  status ledger_status DEFAULT 'OPEN',
  total_income NUMERIC(12,2) DEFAULT 0.00,
  total_expense NUMERIC(12,2) DEFAULT 0.00,
  net_profit NUMERIC(12,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMP
);

-- Transactions table (line items)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category VARCHAR(100),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Distribution ledger (records the waterfall calculation for each closed month)
CREATE TABLE distribution_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE UNIQUE,
  distribution_data JSONB NOT NULL, -- Stores the complete calculation result
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  calculated_by UUID NOT NULL REFERENCES users(id)
);

-- Distributions table (individual partner distributions for closed months)
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_ledger_id UUID NOT NULL REFERENCES distribution_ledger(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  share_percentage NUMERIC(5,2) NOT NULL,
  net_profit_share NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_ledgers_month ON ledgers(month);
CREATE INDEX idx_ledgers_status ON ledgers(status);
CREATE INDEX idx_transactions_ledger_id ON transactions(ledger_id);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_distribution_ledger_id ON distribution_ledger(ledger_id);
CREATE INDEX idx_distributions_user_id ON distributions(user_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, name, role, is_priority, share_percentage, is_active)
VALUES (
  'admin@percentagecalc.com',
  '$2a$10$aUOgwcdpHEt9GoDx01f6mu3akSnIECrqLWS0lADEI4XA9mlsrFV9W',
  'System Administrator',
  'ADMIN',
  TRUE,
  0.00,
  TRUE
);

-- Insert sample partners for testing (password: admin123)
INSERT INTO users (email, password_hash, name, role, is_priority, share_percentage, is_active)
VALUES
  ('partner1@example.com', '$2a$10$aUOgwcdpHEt9GoDx01f6mu3akSnIECrqLWS0lADEI4XA9mlsrFV9W', 'Partner One', 'PARTNER', TRUE, 40.00, TRUE),
  ('partner2@example.com', '$2a$10$aUOgwcdpHEt9GoDx01f6mu3akSnIECrqLWS0lADEI4XA9mlsrFV9W', 'Partner Two', 'PARTNER', FALSE, 30.00, TRUE),
  ('dataentry@example.com', '$2a$10$aUOgwcdpHEt9GoDx01f6mu3akSnIECrqLWS0lADEI4XA9mlsrFV9W', 'Data Entry Staff', 'DATA_ENTRY', FALSE, 0.00, TRUE);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ledgers_updated_at BEFORE UPDATE ON ledgers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Safety rules (see migration_safety_rules.sql): real positive amounts, known types and statuses,
-- one ledger per month.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_amount_positive') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0 AND amount <> 'NaN'::numeric);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_type_known') THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_known CHECK (type IN ('INCOME', 'EXPENSE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledgers_status_known') THEN
    ALTER TABLE ledgers ADD CONSTRAINT ledgers_status_known CHECK (status IN ('OPEN', 'CLOSED'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ledgers_month ON ledgers (month);
