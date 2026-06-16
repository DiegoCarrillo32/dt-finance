-- Enable uuid generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── accounts ──────────────────────────────────────────────────────────────
CREATE TABLE accounts (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  currency   text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── categories ────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('income', 'expense')),
  color      text NOT NULL DEFAULT '#7a1318',
  icon       text NOT NULL DEFAULT 'tag',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── transactions ──────────────────────────────────────────────────────────
CREATE TABLE transactions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id   uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id),
  type         text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency     text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  description  text NOT NULL DEFAULT '',
  date         date NOT NULL,
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON transactions (user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_account   ON transactions (account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_category  ON transactions (category_id) WHERE deleted_at IS NULL;

-- ─── recurring_expenses ────────────────────────────────────────────────────
CREATE TABLE recurring_expenses (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id   uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id),
  name         text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency     text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  day_of_month integer NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── saving_goals ──────────────────────────────────────────────────────────
CREATE TABLE saving_goals (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  target_amount_cents   integer NOT NULL CHECK (target_amount_cents > 0),
  currency              text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  current_amount_cents  integer NOT NULL DEFAULT 0,
  deadline              date,
  status                text NOT NULL CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── goal_contributions ────────────────────────────────────────────────────
CREATE TABLE goal_contributions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id        uuid NOT NULL REFERENCES saving_goals(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  amount_cents   integer NOT NULL CHECK (amount_cents > 0),
  currency       text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  date           date NOT NULL,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── budget_limits ─────────────────────────────────────────────────────────
CREATE TABLE budget_limits (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month        date NOT NULL,  -- first day of month, e.g. 2025-06-01
  limit_cents  integer NOT NULL CHECK (limit_cents > 0),
  currency     text NOT NULL CHECK (currency IN ('USD', 'CRC')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);

-- ─── exchange_rates ────────────────────────────────────────────────────────
CREATE TABLE exchange_rates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        date NOT NULL UNIQUE,
  usd_to_crc  numeric(10, 4) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saving_goals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_limits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates     ENABLE ROW LEVEL SECURITY;

-- accounts policies
CREATE POLICY "accounts: own rows" ON accounts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- categories policies
CREATE POLICY "categories: own rows" ON categories
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transactions policies
CREATE POLICY "transactions: own rows" ON transactions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recurring_expenses policies
CREATE POLICY "recurring: own rows" ON recurring_expenses
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- saving_goals policies
CREATE POLICY "goals: own rows" ON saving_goals
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- goal_contributions policies (linked to goals owned by the user)
CREATE POLICY "contributions: own goals" ON goal_contributions
  USING (
    EXISTS (
      SELECT 1 FROM saving_goals g
      WHERE g.id = goal_contributions.goal_id
        AND g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saving_goals g
      WHERE g.id = goal_contributions.goal_id
        AND g.user_id = auth.uid()
    )
  );

-- budget_limits policies
CREATE POLICY "budgets: own rows" ON budget_limits
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- exchange_rates policies — all authenticated users can read; only service role can write
CREATE POLICY "rates: authenticated read" ON exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "rates: authenticated insert" ON exchange_rates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "rates: authenticated update" ON exchange_rates
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ─── Seed default exchange rate ────────────────────────────────────────────
INSERT INTO exchange_rates (date, usd_to_crc) VALUES (CURRENT_DATE, 510.0000)
  ON CONFLICT (date) DO NOTHING;
