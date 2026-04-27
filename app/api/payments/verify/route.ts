import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMonthsForPlan, type PlanTier } from "@/lib/plans";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txRef = searchParams.get("tx_ref");
  const txId  = searchParams.get("transaction_id");
  const status = searchParams.get("status");

  if (!txRef) {
    return NextResponse.redirect(`${BASE_URL}/billing?error=missing_ref`);
  }

  if (status === "cancelled") {
    return NextResponse.redirect(`${BASE_URL}/billing?error=cancelled`);
  }

  // Verify with Flutterwave
  const flwRes = await fetch(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
  });
  const flwData = await flwRes.json();

  if (flwData.data?.status !== "successful") {
    return NextResponse.redirect(`${BASE_URL}/billing?error=payment_failed`);
  }

  // Look up the pending payment
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("flw_tx_ref", txRef)
    .maybeSingle();

  if (!payment) {
    return NextResponse.redirect(`${BASE_URL}/billing?error=not_found`);
  }

  const plan = payment.plan as PlanTier;
  const months = getMonthsForPlan(plan);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  // Update payment record
  await supabaseAdmin.from("payments").update({
    status: "completed",
    flw_tx_id: String(txId),
    payment_method: flwData.data?.payment_type ?? null,
    completed_at: new Date().toISOString(),
  }).eq("flw_tx_ref", txRef);

  // Activate subscription
  await supabaseAdmin.from("restaurants").update({
    subscription_tier: plan,
    subscription_status: "active",
    subscription_expires_at: expiresAt.toISOString(),
  }).eq("id", payment.restaurant_id);

  return NextResponse.redirect(`${BASE_URL}/billing?success=true&plan=${plan}`);
}
