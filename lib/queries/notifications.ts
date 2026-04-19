import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
  restaurant_id: string;
  title: string;
  body: string | null;
  type: "campaign" | "customer" | "system" | "info";
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
