import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { sendEmail } from "@/lib/email";
import Anthropic from "@anthropic-ai/sdk";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";

export const biweeklySummary = inngest.createFunction(
  { id: "biweekly-summary", triggers: [{ cron: "TZ=Africa/Lusaka 0 8 1,15 * *" }, { cron: "TZ=Africa/Lusaka 15 23 * * *" }] },
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
        step.run(`biweekly-${restaurant.id}`, async () => {
          const prefs = (restaurant.notification_preferences ?? {}) as Record<string, boolean>;
          if (prefs.notify_via_email === false) return;

          const now = new Date();
          const periodStart = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
          const prevStart  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

          // Revenue this period vs last
          const [revenueNow, revenuePrev, topItems, atRisk] = await Promise.all([
            supabaseAdmin
              .from("orders")
              .select("total_amount")
              .eq("restaurant_id", restaurant.id)
              .eq("status", "completed")
              .gte("created_at", periodStart),
            supabaseAdmin
              .from("orders")
              .select("total_amount")
              .eq("restaurant_id", restaurant.id)
              .eq("status", "completed")
              .gte("created_at", prevStart)
              .lt("created_at", periodStart),
            supabaseAdmin.rpc("get_item_sales_stats", {
              p_restaurant_id: restaurant.id,
              p_days: 15,
            }),
            supabaseAdmin
              .from("customers")
              .select("id, name")
              .eq("restaurant_id", restaurant.id)
              .gte("total_visits", 2)
              .lt("last_visit_date", periodStart)
              .limit(20),
          ]);

          const totalNow  = (revenueNow.data ?? []).reduce((s: number, o: any) => s + o.total_amount, 0);
          const totalPrev = (revenuePrev.data ?? []).reduce((s: number, o: any) => s + o.total_amount, 0);
          const revChange = totalPrev > 0 ? (((totalNow - totalPrev) / totalPrev) * 100).toFixed(1) : "N/A";
          const top3 = (topItems.data ?? []).slice(0, 3).map((i: any) => `${i.item_name} (×${i.total_quantity})`).join(", ");
          const atRiskCount = atRisk.data?.length ?? 0;

          const prompt = `You are a business advisor writing a bi-weekly summary email for ${restaurant.name}.

Key numbers:
- Revenue this period (last 15 days): ZMW ${totalNow.toFixed(2)}
- Revenue previous period: ZMW ${totalPrev.toFixed(2)} (change: ${revChange}%)
- Top 3 selling items: ${top3 || "No data"}
- At-risk customers (2+ visits, no visit in 15 days): ${atRiskCount}

Write a 150-200 word summary with:
1. A performance overview (one paragraph)
2. Three bullet-point action items (•)
Keep it direct, positive, and actionable. Address the owner as "you".`;

          const message = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 400,
            messages: [{ role: "user", content: prompt }],
          });

          const aiSummary = (message.content[0] as any).text ?? "";

          // Send email
          await sendEmail(
            restaurant.email,
            `Bi-Weekly Business Summary — ${restaurant.name}`,
            `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px 16px;">
              <h2 style="color:#1e293b;margin-bottom:4px;">Business Summary</h2>
              <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${restaurant.name} · ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
              <div style="background:#f8fafc;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                <table style="width:100%;font-size:14px;">
                  <tr>
                    <td style="padding:4px 0;color:#64748b;">Revenue (this period)</td>
                    <td style="text-align:right;font-weight:700;color:#f97316;">ZMW ${totalNow.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;">vs previous period</td>
                    <td style="text-align:right;font-weight:600;color:${Number(revChange) >= 0 ? "#16a34a" : "#dc2626"};">${revChange !== "N/A" ? (Number(revChange) >= 0 ? "+" : "") + revChange + "%" : "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;">At-risk customers</td>
                    <td style="text-align:right;font-weight:600;color:#1e293b;">${atRiskCount}</td>
                  </tr>
                </table>
              </div>
              <div style="font-size:14px;color:#334155;line-height:1.7;white-space:pre-line;">${aiSummary}</div>
              <a href="${BASE_URL}/analytics" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Full Analytics →</a>
            </div>`
          );

          // In-app notification
          await supabaseAdmin.from("notifications").insert({
            restaurant_id: restaurant.id,
            type: "daily_digest",
            title: "Bi-Weekly Summary Ready",
            body: `Revenue: ZMW ${totalNow.toFixed(0)} · ${atRiskCount} at-risk customers`,
            is_read: false,
          });
        })
      )
    );
  }
);
