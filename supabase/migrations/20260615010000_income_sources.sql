-- Expected monthly income (planning figures, e.g. salaries). Used to show
-- "salary after recurring expenses". These do NOT create transactions —
-- actual paychecks are logged as income transactions separately.
CREATE TABLE income_sources (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),  -- monthly amount in minor units
  currency     text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_sources: own rows" ON income_sources
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON COLUMN income_sources.amount_cents IS 'Expected monthly income amount in minor units (cents/céntimos).';
