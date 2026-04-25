import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { sendEmail } from "@/lib/email";
import { weeklyReportEmail } from "@/lib/email-templates";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";

export const weeklyReport = inngest.createFunction(
  { id: "weekly-report", triggers: [{ cron: "TZ=Africa/Lusaka 0 8 * * 1" }] },
  async ({ step }: { step: any }) => {
    const restaurants = await step.run("get-restaurants", async () => {
      const { data } = await supabaseAdmin
        .from("restaurants")
        .select("id, name, email, notification_preferences")
        .eq("is_active", true);
      return data ?? [];
    });

    await Promise.all(
      restaurants.map((restaurant: any) =>
        step.run(`report-${restaurant.id}`, async () => {
          const prefs = (restaurant.notification_preferences ?? {}) as Record<string, boolean>;
          if (prefs.notify_via_email === false || prefs.weekly_digest === false) return;

          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const weekAgoISO = weekAgo.toISOString();

          // Week date range label
          const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          const weekRange = `${fmt(weekAgo)} – ${fmt(now)}`;

          // This week stats
          const [
            { count: newCustomers },
            { data: weekVisits },
            { data: weekCampaigns },
          ] = await Promise.all([
            supabaseAdmin.from("customers").select("*", { count: "exact", head: true })
              .eq("restaurant_id", restaurant.id).gte("created_at", weekAgoISO),
            supabaseAdmin.from("visits").select("customer_id")
              .eq("restaurant_id", restaurant.id).gte("visit_date", weekAgoISO),
            supabaseAdmin.from("campaigns").select("sent_count, delivered_count")
              .eq("restaurant_id", restaurant.id).eq("status", "completed")
              .gte("completed_at", weekAgoISO),
          ]);

          const returnVisits = (weekVisits ?? []).length;
          const campaignsSent = (weekCampaigns ?? []).length;
          const messagesDelivered = (weekCampaigns ?? []).reduce((s: number, c: any) => s + (c.delivered_count ?? 0), 0);

          // Segment counts
          const [
            { count: segNew },
            { count: segReturning },
            { count: segLoyal },
            { data: inactiveData },
          ] = await Promise.all([
            supabaseAdmin.rpc("get_segment_count", { p_restaurant_id: restaurant.id, p_segment: "new" }),
            supabaseAdmin.rpc("get_segment_count", { p_restaurant_id: restaurant.id, p_segment: "returning" }),
            supabaseAdmin.rpc("get_segment_count", { p_restaurant_id: restaurant.id, p_segment: "loyal" }),
            supabaseAdmin.rpc("get_segment_count", { p_restaurant_id: restaurant.id, p_segment: "inactive_30d" }),
          ]);

          const inactiveCount = inactiveData ?? 0;

          await supabaseAdmin.from("notifications").insert({
            restaurant_id: restaurant.id,
            type: "daily_digest",
            title: `Weekly Report — ${weekRange}`,
            body: `New customers: ${newCustomers ?? 0} · Return visits: ${returnVisits} · Campaigns sent: ${campaignsSent} · Inactive: ${inactiveCount}`,
            is_read: false,
          });

          await sendEmail(
            restaurant.email,
            `📊 Weekly report — ${restaurant.name}, ${weekRange}`,
            weeklyReportEmail({
              restaurantName: restaurant.name,
              weekRange,
              newCustomers: newCustomers ?? 0,
              returnVisits,
              campaignsSent,
              messagesDelivered,
              inactiveCount,
              segNew: (segNew as any) ?? 0,
              segReturning: (segReturning as any) ?? 0,
              segLoyal: (segLoyal as any) ?? 0,
              segInactive: inactiveCount,
              dashboardUrl: `${BASE_URL}/dashboard`,
              settingsUrl: `${BASE_URL}/settings`,
            })
          );
        })
      )
    );

    return { processed: restaurants.length };
  }
);
