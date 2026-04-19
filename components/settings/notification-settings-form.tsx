"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Restaurant } from "@/types/database";

interface NotificationPreferences {
  campaign_completed: boolean;
  new_customer_milestone: boolean;
  weekly_digest: boolean;
  low_engagement_alert: boolean;
  birthday_reminders: boolean;
  notify_via_email: boolean;
  notify_via_whatsapp: boolean;
}

const defaultPrefs: NotificationPreferences = {
  campaign_completed: true,
  new_customer_milestone: true,
  weekly_digest: true,
  low_engagement_alert: false,
  birthday_reminders: true,
  notify_via_email: true,
  notify_via_whatsapp: false,
};

interface Props {
  restaurant: Restaurant;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function NotificationSettingsForm({ restaurant }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    ...defaultPrefs,
    ...(restaurant.notification_preferences as Partial<NotificationPreferences> ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof NotificationPreferences) => (val: boolean) =>
    setPrefs((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("restaurants")
      .update({ notification_preferences: prefs, updated_at: new Date().toISOString() })
      .eq("id", restaurant.id);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Notification Settings</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Choose what you get notified about and how.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Delivery channels */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Delivery channels
          </p>
          <div className="space-y-3">
            <Row
              label="Email notifications"
              description={`Sent to ${restaurant.email}`}
              checked={prefs.notify_via_email}
              onChange={set("notify_via_email")}
            />
            <Row
              label="WhatsApp notifications"
              description="Sent to your registered WhatsApp business number"
              checked={prefs.notify_via_whatsapp}
              onChange={set("notify_via_whatsapp")}
            />
          </div>
        </div>

        <hr />

        {/* Activity notifications */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Activity
          </p>
          <div className="space-y-3">
            <Row
              label="Campaign completed"
              description="Get notified when a campaign finishes sending"
              checked={prefs.campaign_completed}
              onChange={set("campaign_completed")}
            />
            <Row
              label="New customer milestones"
              description="Alerts when you hit 10, 50, 100, 500 customers, etc."
              checked={prefs.new_customer_milestone}
              onChange={set("new_customer_milestone")}
            />
            <Row
              label="Birthday reminders"
              description="Daily reminder of customers with birthdays today"
              checked={prefs.birthday_reminders}
              onChange={set("birthday_reminders")}
            />
            <Row
              label="Low engagement alerts"
              description="Alert when visit rate drops significantly vs. last month"
              checked={prefs.low_engagement_alert}
              onChange={set("low_engagement_alert")}
            />
          </div>
        </div>

        <hr />

        {/* Reports */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Reports
          </p>
          <div className="space-y-3">
            <Row
              label="Weekly digest"
              description="Summary of visits, new customers, and campaign performance every Monday"
              checked={prefs.weekly_digest}
              onChange={set("weekly_digest")}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="min-w-24">
            {saving ? "Saving..." : "Save preferences"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {error}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function Row({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
