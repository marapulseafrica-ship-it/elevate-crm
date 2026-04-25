-- ============================================================
-- 07_menu_orders.sql — Menu system: categories, items, promos, orders
-- ============================================================

-- Menu categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name          TEXT           NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2)  NOT NULL CHECK (price >= 0),
  image_url     TEXT,
  is_available  BOOLEAN        NOT NULL DEFAULT true,
  sort_order    INT            NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Menu promotions (created manually or auto-extracted from campaigns)
CREATE TABLE IF NOT EXISTS menu_promotions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title            TEXT           NOT NULL,
  discount_type    TEXT           NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   NUMERIC(10,2)  NOT NULL CHECK (discount_value > 0),
  eligible_segment TEXT           NOT NULL DEFAULT 'all' CHECK (eligible_segment IN ('all','new','returning','loyal')),
  applicable_items UUID[]         NOT NULL DEFAULT '{}',
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN        NOT NULL DEFAULT false,
  extracted_from   TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Orders placed by customers via the menu
CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT          NOT NULL,
  table_number  TEXT          NOT NULL,
  status        TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  total_amount  NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Individual line items within an order (snapshot of item name/price at order time)
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name    TEXT          NOT NULL,
  item_price   NUMERIC(10,2) NOT NULL,
  quantity     INT           NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal     NUMERIC(10,2) NOT NULL
);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_menu_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_menu_items_updated_at();

CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant    ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category      ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_promotions_restaurant ON menu_promotions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant        ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer          ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status            ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order        ON order_items(order_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE menu_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_promotions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;

-- menu_categories: owner read/write
CREATE POLICY "Restaurant owners can manage menu categories"
  ON menu_categories FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- Public read for menu_categories (needed by check-in page — no auth)
CREATE POLICY "Public can read menu categories"
  ON menu_categories FOR SELECT
  USING (true);

-- menu_items: owner read/write
CREATE POLICY "Restaurant owners can manage menu items"
  ON menu_items FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- Public read for menu_items
CREATE POLICY "Public can read menu items"
  ON menu_items FOR SELECT
  USING (true);

-- menu_promotions: owner read/write
CREATE POLICY "Restaurant owners can manage promotions"
  ON menu_promotions FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()));

-- Public read for active promotions
CREATE POLICY "Public can read active promotions"
  ON menu_promotions FOR SELECT
  USING (is_active = true);

-- orders: owner read/write + public insert
CREATE POLICY "Restaurant owners can manage orders"
  ON orders FOR ALL
  USING (restaurant_id IN (SELECT public.user_restaurant_ids()))
  WITH CHECK (restaurant_id IN (SELECT public.user_restaurant_ids()));

CREATE POLICY "Anyone can place an order"
  ON orders FOR INSERT
  WITH CHECK (true);

-- order_items: owner read + public insert (linked to order)
CREATE POLICY "Restaurant owners can view order items"
  ON order_items FOR ALL
  USING (order_id IN (
    SELECT id FROM orders WHERE restaurant_id IN (SELECT public.user_restaurant_ids())
  ));

CREATE POLICY "Anyone can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Add new_order to notifications type constraint
-- (adds to the CHECK previously extended for customer_checkin/daily_digest)
-- ============================================================
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'campaign_completed', 'milestone', 'alert', 'info',
    'customer_checkin', 'daily_digest', 'new_order'
  ));

-- ============================================================
-- Supabase Storage bucket for menu images
-- Run this separately if storage extension is enabled:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true)
-- ON CONFLICT (id) DO NOTHING;
-- ============================================================
