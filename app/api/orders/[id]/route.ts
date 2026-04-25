import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { status } = body ?? {};
  const allowed = ["pending", "confirmed", "completed", "cancelled"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
