-- Adds frequency + end date to recurring expenses so non-monthly charges
-- (e.g. dog food every 3 months) and time-bounded charges (e.g. a debt that
-- ends in November) can be modeled accurately.
ALTER TABLE recurring_expenses
  ADD COLUMN frequency_months integer NOT NULL DEFAULT 1 CHECK (frequency_months IN (1, 3, 6, 12)),
  ADD COLUMN start_date date,
  ADD COLUMN end_date date;

COMMENT ON COLUMN recurring_expenses.frequency_months IS 'How often the expense recurs, in months. 1 = monthly, 3 = quarterly, 12 = yearly.';
COMMENT ON COLUMN recurring_expenses.start_date IS 'Anchor month for non-monthly frequencies (first occurrence). Null behaves as monthly.';
COMMENT ON COLUMN recurring_expenses.end_date IS 'Last date the expense applies; null means indefinite.';
