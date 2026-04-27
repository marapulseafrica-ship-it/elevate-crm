import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UpgradeBanner } from "@/components/billing/upgrade-banner";
import { isSuperAdmin } from "@/lib/plans";
 
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
 
  // Not logged in - middleware should catch this, but belt-and-suspenders
  if (!user) {
    redirect("/login");
  }
 
  const restaurant = await getCurrentRestaurant();
 
  // Logged in but no restaurant exists - show a setup screen instead of redirecting
  // (Redirecting to /signup while logged in creates an infinite loop with the middleware)
  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl border shadow-sm p-8">
          <h1 className="text-xl font-semibold mb-2">No restaurant found</h1>
          <p className="text-sm text-slate-600 mb-6">
            Your account exists but isn&apos;t linked to a restaurant yet. This usually means
            either (a) you haven&apos;t run the seed data with your user ID, or (b) your user
            ID in the seed data doesn&apos;t match your logged-in account.
          </p>
          <div className="text-xs bg-slate-50 rounded p-3 mb-4 font-mono">
            <div className="font-semibold mb-1">Your user ID:</div>
            <div className="break-all">{user.id}</div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            In your Supabase SQL Editor, run this to link a restaurant to your account:
          </p>
          <pre className="text-xs bg-slate-900 text-slate-100 rounded p-3 mb-4 overflow-x-auto">
{`INSERT INTO restaurants (
  owner_user_id, name, slug, email
) VALUES (
  '${user.id}',
  'My Restaurant',
  'my-restaurant-${user.id.slice(0, 6)}',
  '${user.email}'
);`}
          </pre>
          <p className="text-xs text-slate-500">
            Or, if you already ran the seed data but with a different user ID, update it:
          </p>
          <pre className="text-xs bg-slate-900 text-slate-100 rounded p-3 mt-2 overflow-x-auto">
{`UPDATE restaurants
SET owner_user_id = '${user.id}'
WHERE slug = 'pizza-palace';`}
          </pre>
        </div>
      </div>
    );
  }
 
  const superAdmin = isSuperAdmin(user.email);
  const isExpired = !superAdmin && restaurant.subscription_status === "expired";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
          <UpgradeBanner isExpired={isExpired} tier={restaurant.subscription_tier} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
 