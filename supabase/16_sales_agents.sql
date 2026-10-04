-- ============================================================
-- 16_sales_agents.sql
-- Independent Sales Agent system for ElevateAI
-- Contract terms: K250 activity fee / K1,000 conversion bonus /
--                 10% commission on first 5 paid months
-- ============================================================

-- Agent profiles (one row per salesperson)
CREATE TABLE IF NOT EXISTS sales_agents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name           TEXT NOT NULL,
  nrc_number          TEXT,
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  is_active           BOOLEAN DEFAULT true,
  contract_signed_at  TIMESTAMPTZ,
  payment_method      TEXT CHECK (payment_method IN ('airtel_money','mtn_momo','bank_transfer')),
  payment_details     TEXT,  -- mobile number or bank account
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly restaurant leads — the 25 restaurants each agent plans to contact
CREATE TABLE IF NOT EXISTS agent_leads (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  month                   DATE NOT NULL,  -- first day of month e.g. 2026-10-01
  restaurant_name         TEXT NOT NULL,
  location                TEXT,           -- city / country
  phone                   TEXT,
  contact_person          TEXT,
  status                  TEXT DEFAULT 'pending' CHECK (status IN (
                            'pending','contacted','interested',
                            'free_trial','activated','lost')),
  qualified_calls         INT DEFAULT 0,  -- fast counter
  last_call_at            TIMESTAMPTZ,
  notes                   TEXT,
  claimed_at              TIMESTAMPTZ DEFAULT NOW(),  -- first-submitted wins
  converted_restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Individual qualified call records per lead
CREATE TABLE IF NOT EXISTS agent_calls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES agent_leads(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL REFERENCES sales_agents(id) ON DELETE CASCADE,
  call_date   TIMESTAMPTZ DEFAULT NOW(),
  call_type   TEXT DEFAULT 'phone' CHECK (call_type IN ('phone','whatsapp','in_person')),
  outcome     TEXT DEFAULT 'other' CHECK (outcome IN (
                'interested','not_interested','callback',
                'free_trial','no_answer','other')),
  notes       TEXT,
  is_verified BOOLEAN DEFAULT false,  -- admin can verify/unqualify
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks when an agent lead converts to a paying ElevateAI restaurant
CREATE TABLE IF NOT EXISTS agent_conversions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                 UUID REFERENCES agent_leads(id),
  agent_id                UUID NOT NULL REFERENCES sales_agents(id),
  restaurant_id           UUID REFERENCES restaurants(id) ON DELETE SET NULL UNIQUE,
  free_trial_started_at   TIMESTAMPTZ DEFAULT NOW(),
  activated_at            TIMESTAMPTZ,       -- paid activation fee → K1,000 bonus
  activation_bonus_paid   BOOLEAN DEFAULT false,
  paid_months             INT DEFAULT 0,     -- 0–5
  total_commission_earned DECIMAL(10,2) DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Per-month performance fee records (admin enters; 10% = agent commission)
CREATE TABLE IF NOT EXISTS agent_commission_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id    UUID NOT NULL REFERENCES agent_conversions(id) ON DELETE CASCADE,
  agent_id         UUID NOT NULL REFERENCES sales_agents(id),
  paid_month       DATE NOT NULL,
  performance_fee  DECIMAL(10,2) NOT NULL CHECK (performance_fee >= 0),
  commission_amount DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(performance_fee * 0.10, 2)) STORED,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','included','paid')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversion_id, paid_month)
);

-- Monthly payout records (one row per agent per month; admin approves & marks paid)
CREATE TABLE IF NOT EXISTS agent_payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            UUID NOT NULL REFERENCES sales_agents(id),
  month               DATE NOT NULL,
  qualified_calls     INT DEFAULT 0,
  activity_fee        DECIMAL(10,2) DEFAULT 0,   -- computed from qualified_calls
  conversion_bonuses  DECIMAL(10,2) DEFAULT 0,   -- K1,000 per activation
  commission          DECIMAL(10,2) DEFAULT 0,   -- 10% of perf fees
  total               DECIMAL(10,2) GENERATED ALWAYS AS (
                        activity_fee + conversion_bonuses + commission
                      ) STORED,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  paid_at             TIMESTAMPTZ,
  payment_method      TEXT,
  payment_reference   TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, month)
);

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_agent_lead_call_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- When a call is inserted that counts as qualified (not no_answer), increment counter
  IF NEW.outcome != 'no_answer' THEN
    UPDATE agent_leads
    SET
      qualified_calls = qualified_calls + 1,
      last_call_at    = NEW.call_date,
      updated_at      = NOW()
    WHERE id = NEW.lead_id;
  ELSE
    -- Still update last_call_at even for no_answer
    UPDATE agent_leads
    SET last_call_at = NEW.call_date, updated_at = NOW()
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_calls_after_insert
  AFTER INSERT ON agent_calls
  FOR EACH ROW EXECUTE FUNCTION update_agent_lead_call_stats();

CREATE OR REPLACE TRIGGER trg_updated_at_sales_agents
  BEFORE UPDATE ON sales_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_agent_leads
  BEFORE UPDATE ON agent_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_agent_conversions
  BEFORE UPDATE ON agent_conversions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_updated_at_agent_payouts
  BEFORE UPDATE ON agent_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Helper function ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_activity_fee(p_qualified_calls INT)
RETURNS DECIMAL AS $$
BEGIN
  IF p_qualified_calls >= 25 THEN RETURN 250.00;
  ELSE RETURN (p_qualified_calls * 10)::DECIMAL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── RPCs ──────────────────────────────────────────────────────────────────────

-- Agent month summary (used on agent dashboard)
CREATE OR REPLACE FUNCTION get_agent_month_summary(
  p_agent_id UUID,
  p_month    DATE DEFAULT DATE_TRUNC('month', NOW())::DATE
)
RETURNS JSON AS $$
DECLARE
  v_leads_count       INT;
  v_qualified_calls   INT;
  v_activity_fee      DECIMAL;
  v_conversions       INT;
  v_bonuses_earned    DECIMAL;
  v_commission_earned DECIMAL;
BEGIN
  p_month := DATE_TRUNC('month', p_month)::DATE;

  SELECT COUNT(*) INTO v_leads_count
  FROM agent_leads WHERE agent_id = p_agent_id AND DATE_TRUNC('month', month) = p_month;

  SELECT COALESCE(SUM(qualified_calls), 0) INTO v_qualified_calls
  FROM agent_leads WHERE agent_id = p_agent_id AND DATE_TRUNC('month', month) = p_month;

  v_activity_fee := calculate_activity_fee(v_qualified_calls);

  SELECT COUNT(*) INTO v_conversions
  FROM agent_conversions WHERE agent_id = p_agent_id AND activated_at IS NOT NULL;

  SELECT COALESCE(SUM(CASE WHEN activation_bonus_paid THEN 0 ELSE 1000.00 END), 0)
  INTO v_bonuses_earned
  FROM agent_conversions
  WHERE agent_id = p_agent_id
    AND activated_at IS NOT NULL
    AND DATE_TRUNC('month', activated_at) = p_month;

  SELECT COALESCE(SUM(commission_amount), 0) INTO v_commission_earned
  FROM agent_commission_records
  WHERE agent_id = p_agent_id AND DATE_TRUNC('month', paid_month) = p_month;

  RETURN json_build_object(
    'leads_submitted',   v_leads_count,
    'leads_remaining',   GREATEST(0, 25 - v_leads_count),
    'qualified_calls',   v_qualified_calls,
    'calls_remaining',   GREATEST(0, 25 - v_qualified_calls),
    'activity_fee',      v_activity_fee,
    'conversions_total', v_conversions,
    'bonuses_this_month', v_bonuses_earned,
    'commission_this_month', v_commission_earned,
    'total_earnings_this_month', v_activity_fee + v_bonuses_earned + v_commission_earned
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- All claimed restaurants for a month (any agent) — for duplicate checking
CREATE OR REPLACE FUNCTION get_all_claimed_restaurants(
  p_month DATE DEFAULT DATE_TRUNC('month', NOW())::DATE
)
RETURNS TABLE (
  lead_id         UUID,
  agent_id        UUID,
  agent_name      TEXT,
  restaurant_name TEXT,
  location        TEXT,
  phone           TEXT,
  claimed_at      TIMESTAMPTZ,
  is_mine         BOOLEAN
) AS $$
BEGIN
  p_month := DATE_TRUNC('month', p_month)::DATE;
  RETURN QUERY
  SELECT
    l.id,
    l.agent_id,
    a.full_name,
    l.restaurant_name,
    l.location,
    l.phone,
    l.claimed_at,
    (l.agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1))
  FROM agent_leads l
  JOIN sales_agents a ON a.id = l.agent_id
  WHERE DATE_TRUNC('month', l.month) = p_month
  ORDER BY l.claimed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agent lifetime earnings summary
CREATE OR REPLACE FUNCTION get_agent_earnings_summary(p_agent_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_calls         INT;
  v_total_activity      DECIMAL;
  v_total_bonuses       DECIMAL;
  v_total_commission    DECIMAL;
  v_paid_out            DECIMAL;
  v_pending             DECIMAL;
  v_restaurants_active  INT;
BEGIN
  SELECT COALESCE(SUM(qualified_calls), 0) INTO v_total_calls
  FROM agent_leads WHERE agent_id = p_agent_id;

  SELECT COALESCE(SUM(activity_fee), 0) INTO v_total_activity
  FROM agent_payouts WHERE agent_id = p_agent_id;

  SELECT COALESCE(COUNT(*) * 1000.0, 0) INTO v_total_bonuses
  FROM agent_conversions WHERE agent_id = p_agent_id AND activated_at IS NOT NULL;

  SELECT COALESCE(SUM(commission_amount), 0) INTO v_total_commission
  FROM agent_commission_records WHERE agent_id = p_agent_id;

  SELECT COALESCE(SUM(total), 0) INTO v_paid_out
  FROM agent_payouts WHERE agent_id = p_agent_id AND status = 'paid';

  SELECT COALESCE(SUM(total), 0) INTO v_pending
  FROM agent_payouts WHERE agent_id = p_agent_id AND status IN ('pending','approved');

  SELECT COUNT(*) INTO v_restaurants_active
  FROM agent_conversions WHERE agent_id = p_agent_id AND paid_months < 5;

  RETURN json_build_object(
    'total_calls',         v_total_calls,
    'total_activity_fees', v_total_activity,
    'total_bonuses',       v_total_bonuses,
    'total_commission',    v_total_commission,
    'grand_total',         v_total_activity + v_total_bonuses + v_total_commission,
    'paid_out',            v_paid_out,
    'pending_payout',      v_pending,
    'active_restaurants',  v_restaurants_active
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin overview: all agents with current-month stats
CREATE OR REPLACE FUNCTION get_agents_admin_overview()
RETURNS TABLE (
  agent_id          UUID,
  full_name         TEXT,
  phone             TEXT,
  is_active         BOOLEAN,
  month_leads       BIGINT,
  month_calls       BIGINT,
  total_conversions BIGINT,
  unpaid_total      DECIMAL,
  lifetime_earned   DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.full_name,
    a.phone,
    a.is_active,
    COUNT(DISTINCT l.id) FILTER (
      WHERE DATE_TRUNC('month', l.month) = DATE_TRUNC('month', NOW())
    ),
    COALESCE(SUM(l.qualified_calls) FILTER (
      WHERE DATE_TRUNC('month', l.month) = DATE_TRUNC('month', NOW())
    ), 0),
    COUNT(DISTINCT c.id) FILTER (WHERE c.activated_at IS NOT NULL),
    COALESCE(SUM(p.total) FILTER (WHERE p.status IN ('pending','approved')), 0),
    COALESCE(SUM(p.total), 0)
  FROM sales_agents a
  LEFT JOIN agent_leads l ON l.agent_id = a.id
  LEFT JOIN agent_conversions c ON c.agent_id = a.id
  LEFT JOIN agent_payouts p ON p.agent_id = a.id
  GROUP BY a.id, a.full_name, a.phone, a.is_active
  ORDER BY a.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

ALTER TABLE sales_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_payouts ENABLE ROW LEVEL SECURITY;

-- sales_agents: agents see their own row; super admins see all
CREATE POLICY "agents_select_own"
  ON sales_agents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "agents_update_own"
  ON sales_agents FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- agent_leads: agent sees/manages their own leads
CREATE POLICY "leads_select_own"
  ON agent_leads FOR SELECT
  USING (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "leads_insert_own"
  ON agent_leads FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "leads_update_own"
  ON agent_leads FOR UPDATE
  USING (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "leads_delete_own"
  ON agent_leads FOR DELETE
  USING (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));

-- agent_calls
CREATE POLICY "calls_select_own"
  ON agent_calls FOR SELECT
  USING (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "calls_insert_own"
  ON agent_calls FOR INSERT
  WITH CHECK (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));

-- agent_conversions: read-only for agents (admin manages these)
CREATE POLICY "conversions_select_own"
  ON agent_conversions FOR SELECT
  USING (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));

-- agent_commission_records: read-only for agents
CREATE POLICY "commission_select_own"
  ON agent_commission_records FOR SELECT
  USING (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));

-- agent_payouts: read-only for agents
CREATE POLICY "payouts_select_own"
  ON agent_payouts FOR SELECT
  USING (agent_id = (SELECT id FROM sales_agents WHERE user_id = auth.uid() LIMIT 1));
