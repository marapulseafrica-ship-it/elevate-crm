import { createClient } from "@/lib/supabase/server";
import type { DashboardSummary, VisitsChartPoint, CustomerWithSegment } from "@/types/database";

export async function getDashboardSummary(restaurantId: string): Promise<DashboardSummary | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_dashboard_summary", {
    p_restaurant_id: restaurantId,
  });

  if (error) {
    console.error("Dashboard summary error:", error);
    return null;
  }
  return data as DashboardSummary;
}

export async function getVisitsChartData(
  restaurantId: string,
  days: number = 30
): Promise<VisitsChartPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_visits_chart_data", {
    p_restaurant_id: restaurantId,
    p_days: days,
  });

  if (error) {
    console.error("Visits chart error:", error);
    return [];
  }
  return data as VisitsChartPoint[];
}

export async function getRecentCustomers(
  restaurantId: string,
  limit: number = 5
): Promise<CustomerWithSegment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers_with_segment")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("last_visit_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("Recent customers error:", error);
    return [];
  }
  return data as CustomerWithSegment[];
}

export async function getDashboardInsights(restaurantId: string) {
  const supabase = createClient();

  const [inactiveCount, newWeekCount, loyalActivity] = await Promise.all([
    supabase
      .from("customers_with_segment")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("segment", "inactive"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("customers_with_segment")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("segment", "loyal"),
  ]);

  return {
    inactive_count: inactiveCount.count || 0,
    new_this_week: newWeekCount.count || 0,
    loyal_count: loyalActivity.count || 0,
  };
}