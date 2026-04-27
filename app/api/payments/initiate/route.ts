import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS, getMonthsForPlan, type PlanTier } from "@/lib/plans";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";

export async function POST(req: NextRequest) {
  const { plan, restaurantId, customerEmail, customerName } = await req.json();

  if (!plan || !restaurantId) {
    return NextResponse.json({ error: "plan and restaurantId required" }, { status: 400 });
  }

  const planConfig = PLANS[plan as PlanTier];
  if (!planConfig) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Create a unique tx_ref
  const txRef = `elev-${restaurantId.slice(0, 8)}-${Date.now()}`;

  // Insert pending payment record
  await supabaseAdmin.from("payments").insert({
    restaurant_id: restaurantId,
    plan,
    amount_usd: parseFloat(planConfig.price.replace("$", "")),
    currency: "USD",
    flw_tx_ref: txRef,
    status: "pending",
  });

  // Build Flutterwave hosted payment link
  const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: parseFloat(planConfig.price.replace("$", "")),
      currency: "USD",
      redirect_url: `${BASE_URL}/api/payments/verify?tx_ref=${txRef}`,
      customer: {
        email: customerEmail ?? "customer@elevatecrm.com",
        name: customerName ?? "Restaurant Owner",
      },
      payment_options: "card,mobilemoneyghana,mobilemoneyzambia",
      customizations: {
        title: "Elevate CRM",
        description: `${planConfig.label} Plan — ${planConfig.priceNote}`,
        logo: `${BASE_URL}/logo.png`,
      },
      meta: { restaurantId, plan },
    }),
  });

  const flwData = await flwRes.json();

  if (!flwRes.ok || flwData.status !== "success") {
    return NextResponse.json({ error: flwData.message ?? "Payment initiation failed" }, { status: 500 });
  }

  return NextResponse.json({ paymentUrl: flwData.data.link });
}
