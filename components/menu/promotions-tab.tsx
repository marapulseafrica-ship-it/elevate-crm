"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Sparkles, Tag, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { MenuPromotion } from "@/types/database";

interface Props {
  restaurantId: string;
  initialPromotions: MenuPromotion[];
}

const segmentLabel: Record<string, string> = {
  all: "Everyone",
  new: "New customers",
  returning: "Returning",
  loyal: "Loyal (5+ visits)",
};

interface PromoForm {
  title: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  eligible_segment: string;
  expires_at: string;
}

const emptyForm = (): PromoForm => ({
  title: "", discount_type: "percent", discount_value: "", eligible_segment: "all", expires_at: ""
});

export function PromotionsTab({ restaurantId, initialPromotions }: Props) {
  const supabase = createClient();
  const [promotions, setPromotions] = useState<MenuPromotion[]>(initialPromotions);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PromoForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pending = promotions.filter((p) => !p.is_active);
  const active = promotions.filter((p) => p.is_active);

  async function toggleActive(promo: MenuPromotion) {
    const { data } = await supabase
      .from("menu_promotions")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id)
      .select()
      .single();
    if (data) setPromotions((prev) => prev.map((p) => p.id === promo.id ? data as MenuPromotion : p));
  }

  async function deletePromo(id: string) {
    await supabase.from("menu_promotions").delete().eq("id", id);
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  }

  async function updateDiscount(id: string, type: "percent" | "fixed", value: number) {
    const { data } = await supabase
      .from("menu_promotions")
      .update({ discount_type: type, discount_value: value })
      .eq("id", id)
      .select()
      .single();
    if (data) setPromotions((prev) => prev.map((p) => p.id === id ? data as MenuPromotion : p));
  }

  async function addPromo() {
    if (!form.title.trim() || !form.discount_value) { setError("Title and discount value required."); return; }
    const val = parseFloat(form.discount_value);
    if (isNaN(val) || val <= 0) { setError("Invalid discount value."); return; }
    setError(""); setSaving(true);

    const { data } = await supabase.from("menu_promotions").insert({
      restaurant_id: restaurantId,
      title: form.title.trim(),
      discount_type: form.discount_type,
      discount_value: val,
      eligible_segment: form.eligible_segment,
      expires_at: form.expires_at || null,
      is_active: false,
      applicable_items: [],
    }).select().single();

    if (data) setPromotions((prev) => [data as MenuPromotion, ...prev]);
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Promotions</h3>
          <p className="text-xs text-slate-500 mt-0.5">AI-extracted promos appear here for review. Activate them to show on the customer menu.</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setForm(emptyForm()); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Promo
        </Button>
      </div>

      {/* Pending review */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-semibold text-slate-700">Awaiting Review ({pending.length})</h4>
          </div>
          <div className="space-y-3">
            {pending.map((p) => (
              <PromoCard key={p.id} promo={p} onToggle={toggleActive} onDelete={deletePromo} onUpdateDiscount={updateDiscount} />
            ))}
          </div>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-green-500" />
            <h4 className="text-sm font-semibold text-slate-700">Active ({active.length})</h4>
          </div>
          <div className="space-y-3">
            {active.map((p) => (
              <PromoCard key={p.id} promo={p} onToggle={toggleActive} onDelete={deletePromo} onUpdateDiscount={updateDiscount} />
            ))}
          </div>
        </div>
      )}

      {promotions.length === 0 && (
        <Card className="p-12 text-center bg-white">
          <Tag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No promotions yet. Send a campaign or add one manually.</p>
        </Card>
      )}

      {/* Add promo form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Add Promotion</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Title *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. 20% off pizza" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Type</Label>
                  <select value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as "percent" | "fixed" }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (ZMW)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Value *</Label>
                  <Input type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} placeholder={form.discount_type === "percent" ? "e.g. 20" : "e.g. 10"} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Who gets this?</Label>
                <select value={form.eligible_segment} onChange={(e) => setForm((f) => ({ ...f, eligible_segment: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  {Object.entries(segmentLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">Expires (optional)</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} className="mt-1" />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button className="flex-1" onClick={addPromo} disabled={saving}>{saving ? "Saving…" : "Add Promo"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PromoCard({ promo, onToggle, onDelete, onUpdateDiscount }: {
  promo: MenuPromotion;
  onToggle: (p: MenuPromotion) => void;
  onDelete: (id: string) => void;
  onUpdateDiscount: (id: string, type: "percent" | "fixed", value: number) => void;
}) {
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [draftType, setDraftType] = useState<"percent" | "fixed">(promo.discount_type);
  const [draftValue, setDraftValue] = useState(String(promo.discount_value));

  const needsDiscount = promo.discount_value === 0;

  return (
    <Card className={`p-4 bg-white ${!promo.is_active ? "border-purple-100" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-slate-900">{promo.title}</p>
            {promo.campaign_id && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> From campaign
              </span>
            )}
          </div>

          {editingDiscount ? (
            <div className="flex items-center gap-2 mt-2">
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as "percent" | "fixed")}
                className="border rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="percent">%</option>
                <option value="fixed">ZMW</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="border rounded px-2 py-1 text-xs w-20 focus:outline-none"
              />
              <button
                onClick={() => {
                  const v = parseFloat(draftValue);
                  if (!isNaN(v) && v >= 0) {
                    onUpdateDiscount(promo.id, draftType, v);
                    setEditingDiscount(false);
                  }
                }}
                className="text-xs text-white bg-primary rounded px-2 py-1"
              >Save</button>
              <button onClick={() => setEditingDiscount(false)} className="text-xs text-slate-500">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {needsDiscount ? (
                <button
                  onClick={() => setEditingDiscount(true)}
                  className="text-xs text-orange-500 underline font-medium"
                >Set discount value</button>
              ) : (
                <button
                  onClick={() => setEditingDiscount(true)}
                  className="text-orange-600 font-bold text-sm hover:underline"
                >
                  {promo.discount_type === "percent" ? `${promo.discount_value}% off` : `ZMW ${promo.discount_value} off`}
                </button>
              )}
              <span className="text-xs text-slate-500">· {segmentLabel[promo.eligible_segment] ?? promo.eligible_segment}</span>
              {promo.expires_at && (
                <span className="text-xs text-slate-400">· expires {formatDistanceToNow(new Date(promo.expires_at), { addSuffix: true })}</span>
              )}
            </div>
          )}

          {promo.extracted_from && (
            <p className="text-xs text-slate-400 italic mt-1 line-clamp-2">"{promo.extracted_from}"</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onToggle(promo)} title={promo.is_active ? "Deactivate" : "Activate"}>
            {promo.is_active
              ? <ToggleRight className="w-7 h-7 text-green-500" />
              : <ToggleLeft className="w-7 h-7 text-slate-400" />}
          </button>
          <button onClick={() => onDelete(promo.id)} className="text-slate-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
