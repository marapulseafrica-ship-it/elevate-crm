import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { PLANS, getMonthsForPlan, isSuperAdmin, type PlanTier } from "@/lib/plans";
import { sendEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";

export async function POST(req: NextRequest) {
  // Verify caller is super admin
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { paymentId } = await req.json();
  if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

  // Fetch payment
  const { data: payment, error: fetchError } = await supabaseAdmin
    .from("payments")
    .select("*, restaurants(name, email)")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const plan = payment.plan as PlanTier;
  const planConfig = PLANS[plan];
  const months = getMonthsForPlan(plan);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  // Mark payment completed
  await supabaseAdmin.from("payments").update({
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", paymentId);

  // Upgrade restaurant subscription
  await supabaseAdmin.from("restaurants").update({
    subscription_tier: plan,
    subscription_status: "active",
    subscription_expires_at: expiresAt.toISOString(),
  }).eq("id", payment.restaurant_id);

  // Email restaurant owner
  const restaurant = (payment as any).restaurants;
  if (restaurant?.email) {
    await sendEmail(
      restaurant.email,
      `Your ${planConfig.label} plan is now active — Elevate CRM`,
      `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 16px;">
        <h2 style="color:#16a34a;margin-bottom:4px;">Payment Confirmed!</h2>
        <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${restaurant.name}</p>
        <p style="font-size:15px;color:#1e293b;">Your <strong>${planConfig.label} plan</strong> is now active.</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Plan</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #f1f5f9;">${planConfig.label}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Renews</td><td style="padding:8px 0;font-weight:600;text-align:right;">${expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
        </table>
        <a href="${BASE_URL}/billing" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Billing →</a>
      </div>`
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
