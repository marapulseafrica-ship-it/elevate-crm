import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { PlanCard } from "@/components/billing/plan-card";
import { PLANS, isSuperAdmin, type PlanTier } from "@/lib/plans";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Payment } from "@/types/database";

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PageProps {
  searchParams: { success?: string; error?: string; plan?: string };
}

export default async function BillingPage({ searchParams }: PageProps) {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const superAdmin = isSuperAdmin(user?.email);
  const tier = (restaurant.subscription_tier ?? "starter") as PlanTier;
  const isExpired = !superAdmin && restaurant.subscription_status === "expired";

  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <>
      <Header
        title="Billing & Plans"
        searchPlaceholder="Search customers..."
        restaurantName={restaurant.name}
        userEmail={user?.email}
        restaurantId={restaurant.id}
        logoUrl={restaurant.logo_url}
      />

      <div className="p-4 md:p-6 space-y-6">

        {/* Success / error toasts */}
        {searchParams.success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            Payment confirmed! Your <span className="font-semibold capitalize">{searchParams.plan}</span> plan is now active.
          </div>
        )}
        {searchParams.error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {searchParams.error === "cancelled" ? "Payment was cancelled." : "Payment failed. Please try again."}
          </div>
        )}

        {/* Super admin badge */}
        {superAdmin && (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 text-sm px-4 py-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            Super admin account — full access to all features, no billing required.
          </div>
        )}

        {/* Current plan summary */}
        <Card className="p-6 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mb-1">Current Plan</p>
              <h2 className="text-2xl font-bold capitalize">{superAdmin ? "Premium (Admin)" : tier}</h2>
              {!superAdmin && restaurant.subscription_expires_at && (
                <p className={`text-sm mt-1 ${isExpired ? "text-red-600 font-medium" : "text-slate-500"}`}>
                  {isExpired ? "Expired" : "Renews"} {format(new Date(restaurant.subscription_expires_at), "d MMMM yyyy")}
                </p>
              )}
            </div>
            {!superAdmin && (
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                  isExpired ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                }`}>
                  {restaurant.subscription_status}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Plan cards */}
        {!superAdmin && (
          <div>
            <h3 className="text-base font-semibold mb-4">Available Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {(Object.keys(PLANS) as PlanTier[]).map((planKey) => (
                <PlanCard
                  key={planKey}
                  plan={PLANS[planKey]}
                  isCurrent={tier === planKey}
                  isExpired={isExpired}
                  restaurantId={restaurant.id}
                  customerEmail={user?.email ?? ""}
                  customerName={restaurant.name}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Payments processed securely via Flutterwave · Supports Airtel Money, MTN Zambia &amp; card
            </p>
          </div>
        )}

        {/* Payment history */}
        {(payments ?? []).length > 0 && (
          <Card className="p-0 overflow-hidden bg-white">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold">Payment History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase">
                    <th className="text-left font-medium px-6 py-3">Date</th>
                    <th className="text-left font-medium px-6 py-3">Plan</th>
                    <th className="text-left font-medium px-6 py-3">Amount</th>
                    <th className="text-left font-medium px-6 py-3">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {(payments as Payment[]).map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {p.completed_at ? format(new Date(p.completed_at), "d MMM yyyy") : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium capitalize">{p.plan}</td>
                      <td className="px-6 py-4 text-sm">${p.amount_usd}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                        {p.payment_method?.replace(/_/g, " ") ?? "Card"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
