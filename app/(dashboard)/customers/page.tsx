import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { getCustomers, getSegmentCounts } from "@/lib/queries/customers";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits, isSuperAdmin, type PlanTier } from "@/lib/plans";
import { formatRelativeTime, formatNumber } from "@/lib/utils";
import { Send, AlertCircle, Heart, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import type { CustomerSegment } from "@/types/database";

interface PageProps {
  searchParams: { segment?: string; search?: string; page?: string };
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const segment = (searchParams.segment as CustomerSegment | "all") || "all";
  const search = searchParams.search || "";
  const page = parseInt(searchParams.page || "1", 10);

  const tier = (restaurant.subscription_tier ?? "starter") as PlanTier;
  const superAdmin = isSuperAdmin(user?.email);
  const planLimits = getPlanLimits(tier);

  const [customersResult, counts] = await Promise.all([
    getCustomers(restaurant.id, { segment, search, page, pageSize: 10 }),
    getSegmentCounts(restaurant.id),
  ]);

  const customerLimitReached = !superAdmin && planLimits.customers !== Infinity && counts.all >= planLimits.customers;

  const segmentVariant = (seg: string) => {
    if (seg === "loyal") return "loyal";
    if (seg === "new") return "new";
    if (seg === "returning") return "returning";
    return "inactive";
  };

  const filterTabs = [
    { id: "all", label: "All Customers", count: counts.all },
    { id: "new", label: "New", count: counts.new },
    { id: "returning", label: "Returning", count: counts.returning },
    { id: "inactive", label: "Inactive (30d)", count: counts.inactive },
    { id: "loyal", label: "Loyal", count: counts.loyal },
  ];

  return (
    <>
      <Header title="Customers" searchPlaceholder="Search name or phone..." restaurantName={restaurant.name} userEmail={user?.email} restaurantId={restaurant.id} logoUrl={restaurant.logo_url} />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Filter tabs row */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterTabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/customers?segment=${tab.id}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                segment === tab.id
                  ? "bg-primary text-white"
                  : "bg-white border text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              {tab.id !== "all" && (
                <span className="ml-2 opacity-70">({formatNumber(tab.count)})</span>
              )}
            </Link>
          ))}
          <div className="flex-1" />
          <Link href="/campaigns?new=true">
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Send Campaign
            </Button>
          </Link>
        </div>

        {/* Customer limit warning */}
        {planLimits.customers !== Infinity && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${customerLimitReached ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>
              {customerLimitReached
                ? `You've reached your ${formatNumber(planLimits.customers)}-customer limit. `
                : `${formatNumber(counts.all)} / ${formatNumber(planLimits.customers)} customers. `}
              {customerLimitReached && <Link href="/billing" className="font-semibold underline">Upgrade to add more</Link>}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Customer table */}
          <Card className="lg:col-span-3 p-0 overflow-hidden bg-white">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b text-xs text-slate-500 uppercase">
                  <th className="text-left font-medium px-6 py-3">Name</th>
                  <th className="text-left font-medium px-6 py-3">Phone</th>
                  <th className="text-left font-medium px-6 py-3">Last Visit</th>
                  <th className="text-left font-medium px-6 py-3">Total Visits</th>
                  <th className="text-left font-medium px-6 py-3">Segment</th>
                  <th className="text-left font-medium px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {customersResult.data.map((c) => {
                  const href = `/customers/${c.id}`;
                  const cell = "block w-full h-full";
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer">
                      <td className="px-6 py-4 text-sm font-medium">
                        <Link href={href} className="block hover:text-primary transition-colors">{c.name}</Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <Link href={href} className={cell}>{c.phone}</Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <Link href={href} className={cell}>{formatRelativeTime(c.last_visit_date)}</Link>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link href={href} className={cell}>{c.total_visits}</Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={href} className={cell}>
                          <Badge variant={segmentVariant(c.segment) as any} className="capitalize">{c.segment}</Badge>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={href} className={cell}>
                          {c.segment === "inactive" ? (
                            <Badge variant="outline" className="text-slate-600">View</Badge>
                          ) : (
                            <Badge variant="active">Active</Badge>
                          )}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {customersResult.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      No customers match these filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            {customersResult.totalPages > 1 && (
              <div className="px-6 py-3 border-t flex items-center justify-between text-sm text-slate-600">
                <div>
                  Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, customersResult.count)} of{" "}
                  {formatNumber(customersResult.count)}
                </div>
                <div className="flex gap-1">
                  {page > 1 && (
                    <Link href={`/customers?segment=${segment}&page=${page - 1}`}>
                      <Button variant="outline" size="sm">Previous</Button>
                    </Link>
                  )}
                  <span className="px-3 py-1 rounded bg-primary text-white text-sm font-medium">
                    {page}
                  </span>
                  {page < customersResult.totalPages && (
                    <Link href={`/customers?segment=${segment}&page=${page + 1}`}>
                      <Button variant="outline" size="sm">Next</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Segment Summary sidebar */}
          <Card className="p-6 bg-white h-fit">
            <h3 className="text-base font-semibold mb-4">Segment Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{formatNumber(counts.inactive)}</div>
                  <div className="text-xs text-slate-600">30+ days</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Heart className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{formatNumber(counts.loyal)}</div>
                  <div className="text-xs text-slate-600">Loyal</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{formatNumber(counts.new)}</div>
                  <div className="text-xs text-slate-600">New</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className="bg-slate-200 p-2 rounded-lg">
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{formatNumber(counts.returning)}</div>
                  <div className="text-xs text-slate-600">Returning</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
