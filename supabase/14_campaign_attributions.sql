-- Campaign attribution: tracks customers who returned after receiving a campaign.
-- One row per (campaign, customer) — only the first return visit after the campaign is sent.

CREATE TABLE IF NOT EXISTS campaign_attributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  visit_id        UUID REFERENCES visits(id) ON DELETE SET NULL,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  attributed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_attributions_campaign  ON campaign_attributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_attributions_customer  ON campaign_attributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_attributions_restaurant ON campaign_attributions(restaurant_id);

ALTER TABLE campaign_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant members can access campaign_attributions"
  ON campaign_attributions FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ─────────────────────────────────────────────────────────────
-- RPC: get_campaign_attribution_stats
-- Returns attributed visit count and revenue per campaign for a restaurant.
-- Revenue = sum of non-cancelled orders placed by attributed customers
--           after the attribution timestamp.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_campaign_attribution_stats(p_restaurant_id UUID)
RETURNS TABLE (
  campaign_id        UUID,
  attributed_visits  BIGINT,
  attributed_revenue NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ca.campaign_id,
    COUNT(DISTINCT ca.customer_id)                      AS attributed_visits,
    COALESCE(SUM(o.total_amount), 0)                    AS attributed_revenue
  FROM campaign_attributions ca
  LEFT JOIN orders o
    ON  o.customer_id   = ca.customer_id
    AND o.restaurant_id = ca.restaurant_id
    AND o.created_at   >= ca.attributed_at
    AND o.status       != 'cancelled'
  WHERE ca.restaurant_id = p_restaurant_id
  GROUP BY ca.campaign_id
$$;

-- ─────────────────────────────────────────────────────────────
-- RPC: get_campaign_attributed_customers
-- Returns individual attributed customers and their post-attribution
-- order totals for a single campaign — used for the detail view.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_campaign_attributed_customers(p_campaign_id UUID)
RETURNS TABLE (
  customer_id    UUID,
  customer_name  TEXT,
  phone          TEXT,
  attributed_at  TIMESTAMPTZ,
  visit_count    BIGINT,
  total_spent    NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ca.customer_id,
    c.name                                              AS customer_name,
    c.phone,
    ca.attributed_at,
    COUNT(DISTINCT v.id)                                AS visit_count,
    COALESCE(SUM(o.total_amount), 0)                    AS total_spent
  FROM campaign_attributions ca
  JOIN customers c ON c.id = ca.customer_id
  LEFT JOIN visits v
    ON  v.customer_id   = ca.customer_id
    AND v.restaurant_id = ca.restaurant_id
    AND v.visit_date   >= ca.attributed_at
  LEFT JOIN orders o
    ON  o.customer_id   = ca.customer_id
    AND o.restaurant_id = ca.restaurant_id
    AND o.created_at   >= ca.attributed_at
    AND o.status       != 'cancelled'
  WHERE ca.campaign_id = p_campaign_id
  GROUP BY ca.customer_id, c.name, c.phone, ca.attributed_at
  ORDER BY ca.attributed_at DESC
$$;
