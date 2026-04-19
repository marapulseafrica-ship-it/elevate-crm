import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalisePhone(raw: string): string {
  let phone = raw.replace(/\s+/g, "").replace(/-/g, "");
  if (phone.startsWith("0")) phone = "+260" + phone.slice(1);
  if (!phone.startsWith("+")) phone = "+" + phone;
  return phone;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { api_key, name, phone, notes } = body ?? {};

  if (!api_key || !name?.trim() || !phone?.trim()) {
    return NextResponse.json(
      { success: false, error: "api_key, name, and phone are required" },
      { status: 400 }
    );
  }

  // Resolve restaurant by api_key
  const { data: restaurant } = await supabaseAdmin
    .from("restaurants")
    .select("id, name")
    .eq("api_key", api_key)
    .eq("is_active", true)
    .single();

  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 401 });
  }

  const normalisedPhone = normalisePhone(phone.trim());

  // Upsert customer
  const { data: customers, error: upsertErr } = await supabaseAdmin
    .from("customers")
    .upsert(
      {
        restaurant_id: restaurant.id,
        name: name.trim(),
        phone: normalisedPhone,
        opted_in_whatsapp: true,
        notes: notes?.trim() || null,
      },
      { onConflict: "restaurant_id,phone", ignoreDuplicates: false }
    )
    .select("id");

  if (upsertErr || !customers?.length) {
    return NextResponse.json(
      { success: false, error: "Could not save customer" },
      { status: 500 }
    );
  }

  const customerId = customers[0].id;

  // Insert visit
  await supabaseAdmin.from("visits").insert({
    customer_id: customerId,
    restaurant_id: restaurant.id,
    source: "qr_checkin",
    visit_date: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: `Welcome, ${name.trim()}! Check-in recorded at ${restaurant.name}.`,
    restaurant_name: restaurant.name,
  });
}
