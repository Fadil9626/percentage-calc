-- Branches: each one keeps its own monthly ledgers, has its own shareholders, and closes and
-- splits its own profit. Data-entry staff are given the branches they may work in; admins have all.
--
-- What was here before becomes the branch "Main", so nothing is lost and every month, transaction
-- and payout stays where it was. Safe to run more than once.

CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_branches_name ON branches (LOWER(name));

INSERT INTO branches (name)
SELECT 'Main' WHERE NOT EXISTS (SELECT 1 FROM branches);

-- Every ledger belongs to a branch.
ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
UPDATE ledgers SET branch_id = (SELECT id FROM branches ORDER BY created_at LIMIT 1) WHERE branch_id IS NULL;
ALTER TABLE ledgers ALTER COLUMN branch_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledgers_branch ON ledgers (branch_id, created_at DESC);

-- One ledger per month per branch (it was one per month).
DROP INDEX IF EXISTS uniq_ledgers_month;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ledgers_branch_month ON ledgers (branch_id, month);

-- Every shareholder belongs to a branch, and is paid from that branch's profit.
ALTER TABLE shareholders ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
UPDATE shareholders SET branch_id = (SELECT id FROM branches ORDER BY created_at LIMIT 1) WHERE branch_id IS NULL;
ALTER TABLE shareholders ALTER COLUMN branch_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shareholders_branch ON shareholders (branch_id);

-- Which branches each data-entry user works in. (Admins work in every branch.)
CREATE TABLE IF NOT EXISTS user_branches (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, branch_id)
);
INSERT INTO user_branches (user_id, branch_id)
SELECT u.id, (SELECT id FROM branches ORDER BY created_at LIMIT 1)
  FROM users u
 WHERE u.role <> 'ADMIN'
   AND NOT EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = u.id);
