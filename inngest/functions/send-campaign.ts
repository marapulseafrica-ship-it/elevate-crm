import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";
import { sendEmail } from "@/lib/email";
import { campaignCompletedEmail } from "@/lib/email-templates";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Restaurant {
  id: string;
  name: string;
  email: string;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_template_name: string;
  notification_preferences: Record<string, boolean> | null;
}

async function sendWhatsAppMessage(
  customer: Customer,
  restaurant: Restaurant,
  campaignMessage: string
): Promise<string> {
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${restaurant.whatsapp_phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${restaurant.whatsapp_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: customer.phone,
        type: "template",
        template: {
          name: restaurant.whatsapp_template_name,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: customer.name },
                { type: "text", text: restaurant.name },
                { type: "text", text: campaignMessage },
              ],
            },
          ],
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error: ${err}`);
  }

  const data = await res.json();
  return data.messages?.[0]?.id ?? "";
}

// Sends to a batch of customers and bulk-inserts logs — one step per 500 customers
// so 10,000 customers = 20 steps instead of 10,000 steps
async function sendBatch(
  customers: Customer[],
  restaurant: Restaurant,
  campaign: any,
  campaignId: string
): Promise<{ sent: number; failed: number }> {
  const now = new Date().toISOString();
  const customMessage = campaign.message_body.trim();

  const results = await Promise.all(
    customers.map(async (customer) => {
      const renderedBody = campaign.message_body
        .replace(/\{\{customer_name\}\}/g, customer.name)
        .replace(/\{\{restaurant_name\}\}/g, restaurant.name);

      let whatsappMessageId = "";
      let status: "sent" | "failed" = "sent";
      let errorMessage: string | null = null;

      try {
        whatsappMessageId = await sendWhatsAppMessage(customer, restaurant, customMessage);
      } catch (err: any) {
        status = "failed";
        errorMessage = err.message ?? "Unknown error";
      }

      return {
        campaign_id: campaignId,
        customer_id: customer.id,
        restaurant_id: campaign.restaurant_id,
        phone_sent_to: customer.phone,
        message_body: renderedBody,
        status,
        whatsapp_message_id: whatsappMessageId || null,
        error_message: errorMessage,
        sent_at: now,
      };
    })
  );

  // Bulk insert all logs for this batch in one query
  await supabaseAdmin.from("campaign_logs").insert(results);

  return {
    sent: results.filter((r) => r.status === "sent").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
}

export const sendCampaign = inngest.createFunction(
  {
    id: "send-campaign",
    retries: 2,
    concurrency: { limit: 10 },
    triggers: [{ event: "campaign/send" }],
  },
  async ({ event, step }: { event: { data: { campaignId: string } }; step: any }) => {
    const { campaignId } = event.data;

    // 1. Fetch campaign and lock it to 'sending'
    const campaign = await step.run("lock-campaign", async () => {
      const { data: rows } = await supabaseAdmin
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .eq("status", "scheduled")
        .single();

      if (!rows) throw new Error(`Campaign ${campaignId} not found or not scheduled`);

      await supabaseAdmin
        .from("campaigns")
        .update({ status: "sending", started_at: new Date().toISOString() })
        .eq("id", campaignId);

      return rows;
    });

    // 2. Fetch restaurant credentials
    const restaurant = await step.run("get-restaurant", async () => {
      const { data } = await supabaseAdmin
        .from("restaurants")
        .select("id,name,email,whatsapp_phone_number_id,whatsapp_access_token,whatsapp_template_name,notification_preferences")
        .eq("id", campaign.restaurant_id)
        .single();
      if (!data) throw new Error("Restaurant not found");
      return data as Restaurant;
    });

    // 3. Get segment customers
    const customers = await step.run("get-customers", async () => {
      const { data } = await supabaseAdmin.rpc("get_segment_customers", {
        p_restaurant_id: campaign.restaurant_id,
        p_segment: campaign.audience_segment,
      });
      return (data ?? []) as Customer[];
    });

    if (customers.length === 0) {
      await supabaseAdmin.from("campaigns").update({
        status: "completed",
        sent_count: 0,
        completed_at: new Date().toISOString(),
      }).eq("id", campaignId);
      return { sent: 0 };
    }

    // 4. Send in batches of 500 — each batch = ONE step
    // 10,000 customers = 20 steps (not 10,000 steps)
    const BATCH_SIZE = 500;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

      const result = await step.run(`send-batch-${batchIndex}`, async () => {
        return sendBatch(batch, restaurant, campaign, campaignId);
      });

      totalSent += result.sent;
      totalFailed += result.failed;
    }

    // 5. Mark campaign completed
    await step.run("complete-campaign", async () => {
      await supabaseAdmin.from("campaigns").update({
        status: "completed",
        sent_count: totalSent,
        failed_count: totalFailed,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", campaignId);
    });

    // 6. Notification + email
    await step.run("create-notification", async () => {
      await supabaseAdmin.from("notifications").insert({
        restaurant_id: campaign.restaurant_id,
        type: "campaign_completed",
        title: "Campaign Sent ✓",
        body: `${campaign.name} was sent to ${totalSent} customers${totalFailed > 0 ? ` (${totalFailed} failed)` : ""}.`,
        is_read: false,
      });

      const prefs = (restaurant.notification_preferences ?? {}) as Record<string, boolean>;
      if (prefs.notify_via_email !== false && prefs.campaign_completed !== false) {
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";
        const { count: deliveredCount } = await supabaseAdmin
          .from("campaign_logs")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaignId)
          .eq("status", "delivered");

        await sendEmail(
          restaurant.email,
          `✓ Campaign sent — "${campaign.name}" reached ${totalSent} customers`,
          campaignCompletedEmail({
            restaurantName: restaurant.name,
            campaignName: campaign.name,
            audienceSegment: campaign.audience_segment,
            sentCount: totalSent,
            deliveredCount: deliveredCount ?? 0,
            completedAt: new Date().toLocaleString("en-GB", { timeZone: "Africa/Lusaka" }),
            dashboardUrl: `${BASE_URL}/campaigns`,
            settingsUrl: `${BASE_URL}/settings`,
          })
        );
      }
    });

    // 7. Fire event for promo extraction
    await step.sendEvent("trigger-promo-extraction", {
      name: "campaign/completed",
      data: {
        campaignId,
        campaignName: campaign.name,
        campaignType: campaign.campaign_type,
        restaurantId: campaign.restaurant_id,
        messageBody: campaign.message_body,
        audienceSegment: campaign.audience_segment,
      },
    });

    return { sent: totalSent, failed: totalFailed, campaignId };
  }
);
