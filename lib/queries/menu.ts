import { createClient } from "@/lib/supabase/server";
import type { MenuCategory, MenuItem, MenuPromotion, Order, OrderItem } from "@/types/database";

export async function getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");
  return data ?? [];
}

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");
  return data ?? [];
}

export async function getMenuPromotions(restaurantId: string): Promise<MenuPromotion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("menu_promotions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getActiveMenuPromotions(restaurantId: string): Promise<MenuPromotion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("menu_promotions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString());
  return data ?? [];
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export async function getOrders(
  restaurantId: string,
  status?: string
): Promise<OrderWithItems[]> {
  const supabase = createClient();
  let query = supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (data as OrderWithItems[]) ?? [];
}

export async function getPendingOrderCount(restaurantId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("status", "pending");
  return count ?? 0;
}
