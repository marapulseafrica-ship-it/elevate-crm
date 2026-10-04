import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/queries/sales-agents";
import { AgentNav } from "@/components/agent/agent-nav";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const agent = await getCurrentAgent();
  if (!agent) {
    // Not a sales agent — redirect to main app
    redirect("/dashboard");
  }

  if (!agent.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl border shadow-sm p-8 text-center">
          <h1 className="text-xl font-semibold mb-2 text-red-600">Account Deactivated</h1>
          <p className="text-sm text-slate-600">
            Your sales agent account has been deactivated. Please contact ElevateAI for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AgentNav agentName={agent.full_name} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
