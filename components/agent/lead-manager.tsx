"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Phone, MessageCircle, Users, ChevronDown, ChevronUp, X, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { AgentLead, AgentCallOutcome, AgentCallType } from "@/types/database";

interface Props {
  agentId: string;
  leads: AgentLead[];
  monthStr: string; // "YYYY-MM-01"
  canAddMore: boolean;
}

const statusColor: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  interested: "bg-yellow-100 text-yellow-700",
  free_trial: "bg-purple-100 text-purple-700",
  activated: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-600",
};

const callTypeIcon: Record<AgentCallType, typeof Phone> = {
  phone: Phone,
  whatsapp: MessageCircle,
  in_person: Users,
};

function AddLeadForm({ agentId, monthStr, onDone }: { agentId: string; monthStr: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Restaurant name is required"); return; }
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("agent_leads").insert({
      agent_id: agentId,
      month: monthStr,
      restaurant_name: name.trim(),
      location: location.trim() || null,
      phone: phone.trim() || null,
      contact_person: contact.trim() || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-slate-50 rounded-xl border mt-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Restaurant Name *</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. Pizza Palace Lusaka"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Location (City, Country)</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. Lusaka, Zambia"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Phone Number</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="+260..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Contact Person</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Owner / Manager name"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">Cancel</button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {saving ? "Adding…" : "Add Restaurant"}
        </button>
      </div>
    </form>
  );
}

function LogCallForm({ lead, agentId, onDone }: { lead: AgentLead; agentId: string; onDone: () => void }) {
  const [callType, setCallType] = useState<AgentCallType>("phone");
  const [outcome, setOutcome] = useState<AgentCallOutcome>("other");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("agent_calls").insert({
      lead_id: lead.id,
      agent_id: agentId,
      call_type: callType,
      outcome,
      notes: notes.trim() || null,
    });
    // Update lead status if outcome warrants it
    const nextStatus =
      outcome === "free_trial" ? "free_trial" :
      outcome === "interested" ? "interested" :
      lead.qualified_calls === 0 ? "contacted" :
      lead.status;
    if (nextStatus !== lead.status) {
      await supabase.from("agent_leads").update({ status: nextStatus }).eq("id", lead.id);
    }
    setSaving(false);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100 mt-2">
      <div className="text-xs font-semibold text-blue-700 mb-2">Log a qualified call for {lead.restaurant_name}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Call Type</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            value={callType}
            onChange={(e) => setCallType(e.target.value as AgentCallType)}
          >
            <option value="phone">Phone call</option>
            <option value="whatsapp">WhatsApp call/message</option>
            <option value="in_person">In-person visit</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Outcome</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as AgentCallOutcome)}
          >
            <option value="interested">Interested</option>
            <option value="free_trial">Starting free trial</option>
            <option value="callback">Requested callback</option>
            <option value="not_interested">Not interested</option>
            <option value="no_answer">No answer</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Notes (optional)</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={2}
          placeholder="What did they say? Any follow-up needed?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">Cancel</button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
          {saving ? "Saving…" : "Log Call"}
        </button>
      </div>
    </form>
  );
}

function LeadRow({ lead, agentId }: { lead: AgentLead; agentId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [localLead, setLocalLead] = useState(lead);
  const router = useRouter();

  const handleCallDone = () => {
    setShowCallForm(false);
    router.refresh();
  };

  return (
    <div className="border-b last:border-0">
      <div
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-800">{localLead.restaurant_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {localLead.location ?? "—"} · {localLead.contact_person ?? "No contact"} · {localLead.phone ?? "No phone"}
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="text-center hidden sm:block">
            <div className="text-lg font-bold text-slate-700">{localLead.qualified_calls}</div>
            <div className="text-xs text-slate-400">calls</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[localLead.status] ?? ""}`}>
            {localLead.status.replace(/_/g, " ")}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowCallForm(true); }}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Log a Call
            </button>
            {localLead.last_call_at && (
              <span className="text-xs text-slate-400">Last call: {format(new Date(localLead.last_call_at), "MMM d, yyyy")}</span>
            )}
          </div>
          {localLead.notes && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{localLead.notes}</p>
          )}
          {showCallForm && (
            <LogCallForm lead={localLead} agentId={agentId} onDone={handleCallDone} />
          )}
        </div>
      )}
    </div>
  );
}

export function LeadManager({ agentId, leads, monthStr, canAddMore }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  const handleAddDone = () => {
    setShowAddForm(false);
    router.refresh();
  };

  return (
    <Card className="p-0 overflow-hidden bg-white">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">My Restaurants This Month</h3>
          <p className="text-xs text-slate-400 mt-0.5">{leads.length}/25 restaurants · log a call on each one</p>
        </div>
        {canAddMore && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Restaurant
          </button>
        )}
        {!canAddMore && (
          <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full">25/25 Full</span>
        )}
      </div>

      {showAddForm && (
        <div className="px-5 py-3">
          <AddLeadForm agentId={agentId} monthStr={monthStr} onDone={handleAddDone} />
        </div>
      )}

      {leads.length === 0 && !showAddForm ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-slate-400 mb-4">No restaurants added yet. Add up to 25 for this month.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            Add Your First Restaurant
          </button>
        </div>
      ) : (
        <div className="divide-y">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} agentId={agentId} />
          ))}
        </div>
      )}
    </Card>
  );
}
