import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { getCustomerProfile } from "@/lib/queries/customers";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";
import { ArrowLeft, Phone, Calendar, ShoppingBag, TrendingUp, Star, Clock } from "lucide-react";

interface Props {
  params: { id: string };
}

const segmentVariant: Record<string, string> = {
  new: "new",
  returning: "returning",
  loyal: "loyal",
  inactive: "inactive",
};

export default async function CustomerProfilePage({ params }: Props) {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = await getCustomerProfile(params.id, restaurant.id);
  if (!profile) notFound();

  const { customer, totalSpent, avgSpend, daysSinceLastVisit, topItems, recentOrders } = profile;

  return (
    <>
      <Header
        title="Customer Profile"
        searchPlaceholder="Search customers..."
        restaurantName={restaurant.name}
        userEmail={user?.email}
        restaurantId={restaurant.id}
        logoUrl={restaurant.logo_url}
      />

      <div className="p-4 md:p-6 max-w-4xl space-y-6">
        {/* Back link */}
        <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>

        {/* Profile header */}
        <Card className="p-6 bg-white">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary">{customer.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
                <Badge variant={segmentVariant[customer.segment] as any} className="capitalize">{customer.segment}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-0.5">
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
              </div>
              {customer.first_visit_date && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Calendar className="w-3.5 h-3.5" /> Member since{" "}
                  {new Date(customer.first_visit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-white text-center">
            <ShoppingBag className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">{customer.total_visits}</p>
            <p className="text-xs text-slate-500">Total Visits</p>
          </Card>
          <Card className="p-4 bg-white text-center">
            <TrendingUp className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">ZMW {totalSpent.toFixed(0)}</p>
            <p className="text-xs text-slate-500">Total Spent</p>
          </Card>
          <Card className="p-4 bg-white text-center">
            <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">ZMW {avgSpend.toFixed(0)}</p>
            <p className="text-xs text-slate-500">Avg Spend</p>
          </Card>
          <Card className="p-4 bg-white text-center">
            <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">{daysSinceLastVisit ?? "—"}</p>
            <p className="text-xs text-slate-500">Days Since Visit</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top items */}
          <Card className="p-5 bg-white">
            <h3 className="font-semibold text-sm text-slate-700 mb-3">Favourite Items</h3>
            {topItems.length === 0 ? (
              <p className="text-sm text-slate-400">No order data yet.</p>
            ) : (
              <div className="space-y-2">
                {topItems.map((item, i) => (
                  <div key={item.item_name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.item_name}</p>
                    </div>
                    <span className="text-xs text-slate-500">×{item.total_quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent orders */}
          <Card className="p-5 bg-white">
            <h3 className="font-semibold text-sm text-slate-700 mb-3">Recent Orders</h3>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-slate-400">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{formatRelativeTime(o.created_at)}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {(o.items ?? []).slice(0, 2).map((i: any) => i.item_name).join(", ")}
                        {(o.items ?? []).length > 2 ? ` +${(o.items ?? []).length - 2} more` : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-orange-600">ZMW {o.total_amount.toFixed(2)}</p>
                      <span className={`text-xs capitalize ${o.status === "completed" ? "text-green-600" : o.status === "cancelled" ? "text-slate-400" : "text-blue-600"}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
