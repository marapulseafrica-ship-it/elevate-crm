import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { RevenueCharts } from "@/components/analytics/revenue-charts";
import { AnalyticsTabSwitcher } from "@/components/analytics/analytics-tab-switcher";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { getCampaignPerformance, getCampaignStats } from "@/lib/queries/campaigns";
import { getSegmentCounts } from "@/lib/queries/customers";
import { getRevenueBySegment } from "@/lib/queries/analytics";
import { createClient } from "@/lib/supabase/server";
import { Send, Activity, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";

export default async function AnalyticsPage() {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [campaigns, stats, segCounts, revenue] = await Promise.all([
    getCampaignPerformance(restaurant.id, 20),
    getCampaignStats(restaurant.id),
    getSegmentCounts(restaurant.id),
    getRevenueBySegment(restaurant.id),
  ]);

  const bestCampaign = campaigns.length > 0
    ? campaigns.reduce((best, c) => (c.delivery_rate > best.delivery_rate ? c : best))
    : null;

  return (
    <>
      <Header title="Analytics" searchPlaceholder="Search customers..." restaurantName={restaurant.name} userEmail={user?.email} restaurantId={restaurant.id} logoUrl={restaurant.logo_url} />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Top stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-white">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-slate-600">Total Campaigns</span>
              <Send className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-semibold">{formatNumber(stats.completed_campaigns)}</div>
            <div className="text-xs text-slate-500 mt-1">completed</div>
          </Card>
          <Card className="p-5 bg-white">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-slate-600">Messages Sent</span>
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-semibold">{formatNumber(stats.total_messages_sent)}</div>
            <div className="text-xs text-slate-500 mt-1">via WhatsApp</div>
          </Card>
          <Card className="p-5 bg-white">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-slate-600">Delivery Rate</span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-semibold">{stats.delivery_rate}%</div>
            <div className="text-xs text-slate-500 mt-1">{formatNumber(stats.total_delivered)} delivered</div>
          </Card>
          <Card className="p-5 bg-white">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-slate-600">Active Customers</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-semibold">{formatNumber((segCounts.new || 0) + (segCounts.returning || 0) + (segCounts.loyal || 0))}</div>
            <div className="text-xs text-slate-500 mt-1">non-inactive</div>
          </Card>
        </div>

        {/* Tabbed analytics sections */}
        <AnalyticsTabSwitcher
          campaigns={campaigns}
          segmentCounts={{ new: segCounts.new, returning: segCounts.returning, loyal: segCounts.loyal, inactive: segCounts.inactive }}
          revenue={revenue}
          bestCampaign={bestCampaign}
          restaurantId={restaurant.id}
          analyticsChartsSlot={
            <div className="space-y-6">
              <AnalyticsCharts
                campaigns={campaigns}
                segmentCounts={{ new: segCounts.new, returning: segCounts.returning, loyal: segCounts.loyal, inactive: segCounts.inactive }}
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-0 overflow-hidden bg-white">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-base font-semibold">Campaign Performance Detail</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                      <thead>
                        <tr className="border-b text-xs text-slate-500 uppercase">
                          <th className="text-left font-medium px-6 py-3">Campaign</th>
                          <th className="text-left font-medium px-6 py-3">Sent</th>
                          <th className="text-left font-medium px-6 py-3">Delivered</th>
                          <th className="text-left font-medium px-6 py-3">Rate</th>
                          <th className="text-left font-medium px-6 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium">{c.name}</div>
                              <div className="text-xs text-slate-500 capitalize">{c.campaign_type.replace(/_/g, " ")}</div>
                            </td>
                            <td className="px-6 py-4 text-sm">{c.sent_count}</td>
                            <td className="px-6 py-4 text-sm">{c.delivered_count}</td>
                            <td className="px-6 py-4">
                              <Badge variant={c.delivery_rate >= 90 ? "completed" : c.delivery_rate >= 70 ? "scheduled" : "destructive"}>
                                {c.delivery_rate}%
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {c.completed_at ? format(new Date(c.completed_at), "MMM d") : "—"}
                            </td>
                          </tr>
                        ))}
                        {campaigns.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">No completed campaigns yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card className="p-6 bg-white">
                  <h3 className="text-base font-semibold mb-4">Insights Summary</h3>
                  <div className="space-y-3 text-sm">
                    {bestCampaign && (
                      <div className="p-3 rounded-lg bg-emerald-50">
                        <div className="font-medium text-emerald-900">🏆 Best Performer</div>
                        <div className="text-xs text-emerald-700 mt-1">{bestCampaign.name} — {bestCampaign.delivery_rate}% delivery</div>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-blue-50">
                      <div className="font-medium text-blue-900">💎 Loyal Base</div>
                      <div className="text-xs text-blue-700 mt-1">{formatNumber(segCounts.loyal)} loyal customers driving repeat business</div>
                    </div>
                    {segCounts.inactive > 0 && (
                      <div className="p-3 rounded-lg bg-orange-50">
                        <div className="font-medium text-orange-900">⚠️ Win-back Opportunity</div>
                        <div className="text-xs text-orange-700 mt-1">{formatNumber(segCounts.inactive)} customers need re-engagement</div>
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-slate-50">
                      <div className="font-medium text-slate-900">📊 Engagement</div>
                      <div className="text-xs text-slate-700 mt-1">Avg delivery rate: <span className="font-semibold">{stats.delivery_rate}%</span></div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          }
        />
      </div>
    </>
  );
}
