import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS, getMonthsForPlan, type PlanTier } from "@/lib/plans";
import { sendEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";
const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? "";
const ZMW_RATE = Number(process.env.NEXT_PUBLIC_ZMW_PER_USD ?? 27);

export async function POST(req: NextRequest) {
  const { plan, restaurantId, customerTxId, renewalPhone, consentGiven, amountZmw } = await req.json();

  if (!plan || !restaurantId || !customerTxId) {
    return NextResponse.json({ error: "plan, restaurantId, and customerTxId are required" }, { status: 400 });
  }

  const planConfig = PLANS[plan as PlanTier];
  if (!planConfig) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const reference = `ELEV-${restaurantId.slice(0, 8).toUpperCase()}`;
  const priceUsd = parseFloat(planConfig.price.replace("$", ""));
  const zmwAmount = amountZmw ?? priceUsd * ZMW_RATE;

  // Get restaurant details for the email
  const { data: restaurant } = await supabaseAdmin
    .from("restaurants")
    .select("name, email")
    .eq("id", restaurantId)
    .single();

  // Insert pending payment record
  const { data: payment, error } = await supabaseAdmin.from("payments").insert({
    restaurant_id: restaurantId,
    plan,
    amount_usd: priceUsd,
    amount_zmw: zmwAmount,
    currency: "ZMW",
    payment_method: "mobilemoney_airtel",
    flw_tx_ref: `${reference}-${Date.now()}`,
    customer_tx_id: customerTxId,
    renewal_phone: renewalPhone ?? null,
    auto_renew: !!(renewalPhone && consentGiven),
    consent_given_at: consentGiven ? new Date().toISOString() : null,
    status: "pending",
  }).select("id").single();

  if (error) {
    console.error("Payment insert error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }

  // Email super admin
  if (SUPER_ADMIN_EMAIL) {
    await sendEmail(
      SUPER_ADMIN_EMAIL,
      `New payment request — ${restaurant?.name ?? restaurantId}`,
      `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 16px;">
        <h2 style="color:#1e293b;margin-bottom:4px;">New Payment Request</h2>
        <p style="color:#64748b;font-size:13px;margin-bottom:20px;">Requires your approval</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Restaurant</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${restaurant?.name ?? restaurantId}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Plan</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;text-transform:capitalize;">${planConfig.label} — ${planConfig.price} ${planConfig.priceNote}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Amount (ZMW)</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">ZMW ${zmwAmount.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Reference</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;font-family:monospace;">${reference}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Customer TX ID</td><td style="padding:8px 0;font-weight:600;text-align:right;font-family:monospace;">${customerTxId}</td></tr>
        </table>
        <a href="${BASE_URL}/admin" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review &amp; Approve →</a>
      </div>`
    ).catch(console.error);
  }

  return NextResponse.json({ success: true, reference, paymentId: payment.id });
}
