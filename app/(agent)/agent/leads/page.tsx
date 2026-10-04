import { getCurrentAgent, getAgentLeads, getAgentMonthSummary, getAllClaimedRestaurants } from "@/lib/queries/sales-agents";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LeadManager } from "@/components/agent/lead-manager";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";

export default async function AgentLeadsPage() {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");

  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
  const [leads, summary, allClaimed] = await Promise.all([
    getAgentLeads(agent.id, currentMonth),
    getAgentMonthSummary(agent.id, currentMonth),
    getAllClaimedRestaurants(currentMonth),
  ]);

  const monthLabel = format(new Date(currentMonth), "MMMM yyyy");
  const canAddMore = leads.length < 25;

  // Restaurants claimed by OTHER agents this month (not me)
  const othersLeads = allClaimed.filter((r) => !r.is_mine);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Leads — {monthLabel}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Add up to 25 restaurants per month · log qualified calls to earn your activity fee
        </p>
      </div>

      {/* Month progress bar */}
      <Card className="p-5 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-slate-700">Monthly Progress</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {summary.qualified_calls}/25 qualified calls · K{Number(summary.activity_fee).toFixed(0)} activity fee earned
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">K{Number(summary.total_earnings_this_month).toFixed(0)}</div>
            <div className="text-xs text-slate-400">total this month</div>
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, (summary.qualified_calls / 25) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1.5">
          <span>{summary.qualified_calls} calls done</span>
          <span>{summary.calls_remaining} more for full K250</span>
        </div>
      </Card>

      {/* My restaurants + call logger */}
      <LeadManager
        agentId={agent.id}
        leads={leads}
        monthStr={currentMonth}
        canAddMore={canAddMore}
      />

      {/* All claimed this month by other agents — duplicate prevention */}
      <Card className="p-0 overflow-hidden bg-white">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-slate-700">Claimed This Month by Other Agents</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            These restaurants have already been claimed — do not duplicate them on your list
          </p>
        </div>
        {othersLeads.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No other restaurants claimed yet this month. You have a blank slate!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b text-xs text-slate-500 uppercase">
                  <th className="text-left font-medium px-5 py-3">Restaurant</th>
                  <th className="text-left font-medium px-5 py-3">Location</th>
                  <th className="text-left font-medium px-5 py-3">Claimed By</th>
                  <th className="text-left font-medium px-5 py-3">Claimed At</th>
                </tr>
              </thead>
              <tbody>
                {othersLeads.map((r) => (
                  <tr key={r.lead_id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{r.restaurant_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{r.location ?? "—"}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{r.agent_name}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {format(new Date(r.claimed_at), "MMM d, HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Rules reminder */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 space-y-1">
            <p><strong>First-submitted wins:</strong> Restaurants are allocated on a first-submitted basis. If you add a restaurant already on another agent&apos;s list, you will be asked to replace it within 2 days.</p>
            <p><strong>Qualified calls count when:</strong> You spoke with the owner, manager or decision-maker, explained the platform and free trial, and recorded the outcome within 24 hours. &quot;No answer&quot; does not count.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
