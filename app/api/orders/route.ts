import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://elevate-crm-gamma.vercel.app";

interface OrderItemInput {
  menu_item_id: string;
  qty: number;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, customer_name, phone, table_number, items, notes } = body ?? {};

  if (!slug || !customer_name?.trim() || !phone?.trim() || !table_number?.trim() || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: "slug, customer_name, phone, table_number, and items are required" },
      { status: 400 }
    );
  }

  // Resolve restaurant by slug
  const { data: restaurant } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, email, notification_preferences")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!restaurant) {
    return NextResponse.json({ success: false, error: "Restaurant not found" }, { status: 404 });
  }

  // Resolve customer (optional — guest orders are allowed)
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("phone", phone.trim())
    .single();

  // Fetch menu item prices from DB — never trust client prices
  const itemIds: string[] = (items as OrderItemInput[]).map((i) => i.menu_item_id);
  const { data: menuItems } = await supabaseAdmin
    .from("menu_items")
    .select("id, name, price, is_available")
    .eq("restaurant_id", restaurant.id)
    .in("id", itemIds);

  if (!menuItems?.length) {
    return NextResponse.json({ success: false, error: "No valid menu items found" }, { status: 400 });
  }

  const itemMap = new Map(menuItems.map((m) => [m.id, m]));

  // Build order line items and compute total
  const lineItems: { menu_item_id: string; item_name: string; item_price: number; quantity: number; subtotal: number }[] = [];
  let totalAmount = 0;

  for (const input of items as OrderItemInput[]) {
    const menuItem = itemMap.get(input.menu_item_id);
    if (!menuItem || !menuItem.is_available) continue;
    const qty = Math.max(1, Math.floor(input.qty));
    const subtotal = menuItem.price * qty;
    totalAmount += subtotal;
    lineItems.push({
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      item_price: menuItem.price,
      quantity: qty,
      subtotal,
    });
  }

  if (lineItems.length === 0) {
    return NextResponse.json({ success: false, error: "All selected items are unavailable" }, { status: 400 });
  }

  // Insert order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      restaurant_id: restaurant.id,
      customer_id: customer?.id ?? null,
      customer_name: customer_name.trim(),
      table_number: table_number.trim(),
      total_amount: totalAmount,
      notes: notes?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ success: false, error: "Could not save order" }, { status: 500 });
  }

  // Insert order items
  await supabaseAdmin.from("order_items").insert(
    lineItems.map((li) => ({ ...li, order_id: order.id }))
  );

  // In-app notification
  const itemsSummary = lineItems.map((li) => `${li.item_name} ×${li.quantity}`).join(", ");
  await supabaseAdmin.from("notifications").insert({
    restaurant_id: restaurant.id,
    type: "new_order",
    title: `New order — Table ${table_number.trim()}`,
    body: `${customer_name.trim()} ordered: ${itemsSummary} · ZMW ${totalAmount.toFixed(2)}`,
    is_read: false,
  });

  // Email notification (if enabled)
  const prefs = (restaurant.notification_preferences ?? {}) as Record<string, boolean>;
  if (prefs.notify_via_email !== false && prefs.email_on_order !== false) {
    const itemsHtml = lineItems
      .map((li) => `<tr><td style="padding:4px 8px;">${li.item_name}</td><td style="padding:4px 8px;text-align:center;">${li.quantity}</td><td style="padding:4px 8px;text-align:right;">ZMW ${li.subtotal.toFixed(2)}</td></tr>`)
      .join("");
    await sendEmail(
      restaurant.email,
      `New Order — Table ${table_number.trim()} at ${restaurant.name}`,
      `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 16px;">
        <h2 style="color:#1e293b;margin-bottom:4px;">New Order</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:24px;">${restaurant.name}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="border-bottom:2px solid #e2e8f0;">
            <th style="text-align:left;padding:6px 8px;color:#64748b;">Item</th>
            <th style="text-align:center;padding:6px 8px;color:#64748b;">Qty</th>
            <th style="text-align:right;padding:6px 8px;color:#64748b;">Amount</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot><tr style="border-top:2px solid #e2e8f0;">
            <td colspan="2" style="padding:8px;font-weight:600;">Total</td>
            <td style="padding:8px;text-align:right;font-weight:700;color:#f97316;">ZMW ${totalAmount.toFixed(2)}</td>
          </tr></tfoot>
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:14px;">
          <strong>Customer:</strong> ${customer_name.trim()}<br/>
          <strong>Table:</strong> ${table_number.trim()}${notes ? `<br/><strong>Notes:</strong> ${notes.trim()}` : ""}
        </div>
        <a href="${BASE_URL}/menu" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Orders →</a>
      </div>`
    );
  }

  return NextResponse.json({
    success: true,
    order_id: order.id,
    total_amount: totalAmount,
    items_count: lineItems.length,
  });
}
