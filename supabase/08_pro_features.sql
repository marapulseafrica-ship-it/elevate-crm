-- ============================================================
-- 08_pro_features.sql  –  Pro/Premium feature schema additions
-- ============================================================

-- 1. Link orders to the promotion that was active at order time
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES menu_promotions(id) ON DELETE SET NULL;

-- 2. Post-order feedback
CREATE TABLE IF NOT EXISTS order_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating        INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Branch foundation (schema only, no UI yet)
CREATE TABLE IF NOT EXISTS branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT,
  latitude      NUMERIC,
  longitude     NUMERIC,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Google Review URL on restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_review_url TEXT;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE order_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- order_feedback: owners see all, anyone can insert
DROP POLICY IF EXISTS "Owners manage feedback" ON order_feedback;
CREATE POLICY "Owners manage feedback"
  ON order_feedback FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

DROP POLICY IF EXISTS "Public can submit feedback" ON order_feedback;
CREATE POLICY "Public can submit feedback"
  ON order_feedback FOR INSERT
  WITH CHECK (true);

-- branches: owners manage all
DROP POLICY IF EXISTS "Owners manage branches" ON branches;
CREATE POLICY "Owners manage branches"
  ON branches FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- ============================================================
-- SQL Functions
-- ============================================================

-- Revenue split by customer segment
CREATE OR REPLACE FUNCTION get_revenue_by_segment(p_restaurant_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total',           COALESCE(SUM(o.total_amount), 0),
    'new',             COALESCE(SUM(CASE WHEN c.total_visits = 1 THEN o.total_amount ELSE 0 END), 0),
    'returning',       COALESCE(SUM(CASE WHEN c.total_visits BETWEEN 2 AND 4 THEN o.total_amount ELSE 0 END), 0),
    'loyal',           COALESCE(SUM(CASE WHEN c.total_visits >= 5 THEN o.total_amount ELSE 0 END), 0),
    'avg_new',         COALESCE(AVG(CASE WHEN c.total_visits = 1 THEN o.total_amount END), 0),
    'avg_returning',   COALESCE(AVG(CASE WHEN c.total_visits BETWEEN 2 AND 4 THEN o.total_amount END), 0),
    'avg_loyal',       COALESCE(AVG(CASE WHEN c.total_visits >= 5 THEN o.total_amount END), 0),
    'count_new',       COALESCE(SUM(CASE WHEN c.total_visits = 1 THEN 1 ELSE 0 END), 0),
    'count_returning', COALESCE(SUM(CASE WHEN c.total_visits BETWEEN 2 AND 4 THEN 1 ELSE 0 END), 0),
    'count_loyal',     COALESCE(SUM(CASE WHEN c.total_visits >= 5 THEN 1 ELSE 0 END), 0)
  ) INTO v_result
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  WHERE o.restaurant_id = p_restaurant_id
    AND o.status = 'completed';

  RETURN v_result;
END;
$$;

-- Per-item sales statistics
CREATE OR REPLACE FUNCTION get_item_sales_stats(p_restaurant_id UUID, p_days INT DEFAULT 30)
RETURNS TABLE (
  item_name       TEXT,
  total_quantity  BIGINT,
  total_revenue   NUMERIC,
  order_count     BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.item_name,
    SUM(oi.quantity)::BIGINT                AS total_quantity,
    SUM(oi.subtotal)                        AS total_revenue,
    COUNT(DISTINCT oi.order_id)::BIGINT     AS order_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.restaurant_id = p_restaurant_id
    AND o.status = 'completed'
    AND o.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY oi.item_name
  ORDER BY total_quantity DESC;
END;
$$;

-- Promo ROI
CREATE OR REPLACE FUNCTION get_promo_roi(p_restaurant_id UUID, p_promotion_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_revenue',    COALESCE(SUM(o.total_amount), 0),
    'customers_used',   COUNT(DISTINCT o.customer_id),
    'order_count',      COUNT(o.id)
  ) INTO v_result
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.promotion_id  = p_promotion_id
    AND o.status        = 'completed';

  RETURN v_result;
END;
$$;

-- Order patterns by hour and day
CREATE OR REPLACE FUNCTION get_order_patterns(p_restaurant_id UUID)
RETURNS TABLE (
  hour_of_day    INT,
  day_of_week    INT,
  order_count    BIGINT,
  total_revenue  NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Africa/Lusaka')::INT  AS hour_of_day,
    EXTRACT(DOW  FROM o.created_at AT TIME ZONE 'Africa/Lusaka')::INT  AS day_of_week,
    COUNT(o.id)::BIGINT                                                 AS order_count,
    COALESCE(SUM(o.total_amount), 0)                                    AS total_revenue
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.status = 'completed'
  GROUP BY 1, 2
  ORDER BY order_count DESC;
END;
$$;
