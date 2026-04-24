import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";

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

export const sendCampaign = inngest.createFunction(
  {
    id: "send-campaign",
    retries: 2,
    concurrency: { limit: 5 },
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
        .select("id,name,email,whatsapp_phone_number_id,whatsapp_access_token,whatsapp_template_name")
        .eq("id", campaign.restaurant_id)
        .single();
      if (!data) throw new Error("Restaurant not found");
      return data as Restaurant;
    });

    // 3. Get segment customers via RPC
    const customers = await step.run("get-customers", async () => {
      const { data } = await supabaseAdmin.rpc("get_segment_customers", {
        p_restaurant_id: campaign.restaurant_id,
        p_segment: campaign.audience_segment,
      });
      return (data ?? []) as Customer[];
    });

    if (customers.length === 0) {
      await supabaseAdmin
        .from("campaigns")
        .update({
          status: "completed",
          sent_count: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
      return { sent: 0 };
    }

    // 4. Fan-out: send to all customers in parallel (batched at 25 concurrent)
    const BATCH = 25;
    let totalSent = 0;

    for (let i = 0; i < customers.length; i += BATCH) {
      const batch = customers.slice(i, i + BATCH);

      await Promise.all(
        batch.map((customer: Customer) =>
          step.run(`send-${customer.id}`, async () => {
            const now = new Date().toISOString();
            const renderedBody = campaign.message_body
              .replace(/\{\{customer_name\}\}/g, customer.name)
              .replace(/\{\{restaurant_name\}\}/g, restaurant.name);

            // Use message_body directly as the custom {{3}} variable
            const customMessage = campaign.message_body.trim();

            let whatsappMessageId = "";
            let status: "sent" | "failed" = "sent";
            let errorMessage: string | null = null;

            try {
              whatsappMessageId = await sendWhatsAppMessage(customer, restaurant, customMessage);
            } catch (err: any) {
              status = "failed";
              errorMessage = err.message ?? "Unknown error";
            }

            await supabaseAdmin.from("campaign_logs").insert({
              campaign_id: campaignId,
              customer_id: customer.id,
              restaurant_id: campaign.restaurant_id,
              phone_sent_to: customer.phone,
              message_body: renderedBody,
              status,
              whatsapp_message_id: whatsappMessageId || null,
              error_message: errorMessage,
              sent_at: now,
            });

            return { status, whatsappMessageId };
          })
        )
      );

      totalSent += batch.length;
    }

    // 5. Mark campaign completed
    await step.run("complete-campaign", async () => {
      await supabaseAdmin.from("campaigns").update({
        status: "completed",
        sent_count: customers.length,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", campaignId);
    });

    // 6. Insert in-app notification
    await step.run("create-notification", async () => {
      await supabaseAdmin.from("notifications").insert({
        restaurant_id: campaign.restaurant_id,
        type: "campaign_completed",
        title: "Campaign Sent ✓",
        body: `${campaign.name} was sent to ${customers.length} customers.`,
        is_read: false,
      });
    });

    return { sent: totalSent, campaignId };
  }
);
