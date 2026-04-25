import { createClient } from "@/lib/supabase/server";
import type { CustomerWithSegment, CustomerSegment } from "@/types/database";

export interface CustomerFilters {
  segment?: CustomerSegment | "all";
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "last_visit_date" | "total_visits" | "created_at";
  sortDir?: "asc" | "desc";
}

export interface CustomersResult {
  data: CustomerWithSegment[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getCustomers(
  restaurantId: string,
  filters: CustomerFilters = {}
): Promise<CustomersResult> {
  const supabase = createClient();
  const {
    segment = "all",
    search = "",
    page = 1,
    pageSize = 10,
    sortBy = "last_visit_date",
    sortDir = "desc",
  } = filters;

  let query = supabase
    .from("customers_with_segment")
    .select("*", { count: "exact" })
    .eq("restaurant_id", restaurantId);

  if (segment !== "all") {
    query = query.eq("segment", segment);
  }

  if (search.trim()) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order(sortBy, { ascending: sortDir === "asc", nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Get customers error:", error);
    return { data: [], count: 0, page, pageSize, totalPages: 0 };
  }

  return {
    data: (data as CustomerWithSegment[]) || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export interface CustomerProfile {
  customer: CustomerWithSegment;
  totalSpent: number;
  avgSpend: number;
  daysSinceLastVisit: number | null;
  topItems: { item_name: string; total_quantity: number }[];
  recentOrders: { id: string; total_amount: number; status: string; created_at: string; items: { item_name: string; quantity: number }[] }[];
}

export async function getCustomerProfile(customerId: string, restaurantId: string): Promise<CustomerProfile | null> {
  const supabase = createClient();

  const [customerRes, ordersRes] = await Promise.all([
    supabase
      .from("customers_with_segment")
      .select("*")
      .eq("id", customerId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, total_amount, status, created_at, items:order_items(item_name, quantity)")
      .eq("customer_id", customerId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (customerRes.error) console.error("getCustomerProfile customer error:", customerRes.error);
  if (ordersRes.error)   console.error("getCustomerProfile orders error:", ordersRes.error);
  if (!customerRes.data) return null;

  const orders = (ordersRes.data ?? []) as any[];
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalSpent = completedOrders.reduce((s: number, o: any) => s + o.total_amount, 0);
  const avgSpend = completedOrders.length > 0 ? totalSpent / completedOrders.length : 0;

  // Aggregate item counts
  const itemMap: Record<string, number> = {};
  for (const o of completedOrders) {
    for (const i of o.items ?? []) {
      itemMap[i.item_name] = (itemMap[i.item_name] ?? 0) + i.quantity;
    }
  }
  const topItems = Object.entries(itemMap)
    .map(([item_name, total_quantity]) => ({ item_name, total_quantity }))
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, 3);

  const customer = customerRes.data as CustomerWithSegment;
  const daysSinceLastVisit = customer.last_visit_date
    ? Math.floor((Date.now() - new Date(customer.last_visit_date).getTime()) / 86400000)
    : null;

  return { customer, totalSpent, avgSpend, daysSinceLastVisit, topItems, recentOrders: orders };
}

export async function getSegmentCounts(restaurantId: string) {
  const supabase = createClient();

  const segments: CustomerSegment[] = ["new", "returning", "loyal", "inactive"];
  const counts: Record<string, number> = { all: 0 };

  const totalRes = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);
  counts.all = totalRes.count || 0;

  for (const seg of segments) {
    const res = await supabase
      .from("customers_with_segment")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("segment", seg);
    counts[seg] = res.count || 0;
  }

  return counts;
}