import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
  restaurant_id: string;
  title: string;
  body: string | null;
  type: "campaign" | "customer" | "system" | "info" | "campaign_completed" | "customer_checkin" | "daily_digest";
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(restaurantId: string): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [];
  return data as Notification[];
}

export async function getAllNotifications(restaurantId: string, page = 0, pageSize = 30): Promise<{ data: Notification[]; total: number }> {
  const supabase = createClient();
  const { data, error, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (error) return { data: [], total: 0 };
  return { data: data as Notification[], total: count ?? 0 };
}

export async function markAllNotificationsRead(restaurantId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("restaurant_id", restaurantId)
    .eq("is_read", false);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
}
