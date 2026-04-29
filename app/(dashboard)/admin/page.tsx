import { Header } from "@/components/dashboard/header";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/plans";
import { redirect } from "next/navigation";
import { AdminPaymentsTable } from "@/components/admin/admin-payments-table";

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    redirect("/dashboard");
  }

  const restaurant = await getCurrentRestaurant();

  const { data: pending } = await supabaseAdmin
    .from("payments")
    .select("*, restaurants(name, email, subscription_tier)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: recent } = await supabaseAdmin
    .from("payments")
    .select("*, restaurants(name, email, subscription_tier)")
    .in("status", ["completed", "failed"])
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <>
      <Header
        title="Admin — Payments"
        searchPlaceholder=""
        restaurantName={restaurant?.name ?? "Super Admin"}
        userEmail={user.email}
        restaurantId={restaurant?.id ?? ""}
        logoUrl={restaurant?.logo_url}
      />
      <div className="p-4 md:p-6 space-y-6">
        <AdminPaymentsTable pending={pending ?? []} recent={recent ?? []} />
      </div>
    </>
  );
}
