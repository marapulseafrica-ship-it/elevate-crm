-- Scale indexes for 100+ restaurants with 10k+ customers each
-- These make segment queries, dashboard loads, and analytics fast at volume

-- Customers: segment computation and filtering
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_last_visit
  ON customers (restaurant_id, last_visit_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_total_visits
  ON customers (restaurant_id, total_visits);

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_phone
  ON customers (restaurant_id, phone);

-- Visits: chart data and recent visit queries
CREATE INDEX IF NOT EXISTS idx_visits_restaurant_date
  ON visits (restaurant_id, visit_date DESC);

CREATE INDEX IF NOT EXISTS idx_visits_customer_date
  ON visits (customer_id, visit_date DESC);

-- Orders: revenue analytics and per-customer history
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
  ON orders (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status_created
  ON orders (restaurant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_restaurant
  ON orders (customer_id, restaurant_id);

-- Order items: top items analytics
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant
  ON order_items (restaurant_id);

-- Campaigns: history table loads
CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant_created
  ON campaigns (restaurant_id, created_at DESC);

-- Campaign logs: delivery rate calculations
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_status
  ON campaign_logs (campaign_id, status);

-- Notifications: bell dropdown loads fast
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_read
  ON notifications (restaurant_id, is_read, created_at DESC);

-- Menu promotions: customer menu loads
CREATE INDEX IF NOT EXISTS idx_menu_promotions_restaurant_active
  ON menu_promotions (restaurant_id, is_active, expires_at);

-- Order feedback: feedback tab
CREATE INDEX IF NOT EXISTS idx_order_feedback_restaurant_created
  ON order_feedback (restaurant_id, created_at DESC);
