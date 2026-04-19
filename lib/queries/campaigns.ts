import { createClient } from "@/lib/supabase/server";
import type {
  Campaign,
  CampaignPerformance,
  MessageTemplate,
  AudienceSegment,
} from "@/types/database";

export async function getCampaigns(restaurantId: string, limit = 20): Promise<Campaign[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Get campaigns error:", error);
    return [];
  }
  return data as Campaign[];
}

export async function getCampaignPerformance(
  restaurantId: string,
  limit = 20
): Promise<CampaignPerformance[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_campaign_performance", {
    p_restaurant_id: restaurantId,
    p_limit: limit,
  });

  if (error) {
    console.error("Campaign performance error:", error);
    return [];
  }
  return data as CampaignPerformance[];
}

export async function getMessageTemplates(restaurantId: string): Promise<MessageTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return [];
  return data as MessageTemplate[];
}

export async function getSegmentCount(
  restaurantId: string,
  segment: AudienceSegment
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_segment_count", {
    p_restaurant_id: restaurantId,
    p_segment: segment,
  });

  if (error) return 0;
  return data as number;
}

export async function getCampaignStats(restaurantId: string) {
  const supabase = createClient();

  const [totalRes, completedRes, sumsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed"),
    supabase
      .from("campaigns")
      .select("sent_count, delivered_count, audience_count")
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed"),
  ]);

  const totalSent =
    sumsRes.data?.reduce((acc: number, r: any) => acc + (r.sent_count || 0), 0) || 0;
  const totalDelivered =
    sumsRes.data?.reduce((acc: number, r: any) => acc + (r.delivered_count || 0), 0) || 0;

  return {
    total_campaigns: totalRes.count || 0,
    completed_campaigns: completedRes.count || 0,
    total_messages_sent: totalSent,
    total_delivered: totalDelivered,
    delivery_rate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
    active_campaigns: 0,
  };
}