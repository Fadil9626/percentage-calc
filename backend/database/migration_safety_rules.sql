-- Rules the database keeps, whatever sends it data.
--
-- An amount of NaN was accepted (Postgres numeric allows it) and turned the month's totals, and
-- the profit split worked out from them, into NaN. A second ledger could be given a month that
-- already had one by editing it. Types and statuses were free text.
-- Safe to run more than once.

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
