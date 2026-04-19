import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "elevate_crm_verify_2024";

/* ── GET — Meta webhook verification ────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/* ── POST — Delivery status callbacks from Meta ──────────── */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entries = body?.entry ?? [];

  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const statuses: any[] = change?.value?.statuses ?? [];

      for (const status of statuses) {
        const messageId = status?.id;
        const newStatus = status?.status;   // sent | delivered | read | failed
        if (!messageId || !newStatus) continue;

        // Map Meta status → our status
        const logStatus = mapStatus(newStatus);
        const timestampField = statusTimestampField(newStatus);

        // Update campaign_log
        const updatePayload: Record<string, string> = {
          status: logStatus,
          updated_at: new Date().toISOString(),
        };
        if (timestampField) {
          updatePayload[timestampField] = new Date().toISOString();
        }
        if (newStatus === "failed") {
          updatePayload.error_message =
            status?.errors?.[0]?.title ?? "Unknown error";
        }

        const { data: logRow } = await supabase
          .from("campaign_logs")
          .update(updatePayload)
          .eq("whatsapp_message_id", messageId)
          .select("campaign_id")
          .single();

        if (!logRow?.campaign_id) continue;

        // Increment the right counter on the campaign
        const counterField = statusCounterField(newStatus);
        if (counterField) {
          await supabase.rpc("increment_campaign_counter", {
            p_campaign_id: logRow.campaign_id,
            p_field: counterField,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

function mapStatus(metaStatus: string): string {
  switch (metaStatus) {
    case "sent":      return "sent";
    case "delivered": return "delivered";
    case "read":      return "read";
    case "failed":    return "failed";
    default:          return "sent";
  }
}

function statusTimestampField(metaStatus: string): string | null {
  switch (metaStatus) {
    case "sent":      return "sent_at";
    case "delivered": return "delivered_at";
    case "read":      return "read_at";
    case "failed":    return "failed_at";
    default:          return null;
  }
}

function statusCounterField(metaStatus: string): string | null {
  switch (metaStatus) {
    case "delivered": return "delivered_count";
    case "read":      return "read_count";
    case "failed":    return "failed_count";
    default:          return null;
  }
}
