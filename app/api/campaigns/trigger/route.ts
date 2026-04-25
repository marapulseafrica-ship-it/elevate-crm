import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/inngest/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId } = body;
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  // Fetch the campaign
  const { data: campaign, error } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, scheduled_at, ends_at, status, restaurant_id, message_body, audience_segment, campaign_type")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!["scheduled", "draft"].includes(campaign.status)) {
    return NextResponse.json({ error: "Campaign is not in a sendable state" }, { status: 409 });
  }

  // Create a menu_promotion immediately (synchronous — no Inngest dependency)
  const VALID_SEGMENTS = ["all", "new", "returning", "loyal"];
  const eligibleSegment = VALID_SEGMENTS.includes(campaign.audience_segment)
    ? campaign.audience_segment
    : "all";

  const { data: existingPromo } = await supabaseAdmin
    .from("menu_promotions")
    .select("id")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!existingPromo) {
    await supabaseAdmin.from("menu_promotions").insert({
      restaurant_id: campaign.restaurant_id,
      campaign_id: campaignId,
      title: campaign.name,
      discount_type: "percent",
      discount_value: 0,
      eligible_segment: eligibleSegment,
      expires_at: campaign.ends_at ?? null,
      applicable_items: [],
      is_active: false,
      extracted_from: String(campaign.message_body ?? "").slice(0, 200),
    });
  }

  const scheduledAt = campaign.scheduled_at
    ? new Date(campaign.scheduled_at).getTime()
    : Date.now();

  // Send event to Inngest — delayed if scheduled for the future
  await inngest.send({
    name: "campaign/send",
    data: { campaignId },
    ts: scheduledAt,
  });

  return NextResponse.json({ ok: true, scheduledAt: new Date(scheduledAt).toISOString() });
}
