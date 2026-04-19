import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/types/database";

export async function getCurrentRestaurant(): Promise<Restaurant | null> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  console.log("=== getCurrentRestaurant DEBUG ===");
  console.log("User error:", userError);
  console.log("User ID:", user?.id);
  console.log("User email:", user?.email);

  if (!user) {
    console.log("❌ No user found in session");
    console.log("=== END DEBUG ===");
    return null;
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle();

  console.log("Query error:", error);
  console.log("Restaurant data:", data ? `Found: ${data.name}` : "null");
  console.log("=== END DEBUG ===");

  if (error || !data) return null;
  return data as Restaurant;
}

