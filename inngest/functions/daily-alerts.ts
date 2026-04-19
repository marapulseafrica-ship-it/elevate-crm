import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dailyAlerts = inngest.createFunction(
  { id: "daily-alerts", triggers: [{ cron: "TZ=Africa/Lusaka 0 8 * * *" }] },
  async ({ step }: { step: any }) => {
    // 1. Get all active restaurants
    const restaurants = await step.run("get-restaurants", async () => {
      const { data } = await supabaseAdmin
        .from("restaurants")
        .select("id,name,email,notification_preferences")
        .eq("is_active", true);
      return data ?? [];
    });

    // 2. Process each restaurant
    await Promise.all(
      restaurants.map((restaurant: any) =>
        step.run(`digest-${restaurant.id}`, async () => {
          const prefs = restaurant.notification_preferences ?? {};
          if (prefs.notify_via_email === false) return;

          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const todayMMDD = now.toISOString().slice(5, 10); // MM-DD

          // Count inactive customers (30+ days)
          const { data: inactiveData } = await supabaseAdmin.rpc("get_segment_count", {
            p_restaurant_id: restaurant.id,
            p_segment: "inactive_30d",
          });
          const inactiveCount: number = inactiveData ?? 0;

          // Count birthdays today (match MM-DD portion)
          const { count: birthdayCount } = await supabaseAdmin
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("restaurant_id", restaurant.id)
            .like("birthday", `%-${todayMMDD}`);

          // Count new customers this week
          const { count: newThisWeek } = await supabaseAdmin
            .from("customers")
            .select("*", { count: "exact", head: true })
            .eq("restaurant_id", restaurant.id)
            .gte("created_at", weekAgo);

          // Count visits this week
          const { count: visitsThisWeek } = await supabaseAdmin
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("restaurant_id", restaurant.id)
            .gte("visit_date", weekAgo);

          const hasNotable =
            (inactiveCount ?? 0) > 5 ||
            (birthdayCount ?? 0) > 0 ||
            (newThisWeek ?? 0) > 0;

          if (!hasNotable) return;

          // Insert in-app notification
          const parts: string[] = [];
          if ((newThisWeek ?? 0) > 0) parts.push(`${newThisWeek} new customers this week`);
          if ((visitsThisWeek ?? 0) > 0) parts.push(`${visitsThisWeek} visits`);
          if ((inactiveCount ?? 0) > 5) parts.push(`${inactiveCount} customers inactive 30d`);
          if ((birthdayCount ?? 0) > 0) parts.push(`${birthdayCount} birthdays today 🎂`);

          await supabaseAdmin.from("notifications").insert({
            restaurant_id: restaurant.id,
            type: "daily_digest",
            title: "Daily CRM Digest",
            body: parts.join(" · "),
            is_read: false,
          });
        })
      )
    );

    return { processed: restaurants.length };
  }
);
