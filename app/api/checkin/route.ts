import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { checkinEmail, customerMilestoneEmail, visitMilestoneEmail } from "@/lib/email-templates";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";

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
    .select("id, name, email, slug, latitude, longitude, checkin_location_enabled, notification_preferences")
    .eq("api_key", api_key)
    .eq("is_active", true)
    .single();

  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 401 });
  }

  const prefs = (restaurant.notification_preferences ?? {}) as Record<string, boolean>;
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const settingsUrl = `${BASE_URL}/settings`;

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
      const nextCheckinAt = new Date(new Date(recentVisit.visit_date).getTime() + 2 * 60 * 60 * 1000).toISOString();
      return NextResponse.json(
        { success: false, error: "too_soon", nextCheckinAt },
        { status: 429 }
      );
    }
  }

  // Upsert customer — never overwrite name/notes for existing customers
  const isExisting = !!existingCustomer;
  const upsertPayload: Record<string, any> = {
    restaurant_id: restaurant.id,
    phone: normalisedPhone,
    opted_in_whatsapp: true,
  };
  if (!isExisting) {
    upsertPayload.name = name.trim();
    upsertPayload.notes = notes?.trim() || null;
  }
  if (email?.trim()) upsertPayload.email = email.trim();

  const { data: customers, error: upsertErr } = await supabaseAdmin
    .from("customers")
    .upsert(upsertPayload, { onConflict: "restaurant_id,phone", ignoreDuplicates: false })
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

  // Fetch updated counts after trigger
  const [{ data: updatedCustomer }, { data: totalCustomersData }] = await Promise.all([
    supabaseAdmin.from("customers").select("total_visits").eq("id", customerId).single(),
    supabaseAdmin.from("customers").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
  ]);

  const visitNumber = updatedCustomer?.total_visits ?? customers[0].total_visits + 1;
  const totalCustomers = (totalCustomersData as any)?.count ?? 0;

  // In-app notification
  await supabaseAdmin.from("notifications").insert({
    restaurant_id: restaurant.id,
    type: "customer_checkin",
    title: isNew ? "New customer checked in!" : "Customer returned!",
    body: `${name.trim()} – Visit #${visitNumber}`,
    is_read: false,
  });

  const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });

  // Email: check-in notification
  if (prefs.notify_via_email !== false && prefs.email_on_checkin === true) {
    await sendEmail(
      restaurant.email,
      `${restaurant.name} — New check-in from ${name.trim()}`,
      checkinEmail({ restaurantName: restaurant.name, customerName: name.trim(), visitNumber, isNew, time: timeStr, dashboardUrl, settingsUrl })
    );
  }

  // Email: new customer milestone (every 20)
  if (isNew && prefs.notify_via_email !== false && prefs.email_on_customer_milestone !== false) {
    if (totalCustomers >= 20 && totalCustomers % 20 === 0) {
      const { count: newThisMonth } = await supabaseAdmin
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const { count: loyalCount } = await supabaseAdmin
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .gte("total_visits", 5);

      await sendEmail(
        restaurant.email,
        `🎉 ${restaurant.name} just hit ${totalCustomers} customers — milestone reached!`,
        customerMilestoneEmail({
          restaurantName: restaurant.name,
          totalCustomers,
          newThisMonth: newThisMonth ?? 0,
          loyalCustomers: loyalCount ?? 0,
          nextMilestone: totalCustomers + 20,
          dashboardUrl,
          settingsUrl,
        })
      );
    }
  }

  // Email: visit milestone (every 20 return visits today)
  if (!isNew && prefs.notify_via_email !== false && prefs.email_on_visit_milestone !== false) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: returnVisitsToday } = await supabaseAdmin
      .from("visits")
      .select("v.id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)
      .gte("visit_date", todayStart.toISOString())
      .gt("customers.total_visits", 1);

    // Simpler: count all visits today for customers with total_visits > 1
    const { data: todayVisits } = await supabaseAdmin
      .from("visits")
      .select("customer_id")
      .eq("restaurant_id", restaurant.id)
      .gte("visit_date", todayStart.toISOString());

    const uniqueCustomerIds = Array.from(new Set((todayVisits ?? []).map((v: any) => v.customer_id)));
    // Count how many of today's visitors are returning (total_visits > 1 after this visit)
    const returnCount = uniqueCustomerIds.length;

    if (returnCount > 0 && returnCount % 20 === 0) {
      const { count: newTodayCount } = await supabaseAdmin
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", todayStart.toISOString());

      await sendEmail(
        restaurant.email,
        `🔥 ${restaurant.name} — ${returnCount} loyal customers came back today`,
        visitMilestoneEmail({
          restaurantName: restaurant.name,
          returnVisits: returnCount,
          newCheckins: newTodayCount ?? 0,
          totalVisits: (todayVisits ?? []).length,
          dashboardUrl,
          settingsUrl,
        })
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: `Welcome, ${name.trim()}! Check-in recorded at ${restaurant.name}.`,
    restaurant_name: restaurant.name,
    is_new: isNew,
    visit_number: visitNumber,
  });
}
