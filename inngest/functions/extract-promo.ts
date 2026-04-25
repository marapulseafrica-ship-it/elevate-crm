import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const extractPromo = inngest.createFunction(
  { id: "extract-promo", triggers: [{ event: "campaign/completed" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { campaignId, restaurantId, messageBody, audienceSegment } = event.data ?? {};

    if (!campaignId || !restaurantId || !messageBody) return { skipped: true };

    const result = await step.run("call-claude", async () => {
      if (!process.env.ANTHROPIC_API_KEY) return null;
      const Anthropic = require("@anthropic-ai/sdk");
      const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Analyse this restaurant campaign message. If it contains a promotion or discount, return a JSON object. If not, return the word null.

Message: "${messageBody.replace(/"/g, "'")}"

Return ONLY valid JSON in this exact shape (no extra text):
{"title":"<short promo title>","discount_type":"percent" or "fixed","discount_value":<number>,"eligible_segment":"${audienceSegment ?? "all"}","expires_at":null}

Rules:
- discount_value must be a positive number (percentage points or currency amount)
- If you cannot determine a clear discount, return: null`,
          },
        ],
      });

      const text = (response.content[0] as any).text?.trim();
      if (!text || text === "null") return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    });

    if (!result) return { extracted: false };

    await step.run("save-promo", async () => {
      await supabaseAdmin.from("menu_promotions").insert({
        restaurant_id: restaurantId,
        campaign_id: campaignId,
        title: String(result.title ?? "Untitled promo").slice(0, 120),
        discount_type: result.discount_type === "fixed" ? "fixed" : "percent",
        discount_value: Math.abs(Number(result.discount_value) || 0),
        eligible_segment: ["all", "new", "returning", "loyal"].includes(result.eligible_segment)
          ? result.eligible_segment
          : "all",
        expires_at: result.expires_at ?? null,
        applicable_items: [],
        is_active: false,
        extracted_from: String(messageBody).slice(0, 200),
      });

      await supabaseAdmin.from("notifications").insert({
        restaurant_id: restaurantId,
        type: "info",
        title: "New promo detected from campaign",
        body: `"${result.title}" — review and activate in Menu → Promotions`,
        is_read: false,
      });
    });

    return { extracted: true, title: result.title };
  }
);
