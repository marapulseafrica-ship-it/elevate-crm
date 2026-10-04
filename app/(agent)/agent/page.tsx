import { getCurrentAgent, getAgentMonthSummary, getAgentLeads } from "@/lib/queries/sales-agents";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, TrendingUp, Award, Clock, ChevronRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  interested: "bg-yellow-100 text-yellow-700",
  free_trial: "bg-purple-100 text-purple-700",
  activated: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-600",
};

export default async function AgentDashboardPage() {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");

  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
  const [summary, leads] = await Promise.all([
    getAgentMonthSummary(agent.id, currentMonth),
    getAgentLeads(agent.id, currentMonth),
  ]);

  const monthLabel = format(new Date(currentMonth), "MMMM yyyy");
  const callProgress = Math.min(100, Math.round((summary.qualified_calls / 25) * 100));

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome, {agent.full_name.split(" ")[0]}!</h1>
        <p className="text-sm text-slate-500 mt-0.5">{monthLabel} · Your sales agent portal</p>
      </div>

      {/* Month progress cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Restaurants Listed</span>
            <List className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{summary.leads_submitted}</div>
          <div className="text-xs text-slate-400 mt-1">of 25 · {summary.leads_remaining} remaining</div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, (summary.leads_submitted / 25) * 100)}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Qualified Calls</span>
            <Phone className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{summary.qualified_calls}</div>
          <div className="text-xs text-slate-400 mt-1">of 25 · {summary.calls_remaining} to go</div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${callProgress}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Activity Fee</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">K{Number(summary.activity_fee).toFixed(0)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.qualified_calls >= 25 ? "Full K250 earned!" : `K10 per call · K${(25 - summary.qualified_calls) * 10} more to full fee`}
          </div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Total This Month</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">
            K{Number(summary.total_earnings_this_month).toFixed(0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            incl. K{Number(summary.bonuses_this_month).toFixed(0)} bonus · K{Number(summary.commission_this_month).toFixed(0)} commission
          </div>
        </Card>
      </div>

      {/* How you earn — contract summary */}
      <Card className="p-5 bg-white">
        <h3 className="text-sm font-semibold mb-3 text-slate-700">How You Earn This Month</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-blue-50">
            <div className="font-semibold text-blue-800 mb-1">Activity Fee</div>
            <div className="text-blue-700">K250 for 25 qualified calls</div>
            <div className="text-xs text-blue-600 mt-1">K10/call if under 25</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50">
            <div className="font-semibold text-amber-800 mb-1">Conversion Bonus</div>
            <div className="text-amber-700">K1,000 per restaurant</div>
            <div className="text-xs text-amber-600 mt-1">When they pay the activation fee</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50">
            <div className="font-semibold text-emerald-800 mb-1">Commission</div>
            <div className="text-emerald-700">10% of monthly performance fee</div>
            <div className="text-xs text-emerald-600 mt-1">First 5 paid months per restaurant</div>
          </div>
        </div>
      </Card>

      {/* Recent leads */}
      <Card className="p-0 overflow-hidden bg-white">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">{monthLabel} — My Restaurants ({leads.length}/25)</h3>
          <Link href="/agent/leads" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            Manage <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {leads.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-400 mb-3">You haven&apos;t added any restaurants yet this month.</p>
            <Link
              href="/agent/leads"
              className="inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Restaurants
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {leads.slice(0, 8).map((lead) => (
              <div key={lead.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{lead.restaurant_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lead.location ?? "—"} · {lead.qualified_calls} call{lead.qualified_calls !== 1 ? "s" : ""}
                    {lead.last_call_at && ` · last: ${format(new Date(lead.last_call_at), "MMM d")}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {lead.qualified_calls > 0 && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[lead.status] ?? ""}`}>
                    {lead.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment reminder */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-amber-800">Payment schedule: </span>
            <span className="text-amber-700">
              ElevateAI sends your earnings statement by the 5th of each month and pays by the 10th via Airtel Money, MTN MoMo or bank transfer.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Needed for the card icon above
function List({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
