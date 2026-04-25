import { createClient } from "@supabase/supabase-js";
import { inngest } from "../client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_SEGMENTS = ["all", "new", "returning", "loyal"] as const;

function mapSegment(seg: string): string {
  return VALID_SEGMENTS.includes(seg as any) ? seg : "all";
}

export const extractPromo = inngest.createFunction(
  { id: "extract-promo", triggers: [{ event: "campaign/completed" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { campaignId, campaignName, restaurantId, messageBody, audienceSegment } = event.data ?? {};

    if (!campaignId || !restaurantId || !messageBody) return { skipped: true };

    // Avoid duplicate if already extracted for this campaign
    const existing = await step.run("check-existing", async () => {
      const { data } = await supabaseAdmin
        .from("menu_promotions")
        .select("id")
        .eq("campaign_id", campaignId)
        .maybeSingle();
      return data;
    });

    if (existing) return { skipped: true, reason: "already extracted" };

    // Try AI extraction
    const aiResult = await step.run("call-claude", async () => {
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
{"title":"<short promo title>","discount_type":"percent" or "fixed","discount_value":<number>}

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

    // Always create a promo — use AI values if found, else use campaign name as title
    await step.run("save-promo", async () => {
      const eligibleSegment = mapSegment(audienceSegment ?? "all");

      const title = aiResult?.title
        ? String(aiResult.title).slice(0, 120)
        : String(campaignName ?? "Campaign Promotion").slice(0, 120);

      const discountType: "percent" | "fixed" =
        aiResult?.discount_type === "fixed" ? "fixed" : "percent";

      const discountValue = aiResult
        ? Math.abs(Number(aiResult.discount_value) || 0)
        : 0;

      await supabaseAdmin.from("menu_promotions").insert({
        restaurant_id: restaurantId,
        campaign_id: campaignId,
        title,
        discount_type: discountType,
        discount_value: discountValue,
        eligible_segment: eligibleSegment,
        expires_at: null,
        applicable_items: [],
        is_active: false,
        extracted_from: String(messageBody).slice(0, 200),
      });

      await supabaseAdmin.from("notifications").insert({
        restaurant_id: restaurantId,
        type: "info",
        title: "New promo ready for review",
        body: `"${title}" — go to Menu → Promotions, review and activate to show it to customers`,
        is_read: false,
      });
    });

    return { extracted: true, aiDetected: !!aiResult };
  }
);
