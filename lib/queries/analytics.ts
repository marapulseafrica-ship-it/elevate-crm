import { createClient } from "@/lib/supabase/server";

export interface RevenueBySegment {
  total: number;
  new: number;
  returning: number;
  loyal: number;
  avg_new: number;
  avg_returning: number;
  avg_loyal: number;
  count_new: number;
  count_returning: number;
  count_loyal: number;
}

export async function getRevenueBySegment(restaurantId: string): Promise<RevenueBySegment> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_revenue_by_segment", { p_restaurant_id: restaurantId });
  if (error || !data) {
    return { total: 0, new: 0, returning: 0, loyal: 0, avg_new: 0, avg_returning: 0, avg_loyal: 0, count_new: 0, count_returning: 0, count_loyal: 0 };
  }
  return data as RevenueBySegment;
}

export interface ItemSalesStat {
  item_name: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
}

export async function getItemSalesStats(restaurantId: string, days = 30): Promise<ItemSalesStat[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_item_sales_stats", {
    p_restaurant_id: restaurantId,
    p_days: days,
  });
  if (error || !data) return [];
  return data as ItemSalesStat[];
}

export interface PromoRoi {
  total_revenue: number;
  customers_used: number;
  order_count: number;
}

export async function getPromoRoi(restaurantId: string, promotionId: string): Promise<PromoRoi> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_promo_roi", {
    p_restaurant_id: restaurantId,
    p_promotion_id: promotionId,
  });
  if (error || !data) return { total_revenue: 0, customers_used: 0, order_count: 0 };
  return data as PromoRoi;
}

export interface OrderPattern {
  hour_of_day: number;
  day_of_week: number;
  order_count: number;
  total_revenue: number;
}

export async function getOrderPatterns(restaurantId: string): Promise<OrderPattern[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_order_patterns", { p_restaurant_id: restaurantId });
  if (error || !data) return [];
  return data as OrderPattern[];
}
