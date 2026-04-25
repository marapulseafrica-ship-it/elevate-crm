import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { order_id, restaurant_id, rating, comment } = await req.json();

    if (!order_id || !restaurant_id || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Look up customer_id from the order
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("customer_id")
      .eq("id", order_id)
      .single();

    await supabaseAdmin.from("order_feedback").insert({
      order_id,
      restaurant_id,
      customer_id: order?.customer_id ?? null,
      rating,
      comment: comment?.trim() || null,
      is_public: rating >= 4,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
