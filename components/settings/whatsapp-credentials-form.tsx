"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, Key, Copy } from "lucide-react";
import { updateWhatsAppCredentials } from "@/lib/queries/restaurant-client";
import type { Restaurant } from "@/types/database";

interface WhatsAppCredentialsFormProps {
  restaurant: Restaurant;
}

export function WhatsAppCredentialsForm({ restaurant }: WhatsAppCredentialsFormProps) {
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    whatsapp_phone_number_id: restaurant.whatsapp_phone_number_id ?? "",
    whatsapp_business_account_id: restaurant.whatsapp_business_account_id ?? "",
    whatsapp_access_token: restaurant.whatsapp_access_token ?? "",
    whatsapp_app_id: restaurant.whatsapp_app_id ?? "",
    whatsapp_template_name: restaurant.whatsapp_template_name ?? "",
    whatsapp_number: restaurant.whatsapp_number ?? "",
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await updateWhatsAppCredentials(restaurant.id, form);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleCopyApiKey = async () => {
    await navigator.clipboard.writeText(restaurant.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
          <MessageSquare className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-base">WhatsApp Business API</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Enter your Meta WhatsApp Business credentials. These are used by n8n to send campaigns on your behalf.
          </p>
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
          >
            How to get these credentials
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone_number_id">Phone Number ID</Label>
            <Input
              id="phone_number_id"
              placeholder="e.g. 123456789012345"
              value={form.whatsapp_phone_number_id}
              onChange={handleChange("whatsapp_phone_number_id")}
            />
            <p className="text-xs text-slate-400">Found in Meta for Developers → WhatsApp → API Setup</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="business_account_id">Business Account ID (WABA ID)</Label>
            <Input
              id="business_account_id"
              placeholder="e.g. 987654321098765"
              value={form.whatsapp_business_account_id}
              onChange={handleChange("whatsapp_business_account_id")}
            />
            <p className="text-xs text-slate-400">Your WhatsApp Business Account ID</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="app_id">App ID</Label>
            <Input
              id="app_id"
              placeholder="e.g. 1234567890"
              value={form.whatsapp_app_id}
              onChange={handleChange("whatsapp_app_id")}
            />
            <p className="text-xs text-slate-400">Meta App ID from your Developer App</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_number">WhatsApp Business Number</Label>
            <Input
              id="whatsapp_number"
              placeholder="e.g. +1234567890"
              value={form.whatsapp_number}
              onChange={handleChange("whatsapp_number")}
            />
            <p className="text-xs text-slate-400">Your registered WhatsApp business phone number</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="access_token">Permanent Access Token</Label>
          <div className="relative">
            <Input
              id="access_token"
              type={showToken ? "text" : "password"}
              placeholder="Paste your System User permanent access token"
              value={form.whatsapp_access_token}
              onChange={handleChange("whatsapp_access_token")}
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Use a <strong>permanent</strong> System User token from Meta Business Manager, not the temporary 24h token.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="template_name">Message Template Name</Label>
          <Input
            id="template_name"
            placeholder="e.g. restaurant_promo_v1"
            value={form.whatsapp_template_name}
            onChange={handleChange("whatsapp_template_name")}
          />
          <p className="text-xs text-slate-400">
            The exact name of your approved WhatsApp message template registered in Meta Business Manager.
            Each restaurant must register their own template.
          </p>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">Your n8n API Key</span>
          </div>
          <p className="text-xs text-slate-500 mb-2">Use this key in your n8n workflow to authenticate webhook calls from this restaurant.</p>
          <div className="flex items-center gap-2 bg-slate-50 rounded-md p-2">
            <code className="text-xs font-mono flex-1 truncate text-slate-700">{restaurant.api_key}</code>
            <Button variant="outline" size="sm" onClick={handleCopyApiKey}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="min-w-24">
            {saving ? "Saving..." : "Save Credentials"}
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
