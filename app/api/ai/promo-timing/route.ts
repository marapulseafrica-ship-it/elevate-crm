import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function POST(req: NextRequest) {
  try {
    const restaurant = await getCurrentRestaurant();
    if (!restaurant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient();
    const { data: patterns } = await supabase.rpc("get_order_patterns", {
      p_restaurant_id: restaurant.id,
    });

    if (!patterns?.length) {
      return NextResponse.json({ recommendation: "Not enough order data yet. Once you have completed orders, AI will analyse peak times to suggest the best campaign schedule." });
    }

    const top = (patterns as { hour_of_day: number; day_of_week: number; order_count: number; total_revenue: number }[])
      .slice(0, 8)
      .map((p) => `${DAYS[p.day_of_week]} ${p.hour_of_day}:00 — ${p.order_count} orders, ZMW ${Number(p.total_revenue).toFixed(0)} revenue`)
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{
        role: "user",
        content: `Based on peak order times for a restaurant (Africa/Lusaka timezone):
${top}

In 2-3 sentences, recommend the best day and time to send a WhatsApp campaign to maximise opens and redemptions. Be specific with day and time. Keep it conversational and actionable.`,
      }],
    });

    const recommendation = (message.content[0] as any).text ?? "";
    return NextResponse.json({ recommendation });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Internal error" }, { status: 500 });
  }
}
