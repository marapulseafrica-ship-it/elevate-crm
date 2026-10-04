export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getCampaignAttributedCustomers } from "@/lib/queries/campaigns";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Users, DollarSign, ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const restaurant = (await getCurrentRestaurant())!;
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", params.id)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!campaign) notFound();

  // Fetch attributed customers and their post-attribution orders
  const [attributedCustomers, ordersRes] = await Promise.all([
    getCampaignAttributedCustomers(params.id),
    supabase
      .from("orders")
      .select("id, customer_id, customer_name, table_number, total_amount, status, created_at, items:order_items(item_name, item_price, quantity, subtotal)")
      .eq("restaurant_id", restaurant.id)
      .in(
        "customer_id",
        // We need customer IDs — fetch attributions first, handled below
        ["00000000-0000-0000-0000-000000000000"] // placeholder, replaced below
      )
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
  ]);

  // Re-fetch orders using real attributed customer IDs
  const customerIds = attributedCustomers.map((c) => c.customer_id);
  let orders: any[] = [];
  if (customerIds.length > 0) {
    // Get attribution timestamps to only include orders after attribution
    const attrMap = Object.fromEntries(
      attributedCustomers.map((c) => [c.customer_id, c.attributed_at])
    );
    const { data: rawOrders } = await supabase
      .from("orders")
      .select("id, customer_id, customer_name, table_number, total_amount, status, created_at, items:order_items(item_name, item_price, quantity, subtotal)")
      .eq("restaurant_id", restaurant.id)
      .in("customer_id", customerIds)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    // Filter to only orders placed after the customer's attribution timestamp
    orders = (rawOrders ?? []).filter((o: any) => {
      const attrAt = attrMap[o.customer_id];
      return attrAt ? new Date(o.created_at) >= new Date(attrAt) : true;
    });
  }

  const totalRevenue = attributedCustomers.reduce((s, c) => s + Number(c.total_spent), 0);
  const totalOrders = orders.length;

  return (
    <>
      <Header
        title={campaign.name}
        restaurantName={restaurant.name}
        userEmail={user?.email}
        restaurantId={restaurant.id}
        logoUrl={restaurant.logo_url}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Back */}
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to Campaigns
        </Link>

        {/* Campaign summary */}
        <div>
          <h1 className="text-xl font-bold text-slate-800">{campaign.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">
            {campaign.audience_segment.replace(/_/g, " ")} · sent {campaign.scheduled_at ? format(new Date(campaign.scheduled_at), "MMM d, yyyy") : "—"}
          </p>
        </div>

        {/* Attribution stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 bg-white flex items-center gap-4">
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Customers Returned</p>
              <p className="text-2xl font-bold text-slate-800">{attributedCustomers.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {campaign.sent_count > 0
                  ? `${Math.round((attributedCustomers.length / campaign.sent_count) * 100)}% return rate`
                  : "of those messaged"}
              </p>
            </div>
          </Card>
          <Card className="p-5 bg-white flex items-center gap-4">
            <div className="bg-blue-100 p-2.5 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Orders Placed</p>
              <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
              <p className="text-xs text-slate-400 mt-0.5">after returning from campaign</p>
            </div>
          </Card>
          <Card className="p-5 bg-white flex items-center gap-4">
            <div className="bg-orange-100 p-2.5 rounded-xl">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Revenue Generated</p>
              <p className="text-2xl font-bold text-slate-800">ZMW {totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-0.5">from attributed orders</p>
            </div>
          </Card>
        </div>

        {/* Attributed customers table */}
        <Card className="p-0 overflow-hidden bg-white">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-slate-800">Customers Who Returned</h3>
            <p className="text-xs text-slate-500 mt-0.5">Customers who scanned the QR after receiving this campaign</p>
          </div>
          {attributedCustomers.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              No customers have returned yet. They'll appear here when they scan the QR code.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase">
                    <th className="text-left font-medium px-6 py-3">Customer</th>
                    <th className="text-left font-medium px-6 py-3">Phone</th>
                    <th className="text-left font-medium px-6 py-3">Returned On</th>
                    <th className="text-left font-medium px-6 py-3">Visits Since</th>
                    <th className="text-left font-medium px-6 py-3">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {attributedCustomers.map((c) => (
                    <tr key={c.customer_id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-medium text-slate-800">{c.customer_name}</td>
                      <td className="px-6 py-3 text-sm text-slate-500">{c.phone}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">{format(new Date(c.attributed_at), "MMM d, yyyy · HH:mm")}</td>
                      <td className="px-6 py-3 text-sm">{c.visit_count}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-emerald-600">
                        {Number(c.total_spent) > 0 ? `ZMW ${Number(c.total_spent).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Orders from attributed customers */}
        {orders.length > 0 && (
          <Card className="p-0 overflow-hidden bg-white">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-slate-800">Orders from Returned Customers</h3>
              <p className="text-xs text-slate-500 mt-0.5">All orders placed after each customer's first return scan</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase">
                    <th className="text-left font-medium px-6 py-3">Customer</th>
                    <th className="text-left font-medium px-6 py-3">Table</th>
                    <th className="text-left font-medium px-6 py-3">Items</th>
                    <th className="text-left font-medium px-6 py-3">Total</th>
                    <th className="text-left font-medium px-6 py-3">Status</th>
                    <th className="text-left font-medium px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-medium text-slate-800">{order.customer_name}</td>
                      <td className="px-6 py-3 text-sm text-slate-500">Table {order.table_number}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 max-w-[240px]">
                        {(order.items ?? []).map((item: any, i: number) => (
                          <span key={i} className="inline-block mr-2">
                            {item.quantity}× {item.item_name}
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-emerald-600">
                        ZMW {Number(order.total_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={order.status === "completed" ? "completed" : "outline" as any} className="capitalize text-xs">
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {format(new Date(order.created_at), "MMM d, HH:mm")}
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
