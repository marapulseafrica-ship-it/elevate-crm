import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/plans";
import { sendEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { paymentId, reason } = await req.json();
  if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("*, restaurants(name, email)")
    .eq("id", paymentId)
    .single();

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", paymentId);

  const restaurant = (payment as any).restaurants;
  if (restaurant?.email) {
    await sendEmail(
      restaurant.email,
      `Payment could not be verified — Elevate CRM`,
      `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 16px;">
        <h2 style="color:#dc2626;margin-bottom:4px;">Payment Not Verified</h2>
        <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${restaurant.name}</p>
        <p style="font-size:15px;color:#1e293b;">We were unable to verify your payment for the <strong style="text-transform:capitalize;">${payment.plan}</strong> plan.</p>
        ${reason ? `<p style="font-size:14px;color:#64748b;">Reason: ${reason}</p>` : ""}
        <p style="font-size:14px;color:#64748b;margin-top:12px;">Please try again or contact us on WhatsApp if you believe this is an error.</p>
        <a href="${BASE_URL}/billing" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Try Again →</a>
      </div>`
    ).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
