import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/plans";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle, Clock, Award, DollarSign, Users } from "lucide-react";

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const statusColor: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  interested: "bg-yellow-100 text-yellow-700",
  free_trial: "bg-purple-100 text-purple-700",
  activated: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-600",
};

export default async function AdminSalesAgentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) redirect("/dashboard");

  const restaurant = await getCurrentRestaurant();

  // Use service role to bypass RLS and see ALL agents
  const [agentsRes, overviewRes, leadsRes, conversionsRes] = await Promise.all([
    supabaseAdmin.from("sales_agents").select("*").order("full_name"),
    supabaseAdmin.rpc("get_agents_admin_overview"),
    supabaseAdmin
      .from("agent_leads")
      .select("*, sales_agents(full_name)")
      .order("claimed_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("agent_conversions")
      .select("*, sales_agents(full_name), restaurants(name)")
      .order("created_at", { ascending: false }),
  ]);

  const agents = agentsRes.data ?? [];
  const overview = (overviewRes.data ?? []) as any[];
  const leads = (leadsRes.data ?? []).map((l: any) => ({
    ...l,
    agent_name: l.sales_agents?.full_name ?? "Unknown",
  }));
  const conversions = (conversionsRes.data ?? []).map((c: any) => ({
    ...c,
    agent_name: c.sales_agents?.full_name ?? "Unknown",
    restaurant_name: c.restaurants?.name ?? null,
  }));

  const totalUnpaid = overview.reduce((s: number, r: any) => s + Number(r.unpaid_total ?? 0), 0);
  const totalConversions = overview.reduce((s: number, r: any) => s + Number(r.total_conversions ?? 0), 0);
  const thisMonthCalls = overview.reduce((s: number, r: any) => s + Number(r.month_calls ?? 0), 0);
  const thisMonthLeads = overview.reduce((s: number, r: any) => s + Number(r.month_leads ?? 0), 0);

  return (
    <>
      <Header
        title="Sales Agents"
        searchPlaceholder=""
        restaurantName={restaurant?.name ?? "Super Admin"}
        userEmail={user.email}
        restaurantId={restaurant?.id ?? ""}
        logoUrl={restaurant?.logo_url}
      />

      <div className="p-4 md:p-6 space-y-6">

        {/* Agent signup link info */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-1">Agent Signup Link</div>
          <div className="text-xs text-blue-700 mb-2">
            Share this link with anyone you want to hire as a sales agent. They sign up themselves — their portal is created automatically.
          </div>
          <code className="text-xs bg-white border border-blue-200 rounded px-3 py-1.5 text-blue-900 font-mono select-all block">
            {process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com"}/agent-signup
          </code>
        </Card>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-white">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-slate-500">Active Agents</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{agents.filter((a: any) => a.is_active).length}</div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-slate-500">This Month Calls</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-bold">{thisMonthCalls}</div>
            <div className="text-xs text-slate-400 mt-1">{thisMonthLeads} restaurants listed</div>
          </Card>
          <Card className="p-4 bg-white">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-slate-500">Total Conversions</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold">{totalConversions}</div>
          </Card>
          <Card className="p-4 bg-white border-red-100">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-slate-500">Unpaid Earnings</span>
              <DollarSign className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-600">K{totalUnpaid.toFixed(0)}</div>
          </Card>
        </div>

        {/* Agent list */}
        <Card className="p-0 overflow-hidden bg-white">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold">All Agents</h3>
            <p className="text-xs text-slate-400 mt-0.5">Agents sign up via the link above — they appear here automatically</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b text-xs text-slate-500 uppercase">
                  <th className="text-left font-medium px-6 py-3">Agent</th>
                  <th className="text-left font-medium px-6 py-3">This Month</th>
                  <th className="text-left font-medium px-6 py-3">Conversions</th>
                  <th className="text-left font-medium px-6 py-3">Owed</th>
                  <th className="text-left font-medium px-6 py-3">Lifetime</th>
                  <th className="text-left font-medium px-6 py-3">Signed Up</th>
                  <th className="text-left font-medium px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((row: any) => (
                  <tr key={row.agent_id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-800">{row.full_name}</div>
                      <div className="text-xs text-slate-400">{row.phone ?? "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{row.month_calls} calls</div>
                      <div className="text-xs text-slate-400">{row.month_leads} restaurants</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-amber-600">{row.total_conversions}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">K{Number(row.unpaid_total).toFixed(0)}</td>
                    <td className="px-6 py-4 text-sm">K{Number(row.lifetime_earned).toFixed(0)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {agents.find((a: any) => a.id === row.agent_id)?.contract_signed_at
                        ? format(new Date(agents.find((a: any) => a.id === row.agent_id)!.contract_signed_at!), "MMM d, yyyy")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {overview.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                      No agents yet. Share the signup link above to onboard your first agent.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* All restaurant leads */}
        <Card className="p-0 overflow-hidden bg-white">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold">All Restaurant Leads</h3>
            <p className="text-xs text-slate-400 mt-0.5">Every restaurant across all agents</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b text-xs text-slate-500 uppercase">
                  <th className="text-left font-medium px-6 py-3">Restaurant</th>
                  <th className="text-left font-medium px-6 py-3">Agent</th>
                  <th className="text-left font-medium px-6 py-3">Month</th>
                  <th className="text-left font-medium px-6 py-3">Calls</th>
                  <th className="text-left font-medium px-6 py-3">Contact</th>
                  <th className="text-left font-medium px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead: any) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium">{lead.restaurant_name}</div>
                      <div className="text-xs text-slate-400">{lead.location ?? "—"}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{lead.agent_name}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{format(new Date(lead.month), "MMM yyyy")}</td>
                    <td className="px-6 py-3 text-sm font-medium">{lead.qualified_calls}</td>
                    <td className="px-6 py-3">
                      <div className="text-xs">{lead.contact_person ?? "—"}</div>
                      <div className="text-xs text-slate-400">{lead.phone ?? "—"}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[lead.status] ?? ""}`}>
                        {lead.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">No leads yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Conversions */}
        <Card className="p-0 overflow-hidden bg-white">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold">Conversions & Commission Tracking</h3>
            <p className="text-xs text-slate-400 mt-0.5">Restaurants on free trial → activation → 5 paid months</p>
          </div>
          {conversions.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No conversions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b text-xs text-slate-500 uppercase">
                    <th className="text-left font-medium px-6 py-3">Restaurant</th>
                    <th className="text-left font-medium px-6 py-3">Agent</th>
                    <th className="text-left font-medium px-6 py-3">Trial Started</th>
                    <th className="text-left font-medium px-6 py-3">Activated</th>
                    <th className="text-left font-medium px-6 py-3">Paid Months</th>
                    <th className="text-left font-medium px-6 py-3">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {conversions.map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm font-medium">
                        {c.restaurant_name ?? `ID: ${(c.restaurant_id ?? "—").slice(0, 8)}`}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">{c.agent_name}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {format(new Date(c.free_trial_started_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-3">
                        {c.activated_at ? (
                          <div className="flex items-center gap-1 text-emerald-600 text-sm">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {format(new Date(c.activated_at), "MMM d, yyyy")}
                          </div>
                        ) : (
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Free trial</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm">{c.paid_months}/5</td>
                      <td className="px-6 py-3 text-sm font-semibold text-emerald-600">
                        K{Number(c.total_commission_earned).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
