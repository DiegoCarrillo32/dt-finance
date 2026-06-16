-- ─── debts ────────────────────────────────────────────────────────────────────
CREATE TABLE debts (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  type                  text NOT NULL DEFAULT 'other'
                        CHECK (type IN ('credit_card', 'personal_loan', 'mortgage', 'student_loan', 'other')),
  creditor              text,
  original_amount_cents integer NOT NULL CHECK (original_amount_cents > 0),
  current_balance_cents integer NOT NULL CHECK (current_balance_cents >= 0),
  interest_rate_bps     integer NOT NULL DEFAULT 0 CHECK (interest_rate_bps >= 0),
  minimum_payment_cents integer NOT NULL DEFAULT 0 CHECK (minimum_payment_cents >= 0),
  due_day_of_month      integer CHECK (due_day_of_month BETWEEN 1 AND 28),
  currency              text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_debts_user ON debts (user_id);
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debts: own rows" ON debts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text NOT NULL,
  amount_cents      integer NOT NULL CHECK (amount_cents > 0),
  currency          text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  billing_period    text NOT NULL DEFAULT 'monthly'
                    CHECK (billing_period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_billing_date date,
  notes             text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions (user_id);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions: own rows" ON subscriptions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
