import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignBuilder } from "@/components/campaigns/campaign-builder";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { getCampaigns, getMessageTemplates, getCampaignStats } from "@/lib/queries/campaigns";
import { getSegmentCounts } from "@/lib/queries/customers";
import { createClient } from "@/lib/supabase/server";
import { canAccess, isSuperAdmin, getPlanLimits, type PlanTier } from "@/lib/plans";
import { Send, MessageSquare, TrendingUp, Activity } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { formatNumber } from "@/lib/utils";
import { ExtendButton } from "@/components/campaigns/extend-button";
import { AiTimingCard } from "@/components/campaigns/ai-timing-card";

export default async function CampaignsPage() {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tier = (restaurant.subscription_tier ?? "starter") as PlanTier;
  const superAdmin = isSuperAdmin(user?.email);
  const canAccessAiTiming = superAdmin || canAccess(tier, "ai_timing");
  const planLimits = getPlanLimits(tier);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [campaigns, templates, segCounts, stats, monthCampaignsRes] = await Promise.all([
    getCampaigns(restaurant.id, 20),
    getMessageTemplates(restaurant.id),
    getSegmentCounts(restaurant.id),
    getCampaignStats(restaurant.id),
    createClient()
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)
      .in("status", ["completed", "sending", "scheduled"])
      .gte("created_at", monthStart.toISOString()),
  ]);

  const campaignsThisMonth = monthCampaignsRes.count ?? 0;
  const campaignLimitReached = !superAdmin && planLimits.campaigns !== Infinity && campaignsThisMonth >= planLimits.campaigns;

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
        {canAccessAiTiming && <AiTimingCard />}

        {/* Campaign limit warning */}
        {planLimits.campaigns !== Infinity && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${campaignLimitReached ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
            <Activity className="w-4 h-4 flex-shrink-0" />
            <span>
              {campaignLimitReached
                ? `You've used all ${planLimits.campaigns} campaigns for this month. `
                : `${campaignsThisMonth} / ${planLimits.campaigns} campaigns used this month. `}
              {campaignLimitReached && <a href="/billing" className="font-semibold underline">Upgrade to send more</a>}
            </span>
          </div>
        )}

        {/* Campaign builder */}
        <CampaignBuilder
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          templates={templates}
          segmentCounts={audienceCounts}
          campaignLimitReached={campaignLimitReached}
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
