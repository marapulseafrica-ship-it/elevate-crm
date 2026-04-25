import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const restaurant = await getCurrentRestaurant();
    if (!restaurant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient();
    const { data: stats } = await supabase.rpc("get_item_sales_stats", {
      p_restaurant_id: restaurant.id,
      p_days: 30,
    });

    if (!stats?.length) {
      return NextResponse.json({ recommendations: "No sales data available yet. Start taking orders to see AI insights.", top: [], slow: [], restock: [] });
    }

    const items = stats as { item_name: string; total_quantity: number; total_revenue: number; order_count: number }[];
    const top5 = items.slice(0, 5);
    const slow5 = items.slice(-5).reverse();

    // Items with high velocity (>= 80% of top item's volume) are restock alerts
    const maxQty = top5[0]?.total_quantity ?? 0;
    const restock = top5.filter((i) => i.total_quantity >= maxQty * 0.6).map((i) => i.item_name);

    const prompt = `You are a restaurant business advisor. Based on the last 30 days of sales data:

TOP SELLERS:
${top5.map((i, n) => `${n + 1}. ${i.item_name} — ${i.total_quantity} sold, ZMW ${Number(i.total_revenue).toFixed(2)} revenue`).join("\n")}

SLOWEST ITEMS:
${slow5.map((i, n) => `${n + 1}. ${i.item_name} — ${i.total_quantity} sold`).join("\n")}

Give 3 concise, practical action recommendations in plain bullet points (• format). Focus on: upselling top sellers, reviving slow items, and one operational tip. Keep each bullet under 25 words. No intro sentence.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const recommendations = (message.content[0] as any).text ?? "";

    return NextResponse.json({ recommendations, top: top5, slow: slow5, restock });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Internal error" }, { status: 500 });
  }
}
