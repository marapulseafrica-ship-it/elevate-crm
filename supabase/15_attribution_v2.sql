-- Attribution v2:
--  • Allow multiple attributions per customer per campaign (one per visit)
--  • Add campaign_id to orders for direct order→campaign matching

-- 1. Drop old unique constraint and add per-visit one
ALTER TABLE campaign_attributions
  DROP CONSTRAINT IF EXISTS campaign_attributions_campaign_id_customer_id_key;

ALTER TABLE campaign_attributions
  ADD CONSTRAINT campaign_attributions_campaign_customer_visit_key
  UNIQUE (campaign_id, customer_id, visit_id);

-- 2. Add campaign_id to orders (nullable — guest orders, orders without attribution)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_campaign_id ON orders(campaign_id) WHERE campaign_id IS NOT NULL;

-- 3. Replace get_campaign_attribution_stats
--    Now counts total return visits AND unique customers, plus revenue from attributed orders
CREATE OR REPLACE FUNCTION get_campaign_attribution_stats(p_restaurant_id UUID)
RETURNS TABLE (
  campaign_id         UUID,
  attributed_visits   BIGINT,   -- total return visits (including repeat)
  unique_customers    BIGINT,   -- distinct customers who came back
  attributed_revenue  NUMERIC   -- revenue from orders tagged with this campaign
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ca.campaign_id,
    COUNT(ca.id)                           AS attributed_visits,
    COUNT(DISTINCT ca.customer_id)         AS unique_customers,
    COALESCE(SUM(o.total_amount), 0)       AS attributed_revenue
  FROM campaign_attributions ca
  LEFT JOIN orders o
    ON  o.campaign_id   = ca.campaign_id
    AND o.customer_id   = ca.customer_id
    AND o.restaurant_id = ca.restaurant_id
    AND o.status        != 'cancelled'
  WHERE ca.restaurant_id = p_restaurant_id
  GROUP BY ca.campaign_id
$$;

-- 4. Replace get_campaign_attributed_customers
--    Shows per-customer summary: visits, orders, spend after their first attribution
CREATE OR REPLACE FUNCTION get_campaign_attributed_customers(p_campaign_id UUID)
RETURNS TABLE (
  customer_id    UUID,
  customer_name  TEXT,
  phone          TEXT,
  first_return   TIMESTAMPTZ,
  visit_count    BIGINT,
  order_count    BIGINT,
  total_spent    NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ca.customer_id,
    c.name                                    AS customer_name,
    c.phone,
    MIN(ca.attributed_at)                     AS first_return,
    COUNT(DISTINCT ca.visit_id)               AS visit_count,
    COUNT(DISTINCT o.id)                      AS order_count,
    COALESCE(SUM(o.total_amount), 0)          AS total_spent
  FROM campaign_attributions ca
  JOIN customers c ON c.id = ca.customer_id
  LEFT JOIN orders o
    ON  o.campaign_id   = ca.campaign_id
    AND o.customer_id   = ca.customer_id
    AND o.status       != 'cancelled'
  WHERE ca.campaign_id = p_campaign_id
  GROUP BY ca.customer_id, c.name, c.phone
  ORDER BY MIN(ca.attributed_at) DESC
$$;
