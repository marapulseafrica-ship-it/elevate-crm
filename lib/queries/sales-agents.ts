import { createClient } from "@/lib/supabase/server";
import type {
  SalesAgent,
  AgentLead,
  AgentCall,
  AgentConversion,
  AgentPayout,
  AgentMonthSummary,
  AgentEarningsSummary,
  AgentAdminRow,
  ClaimedRestaurantRow,
} from "@/types/database";

export async function getCurrentAgent(): Promise<SalesAgent | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("sales_agents")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data as SalesAgent | null;
}

export async function getAgentLeads(agentId: string, month?: string): Promise<AgentLead[]> {
  const supabase = createClient();
  const targetMonth = month ?? new Date().toISOString().slice(0, 7) + "-01";
  const { data, error } = await supabase
    .from("agent_leads")
    .select("*")
    .eq("agent_id", agentId)
    .gte("month", targetMonth)
    .lt("month", nextMonth(targetMonth))
    .order("claimed_at", { ascending: true });
  if (error) return [];
  return data as AgentLead[];
}

export async function getAgentCalls(leadId: string): Promise<AgentCall[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agent_calls")
    .select("*")
    .eq("lead_id", leadId)
    .order("call_date", { ascending: false });
  return (data ?? []) as AgentCall[];
}

export async function getAgentConversions(agentId: string): Promise<AgentConversion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agent_conversions")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AgentConversion[];
}

export async function getAgentPayouts(agentId: string): Promise<AgentPayout[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agent_payouts")
    .select("*")
    .eq("agent_id", agentId)
    .order("month", { ascending: false });
  return (data ?? []) as AgentPayout[];
}

export async function getAgentMonthSummary(agentId: string, month?: string): Promise<AgentMonthSummary> {
  const supabase = createClient();
  const targetMonth = month ?? new Date().toISOString().slice(0, 7) + "-01";
  const { data } = await supabase.rpc("get_agent_month_summary", {
    p_agent_id: agentId,
    p_month: targetMonth,
  });
  return (data ?? {
    leads_submitted: 0,
    leads_remaining: 25,
    qualified_calls: 0,
    calls_remaining: 25,
    activity_fee: 0,
    bonuses_this_month: 0,
    commission_this_month: 0,
    total_earnings_this_month: 0,
  }) as AgentMonthSummary;
}

export async function getAgentEarningsSummary(agentId: string): Promise<AgentEarningsSummary> {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_agent_earnings_summary", { p_agent_id: agentId });
  return (data ?? {
    total_calls: 0,
    total_activity_fees: 0,
    total_bonuses: 0,
    total_commission: 0,
    grand_total: 0,
    paid_out: 0,
    pending_payout: 0,
    active_restaurants: 0,
  }) as AgentEarningsSummary;
}

export async function getAllClaimedRestaurants(month?: string): Promise<ClaimedRestaurantRow[]> {
  const supabase = createClient();
  const targetMonth = month ?? new Date().toISOString().slice(0, 7) + "-01";
  const { data } = await supabase.rpc("get_all_claimed_restaurants", { p_month: targetMonth });
  return (data ?? []) as ClaimedRestaurantRow[];
}

// Admin-only
export async function getAllAgentsAdminOverview(): Promise<AgentAdminRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_agents_admin_overview");
  if (error) {
    console.error("Admin overview error:", error);
    return [];
  }
  return (data ?? []) as AgentAdminRow[];
}

export async function getAllAgentLeadsAdmin(): Promise<(AgentLead & { agent_name: string })[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agent_leads")
    .select("*, sales_agents!inner(full_name)")
    .order("claimed_at", { ascending: false })
    .limit(200);
  if (!data) return [];
  return data.map((row: any) => ({
    ...row,
    agent_name: row.sales_agents?.full_name ?? "Unknown",
  }));
}

export async function getAllSalesAgents(): Promise<SalesAgent[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sales_agents")
    .select("*")
    .order("full_name");
  return (data ?? []) as SalesAgent[];
}

export async function getAllAgentConversionsAdmin(): Promise<(AgentConversion & { agent_name: string; restaurant_name?: string })[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agent_conversions")
    .select("*, sales_agents!inner(full_name), restaurants(name)")
    .order("created_at", { ascending: false });
  if (!data) return [];
  return data.map((row: any) => ({
    ...row,
    agent_name: row.sales_agents?.full_name ?? "Unknown",
    restaurant_name: row.restaurants?.name ?? null,
  }));
}

// Server actions used by the client components
export async function addAgentLead(payload: {
  agentId: string;
  month: string;
  restaurantName: string;
  location?: string;
  phone?: string;
  contactPerson?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_leads")
    .insert({
      agent_id: payload.agentId,
      month: payload.month,
      restaurant_name: payload.restaurantName,
      location: payload.location ?? null,
      phone: payload.phone ?? null,
      contact_person: payload.contactPerson ?? null,
    })
    .select()
    .single();
  return { data, error };
}

// Helper
function nextMonth(isoDate: string): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
