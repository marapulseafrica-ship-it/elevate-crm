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

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { api_key, name, phone, email, notes, lat, lng } = body ?? {};

  if (!api_key || !name?.trim() || !phone?.trim()) {
    return NextResponse.json(
      { success: false, error: "api_key, name, and phone are required" },
      { status: 400 }
    );
  }

  // Resolve restaurant by api_key
  const { data: restaurant } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, latitude, longitude, checkin_location_enabled")
    .eq("api_key", api_key)
    .eq("is_active", true)
    .single();

  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 401 });
  }

  // Geolocation check
  if (restaurant.checkin_location_enabled && restaurant.latitude && restaurant.longitude) {
    if (lat == null || lng == null) {
      return NextResponse.json(
        { success: false, error: "Location required. Please allow location access and try again." },
        { status: 403 }
      );
    }
    const distanceM = haversineMeters(lat, lng, restaurant.latitude, restaurant.longitude);
    if (distanceM > 300) {
      return NextResponse.json(
        { success: false, error: "You must be at the restaurant to check in." },
        { status: 403 }
      );
    }
  }

  const normalisedPhone = normalisePhone(phone.trim());

  // Check 2-hour gap for existing customer
  const { data: existingCustomer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("phone", normalisedPhone)
    .single();

  if (existingCustomer) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentVisit } = await supabaseAdmin
      .from("visits")
      .select("visit_date")
      .eq("customer_id", existingCustomer.id)
      .gte("visit_date", twoHoursAgo)
      .order("visit_date", { ascending: false })
      .limit(1)
      .single();

    if (recentVisit) {
      const nextCheckin = new Date(new Date(recentVisit.visit_date).getTime() + 2 * 60 * 60 * 1000);
      const timeStr = nextCheckin.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return NextResponse.json(
        { success: false, error: `You've already checked in recently. Next check-in available after ${timeStr}.` },
        { status: 429 }
      );
    }
  }

  // Upsert customer
  const { data: customers, error: upsertErr } = await supabaseAdmin
    .from("customers")
    .upsert(
      {
        restaurant_id: restaurant.id,
        name: name.trim(),
        phone: normalisedPhone,
        email: email?.trim() || null,
        opted_in_whatsapp: true,
        notes: notes?.trim() || null,
      },
      { onConflict: "restaurant_id,phone", ignoreDuplicates: false }
    )
    .select("id, total_visits");

  if (upsertErr || !customers?.length) {
    return NextResponse.json(
      { success: false, error: "Could not save customer" },
      { status: 500 }
    );
  }

  const customerId = customers[0].id;
  const isNew = customers[0].total_visits === 0;

  // Insert visit
  await supabaseAdmin.from("visits").insert({
    customer_id: customerId,
    restaurant_id: restaurant.id,
    source: "qr_checkin",
    visit_date: new Date().toISOString(),
  });

  // Fetch updated visit count after trigger runs
  const { data: updated } = await supabaseAdmin
    .from("customers")
    .select("total_visits")
    .eq("id", customerId)
    .single();

  const visitNumber = updated?.total_visits ?? customers[0].total_visits + 1;

  // In-app notification for restaurant
  await supabaseAdmin.from("notifications").insert({
    restaurant_id: restaurant.id,
    type: "customer_checkin",
    title: isNew ? "New customer checked in!" : "Customer returned!",
    body: `${name.trim()} – Visit #${visitNumber}`,
    is_read: false,
  });

  return NextResponse.json({
    success: true,
    message: `Welcome, ${name.trim()}! Check-in recorded at ${restaurant.name}.`,
    restaurant_name: restaurant.name,
    is_new: isNew,
    visit_number: visitNumber,
  });
}
