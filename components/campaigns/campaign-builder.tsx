"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Users, Heart, UserPlus, Flame, Send, Star, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import type { MessageTemplate, AudienceSegment, CampaignType } from "@/types/database";

interface Props {
  restaurantId: string;
  restaurantName: string;
  templates: MessageTemplate[];
  segmentCounts: Record<string, number>;
}

const audiences = [
  { id: "all" as AudienceSegment,        label: "All Customers",    icon: Users,    color: "bg-blue-100 text-blue-700" },
  { id: "loyal" as AudienceSegment,      label: "Loyal Customers",  icon: Heart,    color: "bg-emerald-100 text-emerald-700" },
  { id: "new" as AudienceSegment,        label: "New Customers",    icon: UserPlus, color: "bg-blue-100 text-blue-700" },
  { id: "inactive_30d" as AudienceSegment, label: "Inactive (30d+)", icon: Users,   color: "bg-orange-100 text-orange-700" },
];

const campaignTypes = [
  { id: "win_back" as CampaignType,       label: "Win Back Customers",      icon: Flame },
  { id: "promotion" as CampaignType,      label: "Send Promotion",          icon: Send },
  { id: "loyalty_reward" as CampaignType, label: "Reward Loyal Customers",  icon: Star },
];

function localDatetimeToISO(local: string): string {
  if (!local) return "";
  return new Date(local).toISOString();
}

function defaultEndsAt(sendAt: string): string {
  const base = sendAt ? new Date(sendAt) : new Date();
  base.setDate(base.getDate() + 30);
  return base.toISOString().slice(0, 16);
}

function minDatetime(): string {
  return new Date(Date.now() + 60_000).toISOString().slice(0, 16);
}

export function CampaignBuilder({ restaurantId, restaurantName, templates, segmentCounts }: Props) {
  const router = useRouter();
  const [selectedAudience, setSelectedAudience] = useState<AudienceSegment>("all");
  const [selectedType, setSelectedType]         = useState<CampaignType>("promotion");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [campaignName, setCampaignName]         = useState("");
  const [messageBody, setMessageBody]           = useState("");

  // scheduling
  const [showSchedule, setShowSchedule]         = useState(false);
  const [scheduledAt, setScheduledAt]           = useState("");
  const [endsAt, setEndsAt]                     = useState("");

  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const filteredTemplates = templates.filter((t) => t.category === selectedType);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setMessageBody(tpl.body);
      if (!campaignName) setCampaignName(tpl.name);
    }
  };

  const previewMessage = messageBody
    .replace(/\{\{customer_name\}\}/g, "John")
    .replace(/\{\{restaurant_name\}\}/g, restaurantName);

  const audienceCount = segmentCounts[selectedAudience] || 0;

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setCampaignName("");
    setMessageBody("");
    setSelectedTemplateId("");
    setScheduledAt("");
    setEndsAt("");
    setShowSchedule(false);
  };

  const handleSend = async (scheduleMode: "now" | "later") => {
    if (!campaignName.trim() || !messageBody.trim()) {
      showToast("error", "Please fill in campaign name and message.");
      return;
    }
    if (scheduleMode === "later" && !scheduledAt) {
      showToast("error", "Please choose a send date and time.");
      return;
    }

    setSaving(true);

    const sendTime = scheduleMode === "now"
      ? new Date().toISOString()
      : localDatetimeToISO(scheduledAt);

    const campaignEndsAt = endsAt
      ? localDatetimeToISO(endsAt)
      : (() => { const d = new Date(sendTime); d.setDate(d.getDate() + 30); return d.toISOString(); })();

    const supabase = createClient();
    const { data: inserted, error } = await supabase.from("campaigns").insert({
      restaurant_id:    restaurantId,
      name:             campaignName,
      campaign_type:    selectedType,
      audience_segment: selectedAudience,
      template_id:      selectedTemplateId || null,
      message_body:     messageBody,
      audience_count:   audienceCount,
      status:           "scheduled",
      scheduled_at:     sendTime,
      ends_at:          campaignEndsAt,
    }).select("id");

    if (error || !inserted?.length) {
      setSaving(false);
      showToast("error", error?.message ?? "Failed to create campaign");
      return;
    }

    // Trigger Inngest — fires immediately or at scheduledAt
    await fetch("/api/campaigns/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: inserted[0].id }),
    });

    setSaving(false);
    resetForm();
    router.refresh();

    showToast(
      "success",
      scheduleMode === "now"
        ? `Campaign queued — sending to ${audienceCount} customers now.`
        : `Campaign scheduled for ${new Date(sendTime).toLocaleString()}.`
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6 bg-white">
        <h2 className="text-xl font-semibold mb-6">Create Campaign</h2>

        {/* Step 1 — Audience */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">1</span>
            <span className="font-medium">Select Audience</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {audiences.map((aud) => {
              const Icon = aud.icon;
              const count = segmentCounts[aud.id] || 0;
              const isSelected = selectedAudience === aud.id;
              return (
                <button
                  key={aud.id}
                  onClick={() => setSelectedAudience(aud.id)}
                  className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="text-xs">{count}</Badge>
                  </div>
                  <div className={`w-8 h-8 rounded-lg ${aud.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium">{aud.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — Campaign Type */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">2</span>
            <span className="font-medium">Choose Campaign Type</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {campaignTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => { setSelectedType(type.id); setSelectedTemplateId(""); setMessageBody(""); }}
                  className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-all ${
                    isSelected ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3 — Compose */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">3</span>
            <span className="font-medium">Compose Message</span>
          </div>

          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campaign name (e.g. April Win-back)"
            className="w-full mb-3 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full mb-3 px-3 py-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Select template (optional)</option>
            {filteredTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder={`Hi {{customer_name}}, we miss you at {{restaurant_name}}!`}
            rows={4}
            className="w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-slate-500 mt-1">
            Variables: <code className="bg-slate-100 px-1 rounded">{"{{customer_name}}"}</code>{" "}
            <code className="bg-slate-100 px-1 rounded">{"{{restaurant_name}}"}</code>
          </p>

          {messageBody && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs text-slate-500 mb-1">Preview</p>
              <p className="text-sm text-slate-700">{previewMessage}</p>
            </div>
          )}
        </div>

        {/* Step 4 — Schedule (optional) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">4</span>
            <span className="font-medium">Scheduling</span>
            <span className="text-xs text-slate-400">(optional — leave blank to send immediately)</span>
          </div>

          <button
            type="button"
            onClick={() => { setShowSchedule((s) => !s); if (!showSchedule) setScheduledAt(""); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all mb-3 ${
              showSchedule ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Clock className="w-4 h-4" />
            {showSchedule ? "Cancel scheduling" : "Schedule for a specific time"}
          </button>

          {showSchedule && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
              <div className="space-y-1.5">
                <Label htmlFor="scheduled_at" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5" /> Send date &amp; time
                </Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  min={minDatetime()}
                  value={scheduledAt}
                  onChange={(e) => {
                    setScheduledAt(e.target.value);
                    if (!endsAt) setEndsAt(defaultEndsAt(e.target.value));
                  }}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ends_at" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Calendar className="w-3.5 h-3.5" /> Campaign end date
                  <span className="font-normal text-slate-400">(defaults to +30 days)</span>
                </Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  min={scheduledAt || minDatetime()}
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Audience count */}
        <Card className="p-6 bg-white">
          <h3 className="text-base font-semibold mb-3">Audience Summary</h3>
          <div className="text-center py-3">
            <div className="text-5xl font-bold text-primary">{audienceCount}</div>
            <p className="text-sm text-slate-500 mt-1">customers will receive this</p>
          </div>
          {audienceCount === 0 && (
            <p className="text-xs text-center text-orange-500 mt-1">No customers in this segment yet</p>
          )}
        </Card>

        {/* Actions */}
        <Card className="p-5 bg-white space-y-3">
          {/* Send Now */}
          <Button
            className="w-full"
            disabled={saving || audienceCount === 0 || !campaignName.trim() || !messageBody.trim()}
            onClick={() => handleSend("now")}
          >
            <Send className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Send Now"}
          </Button>
          <p className="text-xs text-center text-slate-400">n8n will pick this up within 10 seconds</p>

          <div className="border-t pt-3">
            <Button
              variant="outline"
              className="w-full"
              disabled={saving || !showSchedule || !scheduledAt || audienceCount === 0 || !campaignName.trim() || !messageBody.trim()}
              onClick={() => handleSend("later")}
            >
              <Clock className="w-4 h-4 mr-2" />
              Schedule Campaign
            </Button>
            {!showSchedule && (
              <p className="text-xs text-center text-slate-400 mt-1">Enable scheduling above first</p>
            )}
          </div>
        </Card>

        {/* Toast */}
        {toast && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            toast.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {toast.type === "success"
              ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
