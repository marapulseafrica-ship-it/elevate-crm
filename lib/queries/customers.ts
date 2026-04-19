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