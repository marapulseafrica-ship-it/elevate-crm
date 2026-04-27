import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMonthsForPlan, type PlanTier } from "@/lib/plans";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Verify Flutterwave signature
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  const signature  = req.headers.get("verif-hash");

  if (!secretHash || signature !== secretHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();

  if (payload.event !== "charge.completed") {
    return NextResponse.json({ received: true });
  }

  const { tx_ref, id: txId, status, payment_type } = payload.data ?? {};

  if (status !== "successful" || !tx_ref) {
    return NextResponse.json({ received: true });
  }

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("flw_tx_ref", tx_ref)
    .maybeSingle();

  if (!payment || payment.status === "completed") {
    return NextResponse.json({ received: true });
  }

  const plan = payment.plan as PlanTier;
  const months = getMonthsForPlan(plan);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  await supabaseAdmin.from("payments").update({
    status: "completed",
    flw_tx_id: String(txId),
    payment_method: payment_type ?? null,
    completed_at: new Date().toISOString(),
  }).eq("flw_tx_ref", tx_ref);

  await supabaseAdmin.from("restaurants").update({
    subscription_tier: plan,
    subscription_status: "active",
    subscription_expires_at: expiresAt.toISOString(),
  }).eq("id", payment.restaurant_id);

  await supabaseAdmin.from("notifications").insert({
    restaurant_id: payment.restaurant_id,
    type: "info",
    title: "Payment confirmed ✓",
    body: `Your ${plan} plan is now active.`,
    is_read: false,
  });

  return NextResponse.json({ received: true });
}
