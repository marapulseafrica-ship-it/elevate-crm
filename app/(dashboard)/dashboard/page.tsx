import { Header } from "@/components/dashboard/header";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { StatCard } from "@/components/dashboard/stat-card";
import { VisitsChart } from "@/components/dashboard/visits-chart";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { getDashboardSummary, getVisitsChartData, getRecentCustomers } from "@/lib/queries/dashboard";
import { getTodayVisitBreakdown } from "@/lib/queries/analytics";
import { createClient } from "@/lib/supabase/server";
import {
  Users, RotateCw, UserPlus, AlertCircle, Flame, Star, Send, Eye, ChevronRight, TrendingUp, Megaphone,
} from "lucide-react";
import { formatRelativeTime, formatNumber } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [summary, chartData, recentCustomers, todayBreakdown] = await Promise.all([
    getDashboardSummary(restaurant.id),
    getVisitsChartData(restaurant.id, 30),
    getRecentCustomers(restaurant.id, 5),
    getTodayVisitBreakdown(restaurant.id),
  ]);

  if (!summary) {
    return (
      <>
        <Header title="Dashboard" searchPlaceholder="Search customers..." restaurantName={restaurant.name} userEmail={user?.email} restaurantId={restaurant.id} logoUrl={restaurant.logo_url} />
        <div className="p-6">Loading dashboard data...</div>
      </>
    );
  }

  const segmentVariant = (seg: string) => {
    if (seg === "loyal") return "loyal";
    if (seg === "new") return "new";
    if (seg === "returning") return "returning";
    return "inactive";
  };

  return (
    <>
      <Header
        title="Dashboard"
        searchPlaceholder="Search customers..."
        restaurantName={restaurant.name}
        userEmail={user?.email}
        restaurantId={restaurant.id}
        logoUrl={restaurant.logo_url}
      />

      <AutoRefresh intervalMs={60_000} />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Top stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Customers"
            value={summary.total_customers}
            trend={`${summary.new_this_month} this month`}
            trendDirection="up"
            icon={Users}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Active Returning"
            value={summary.returning_30d}
            subtitle="unique customers, last 30 days"
            icon={RotateCw}
            iconColor="text-emerald-500"
          />
          <StatCard
            title="New Customers"
            value={summary.new_7d}
            subtitle="last 7 days"
            icon={UserPlus}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Inactive Customers"
            value={summary.inactive_30d}
            subtitle="30+ days inactive"
            icon={AlertCircle}
            iconColor="text-orange-500"
          />
        </div>

        {/* Chart + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VisitsChart data={chartData} />
          </div>

          <Card className="p-6 bg-white">
            <h3 className="text-base font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/campaigns?type=win_back" className="flex items-center justify-between p-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-medium">Win Back Customers</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/campaigns?type=loyalty_reward" className="flex items-center justify-between p-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">Reward Loyal Customers</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/campaigns?type=promotion" className="flex items-center justify-between p-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span className="text-sm font-medium">Send Promotion</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/customers" className="flex items-center justify-between p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">View All Customers</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Today's Traffic — campaign vs organic */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">Today&apos;s Traffic</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {todayBreakdown.total} visit{todayBreakdown.total !== 1 ? "s" : ""} today
                {todayBreakdown.total > 0 && (
                  <span> — {todayBreakdown.campaign_driven} from campaigns, {todayBreakdown.organic} organic</span>
                )}
              </p>
            </div>
            <Link href="/analytics" className="text-xs text-primary font-medium hover:underline">Full breakdown →</Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-slate-50 text-center">
              <div className="text-2xl font-bold text-slate-800">{todayBreakdown.total}</div>
              <div className="text-xs text-slate-500 mt-0.5">Total Visits</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 text-center">
              <div className="text-2xl font-bold text-emerald-700">{todayBreakdown.campaign_driven}</div>
              <div className="text-xs text-emerald-600 mt-0.5">
                Campaign{todayBreakdown.total > 0 ? ` · ${Math.round((todayBreakdown.campaign_driven / todayBreakdown.total) * 100)}%` : ""}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-center">
              <div className="text-2xl font-bold text-blue-700">{todayBreakdown.organic}</div>
              <div className="text-xs text-blue-600 mt-0.5">
                Organic{todayBreakdown.total > 0 ? ` · ${Math.round((todayBreakdown.organic / todayBreakdown.total) * 100)}%` : ""}
              </div>
            </div>
          </div>

          {/* Today's revenue split */}
          {(todayBreakdown.campaign_revenue + todayBreakdown.organic_revenue) > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-emerald-50 text-center">
                <div className="text-lg font-bold text-emerald-700">ZMW {Number(todayBreakdown.campaign_revenue).toFixed(2)}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Campaign Revenue Today</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-center">
                <div className="text-lg font-bold text-blue-700">ZMW {Number(todayBreakdown.organic_revenue).toFixed(2)}</div>
                <div className="text-xs text-blue-600 mt-0.5">Organic Revenue Today</div>
              </div>
            </div>
          )}

          {todayBreakdown.campaign_customers.length > 0 ? (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-600">Campaign-driven visitors today</span>
              </div>
              <div className="divide-y divide-slate-100">
                {todayBreakdown.campaign_customers.slice(0, 8).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{c.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{c.phone}</span>
                    </div>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{c.campaign_name}</span>
                  </div>
                ))}
                {todayBreakdown.campaign_customers.length > 8 && (
                  <div className="pt-2 text-xs text-slate-400 text-center">
                    +{todayBreakdown.campaign_customers.length - 8} more — <Link href="/analytics" className="text-primary hover:underline">see all</Link>
                  </div>
                )}
              </div>
            </div>
          ) : todayBreakdown.total > 0 ? (
            <p className="text-xs text-slate-400">No campaign-driven visitors yet today — all {todayBreakdown.total} visit{todayBreakdown.total !== 1 ? "s" : ""} were organic.</p>
          ) : (
            <p className="text-xs text-slate-400">No visits recorded yet today.</p>
          )}
        </Card>

        {/* Recent Customers + Insights + Last Campaign */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-white">
            <h3 className="text-base font-semibold mb-4">Recent Customers</h3>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="text-xs text-slate-500 border-b">
                  <th className="text-left font-medium pb-2">NAME</th>
                  <th className="text-left font-medium pb-2">LAST VISIT</th>
                  <th className="text-left font-medium pb-2">VISITS</th>
                  <th className="text-left font-medium pb-2">SEGMENT</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3 text-sm font-medium">{c.name}</td>
                    <td className="py-3 text-sm text-slate-600">{formatRelativeTime(c.last_visit_date)}</td>
                    <td className="py-3 text-sm">{c.total_visits}</td>
                    <td className="py-3">
                      <Badge variant={segmentVariant(c.segment) as any} className="capitalize">{c.segment}</Badge>
                    </td>
                  </tr>
                ))}
                {recentCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-slate-500">No customers yet</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6 bg-white">
              <h3 className="text-base font-semibold mb-4">Insights</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold">{formatNumber(summary.inactive_30d)}</span>
                    <span className="text-slate-700"> customers haven&apos;t returned in 30 days</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
                  <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <span className="text-slate-700">You gained </span>
                    <span className="font-semibold">{formatNumber(summary.new_7d)}</span>
                    <span className="text-slate-700"> new customers this week</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50">
                  <Flame className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold">{formatNumber(summary.visits_today)}</span>
                    <span className="text-slate-700"> visits today</span>
                  </div>
                </div>
              </div>
            </Card>

            {summary.last_campaign && (
              <Card className="p-6 bg-white">
                <h3 className="text-base font-semibold mb-4">Campaign Overview</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Last campaign</div>
                    <div className="text-sm font-medium mt-1 flex items-center gap-2">
                      <span>✓</span>
                      <span>{summary.last_campaign.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold">{formatNumber(summary.last_campaign.sent_count)}</div>
                    <div className="text-xs text-slate-500">Delivered: {summary.last_campaign.delivered_count}</div>
                  </div>
                  <Badge variant="completed">Completed</Badge>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
