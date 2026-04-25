import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignBuilder } from "@/components/campaigns/campaign-builder";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { getCampaigns, getMessageTemplates, getCampaignStats } from "@/lib/queries/campaigns";
import { getSegmentCounts } from "@/lib/queries/customers";
import { createClient } from "@/lib/supabase/server";
import { Send, MessageSquare, TrendingUp, Activity } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { formatNumber } from "@/lib/utils";
import { ExtendButton } from "@/components/campaigns/extend-button";
import { AiTimingCard } from "@/components/campaigns/ai-timing-card";

export default async function CampaignsPage() {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [campaigns, templates, segCounts, stats] = await Promise.all([
    getCampaigns(restaurant.id, 20),
    getMessageTemplates(restaurant.id),
    getSegmentCounts(restaurant.id),
    getCampaignStats(restaurant.id),
  ]);

  const audienceCounts = {
    all: segCounts.all,
    new: segCounts.new,
    returning: segCounts.returning,
    loyal: segCounts.loyal,
    inactive_30d: segCounts.inactive,
  };

  const statusVariant = (status: string) => {
    if (status === "completed") return "completed";
    if (status === "scheduled") return "scheduled";
    if (status === "draft") return "secondary";
    return "outline";
  };

  return (
    <>
      <Header title="Campaigns" searchPlaceholder="Search customers..." restaurantName={restaurant.name} userEmail={user?.email} restaurantId={restaurant.id} logoUrl={restaurant.logo_url} />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Top stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Campaigns Sent</div>
                <div className="text-xl font-semibold">{formatNumber(stats.completed_campaigns)}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Send className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Messages Sent</div>
                <div className="text-xl font-semibold">{formatNumber(stats.total_messages_sent)}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Delivery Rate</div>
                <div className="text-xl font-semibold">{stats.delivery_rate}%</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Activity className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Active</div>
                <div className="text-xl font-semibold">{stats.active_campaigns}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* AI timing recommendation */}
        <AiTimingCard />

        {/* Campaign builder */}
        <CampaignBuilder
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          templates={templates}
          segmentCounts={audienceCounts}
        />

        {/* Campaign History */}
        <Card className="p-0 overflow-hidden bg-white">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold">Campaign History</h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b text-xs text-slate-500 uppercase">
                <th className="text-left font-medium px-6 py-3">Campaign Name</th>
                <th className="text-left font-medium px-6 py-3">Audience</th>
                <th className="text-left font-medium px-6 py-3">Sent</th>
                <th className="text-left font-medium px-6 py-3">Delivered</th>
                <th className="text-left font-medium px-6 py-3">Status</th>
                <th className="text-left font-medium px-6 py-3">Scheduled</th>
                <th className="text-left font-medium px-6 py-3">Ends</th>
                <th className="text-left font-medium px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const endsAtDate = c.ends_at ? new Date(c.ends_at) : null;
                const expired = endsAtDate ? isPast(endsAtDate) : false;
                const expiringSoon = endsAtDate && !expired
                  ? differenceInDays(endsAtDate, new Date()) <= 7
                  : false;
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium">{c.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{c.audience_segment.replace(/_/g, " ")}</td>
                    <td className="px-6 py-4 text-sm">{c.sent_count}</td>
                    <td className="px-6 py-4 text-sm">{c.delivered_count}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant(c.status) as any} className="capitalize">{c.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {c.scheduled_at ? format(new Date(c.scheduled_at), "MMM d, HH:mm") : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {endsAtDate ? (
                        <span className={expired ? "text-red-500 font-medium" : expiringSoon ? "text-orange-500 font-medium" : "text-slate-600"}>
                          {format(endsAtDate, "MMM d")}
                          {expired && " (expired)"}
                          {expiringSoon && !expired && " (soon)"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {(expired || expiringSoon) && (
                        <ExtendButton campaignId={c.id} endsAt={c.ends_at} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No campaigns yet. Create your first one above.
                  </td>
                </tr>

              )}
            </tbody>
          </table>
          </div>
        </Card>
      </div>
    </>
  );
}
