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

  // Fetch the campaign to get scheduled_at
  const { data: campaign, error } = await supabaseAdmin
    .from("campaigns")
    .select("id, scheduled_at, status, restaurant_id")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!["scheduled", "draft"].includes(campaign.status)) {
    return NextResponse.json({ error: "Campaign is not in a sendable state" }, { status: 409 });
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
