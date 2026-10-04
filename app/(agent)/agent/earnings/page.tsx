import { getCurrentAgent, getAgentEarningsSummary, getAgentPayouts, getAgentConversions } from "@/lib/queries/sales-agents";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Award, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const payoutStatusVariant: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export default async function AgentEarningsPage() {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");

  const [earnings, payouts, conversions] = await Promise.all([
    getAgentEarningsSummary(agent.id),
    getAgentPayouts(agent.id),
    getAgentConversions(agent.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Earnings</h1>
        <p className="text-sm text-slate-500 mt-0.5">All-time earnings and payout history</p>
      </div>

      {/* Lifetime summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5 bg-white text-center">
          <div className="text-3xl font-bold text-slate-800">K{Number(earnings.grand_total).toFixed(0)}</div>
          <div className="text-xs text-slate-500 mt-1">Total Earned (all time)</div>
        </Card>
        <Card className="p-5 bg-white text-center border-emerald-200">
          <div className="text-3xl font-bold text-emerald-600">K{Number(earnings.paid_out).toFixed(0)}</div>
          <div className="text-xs text-emerald-600 mt-1">Paid Out</div>
        </Card>
        <Card className="p-5 bg-white text-center border-amber-200">
          <div className="text-3xl font-bold text-amber-600">K{Number(earnings.pending_payout).toFixed(0)}</div>
          <div className="text-xs text-amber-600 mt-1">Awaiting Payment</div>
        </Card>
        <Card className="p-5 bg-white text-center">
          <div className="text-3xl font-bold text-slate-800">{earnings.active_restaurants}</div>
          <div className="text-xs text-slate-500 mt-1">Restaurants Earning Commission</div>
        </Card>
      </div>

      {/* Earnings breakdown */}
      <Card className="p-5 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Earnings Breakdown (All Time)</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Activity Fees</div>
                <div className="text-xs text-slate-400">K250/month for 25+ qualified calls</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-slate-800">K{Number(earnings.total_activity_fees).toFixed(0)}</div>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Conversion Bonuses</div>
                <div className="text-xs text-slate-400">K1,000 per restaurant that activated</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-slate-800">K{Number(earnings.total_bonuses).toFixed(0)}</div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Commission (10%)</div>
                <div className="text-xs text-slate-400">10% of performance fee for first 5 paid months</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-slate-800">K{Number(earnings.total_commission).toFixed(0)}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Grand Total</div>
          <div className="text-2xl font-bold text-emerald-600">K{Number(earnings.grand_total).toFixed(0)}</div>
        </div>
      </Card>

      {/* Converted restaurants */}
      {conversions.length > 0 && (
        <Card className="p-0 overflow-hidden bg-white">
          <div className="px-5 py-4 border-b">
            <h3 className="text-sm font-semibold">My Converted Restaurants</h3>
            <p className="text-xs text-slate-400 mt-0.5">Restaurants that signed up through you · commission tracked for first 5 paid months</p>
          </div>
          <div className="divide-y">
            {conversions.map((c) => (
              <div key={c.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {c.restaurant_id ? `Restaurant ID: ${c.restaurant_id.slice(0, 8)}…` : "Pending link"}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Free trial started: {format(new Date(c.free_trial_started_at), "MMM d, yyyy")}
                    {c.activated_at && ` · Activated: ${format(new Date(c.activated_at), "MMM d, yyyy")}`}
                  </div>
                </div>
                <div className="text-right">
                  {c.activated_at ? (
                    <div>
                      <div className="text-sm font-medium text-emerald-600">
                        {c.paid_months}/5 paid months
                      </div>
                      <div className="text-xs text-slate-400">
                        K{Number(c.total_commission_earned).toFixed(0)} earned
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Free trial</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payout history */}
      <Card className="p-0 overflow-hidden bg-white">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Payout History</h3>
          <p className="text-xs text-slate-400 mt-0.5">ElevateAI pays by the 10th of each month</p>
        </div>
        {payouts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            No payouts recorded yet. Your first payout will appear here after your first completed month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b text-xs text-slate-500 uppercase">
                  <th className="text-left font-medium px-5 py-3">Month</th>
                  <th className="text-left font-medium px-5 py-3">Calls</th>
                  <th className="text-left font-medium px-5 py-3">Activity</th>
                  <th className="text-left font-medium px-5 py-3">Bonuses</th>
                  <th className="text-left font-medium px-5 py-3">Commission</th>
                  <th className="text-left font-medium px-5 py-3">Total</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium">
                      {format(new Date(p.month), "MMMM yyyy")}
                    </td>
                    <td className="px-5 py-3 text-sm">{p.qualified_calls}</td>
                    <td className="px-5 py-3 text-sm">K{Number(p.activity_fee).toFixed(0)}</td>
                    <td className="px-5 py-3 text-sm">K{Number(p.conversion_bonuses).toFixed(0)}</td>
                    <td className="px-5 py-3 text-sm">K{Number(p.commission).toFixed(0)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-emerald-600">
                      K{Number(p.total).toFixed(0)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payoutStatusVariant[p.status] ?? ""}`}>
                        {p.status}
                        {p.status === "paid" && p.paid_at && ` · ${format(new Date(p.paid_at), "MMM d")}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Contract terms reminder */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your Contract Terms (Summary)</h3>
        <ul className="space-y-1 text-xs text-slate-600">
          <li>• <strong>Activity fee:</strong> K250/month for 25+ qualified calls · K10/call if under 25</li>
          <li>• <strong>Conversion bonus:</strong> K1,000 when a restaurant you introduced pays the activation fee</li>
          <li>• <strong>Commission:</strong> 10% of ElevateAI&apos;s performance fee from each restaurant for its first 5 paid months</li>
          <li>• <strong>Payment:</strong> Statement by 5th, payment by 10th via Airtel Money / MTN MoMo / bank transfer</li>
          <li>• <strong>After leaving:</strong> You keep all earned bonuses and commission rights even after the contract ends</li>
        </ul>
      </Card>
    </div>
  );
}
