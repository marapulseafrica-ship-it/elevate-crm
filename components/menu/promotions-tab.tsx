"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Sparkles, Tag, ToggleLeft, ToggleRight, Trash2, Check, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { MenuPromotion, MenuItem } from "@/types/database";

interface Props {
  restaurantId: string;
  initialPromotions: MenuPromotion[];
  initialMenuItems?: MenuItem[];
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
  applicable_items: string[];
}

const emptyForm = (): PromoForm => ({
  title: "", discount_type: "percent", discount_value: "", eligible_segment: "all", expires_at: "", applicable_items: []
});

export function PromotionsTab({ restaurantId, initialPromotions, initialMenuItems = [] }: Props) {
  const supabase = createClient();
  const [promotions, setPromotions] = useState<MenuPromotion[]>(initialPromotions);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PromoForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [itemSearch, setItemSearch] = useState("");

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

  async function openForm() {
    setForm(emptyForm());
    setItemSearch("");
    setShowForm(true);
    if (menuItems.length === 0) {
      const { data } = await supabase
        .from("menu_items")
        .select("id, name, price, category_id, is_available")
        .eq("restaurant_id", restaurantId)
        .order("name");
      if (data) setMenuItems(data as MenuItem[]);
    }
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
      applicable_items: form.applicable_items,
    }).select().single();

    if (data) setPromotions((prev) => [data as MenuPromotion, ...prev]);
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm());
  }

  async function updateApplicableItems(id: string, items: string[]) {
    const { data } = await supabase
      .from("menu_promotions")
      .update({ applicable_items: items })
      .eq("id", id)
      .select()
      .single();
    if (data) setPromotions((prev) => prev.map((p) => p.id === id ? data as MenuPromotion : p));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Promotions</h3>
          <p className="text-xs text-slate-500 mt-0.5">Every campaign you send appears here. Set the discount value, then activate to show it on the customer menu for the right segment.</p>
        </div>
        <Button size="sm" onClick={openForm}>
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
              <PromoCard key={p.id} promo={p} onToggle={toggleActive} onDelete={deletePromo} onUpdateDiscount={updateDiscount} menuItems={menuItems} onUpdateItems={updateApplicableItems} />
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
              <PromoCard key={p.id} promo={p} onToggle={toggleActive} onDelete={deletePromo} onUpdateDiscount={updateDiscount} menuItems={menuItems} onUpdateItems={updateApplicableItems} />
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
                <Label className="text-sm">Apply to specific items (optional)</Label>
                <p className="text-xs text-slate-400 mt-0.5 mb-2">Leave empty to apply to all menu items</p>
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b bg-slate-50">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search items…"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="flex-1 text-xs bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
                    />
                    {form.applicable_items.length > 0 && (
                      <span className="text-xs font-semibold text-orange-600">{form.applicable_items.length} selected</span>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {menuItems.filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase())).map((item) => {
                      const checked = form.applicable_items.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setForm((f) => ({
                            ...f,
                            applicable_items: checked
                              ? f.applicable_items.filter((id) => id !== item.id)
                              : [...f.applicable_items, item.id],
                          }))}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors border-b last:border-0 ${checked ? "bg-orange-50" : ""}`}
                        >
                          <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${checked ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}>
                            {checked && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="text-sm text-slate-700 flex-1">{item.name}</span>
                          <span className="text-xs text-slate-400">ZMW {item.price.toFixed(2)}</span>
                        </button>
                      );
                    })}
                    {menuItems.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No menu items yet</p>
                    )}
                  </div>
                </div>
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

function PromoCard({ promo, onToggle, onDelete, onUpdateDiscount, menuItems, onUpdateItems }: {
  promo: MenuPromotion;
  onToggle: (p: MenuPromotion) => void;
  onDelete: (id: string) => void;
  onUpdateDiscount: (id: string, type: "percent" | "fixed", value: number) => void;
  menuItems: MenuItem[];
  onUpdateItems: (id: string, items: string[]) => void;
}) {
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [draftType, setDraftType] = useState<"percent" | "fixed">(promo.discount_type);
  const [draftValue, setDraftValue] = useState(String(promo.discount_value));
  const [editingItems, setEditingItems] = useState(false);
  const [draftItems, setDraftItems] = useState<string[]>(promo.applicable_items);
  const [itemSearch, setItemSearch] = useState("");

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

          {/* Applicable items */}
          {!editingItems ? (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {promo.applicable_items.length === 0 ? (
                <button onClick={() => { setDraftItems([]); setItemSearch(""); setEditingItems(true); }} className="text-xs text-slate-400 hover:text-orange-500 underline">
                  All items · click to restrict
                </button>
              ) : (
                <>
                  <span className="text-xs text-slate-500">{promo.applicable_items.length} item{promo.applicable_items.length !== 1 ? "s" : ""}:</span>
                  {promo.applicable_items.slice(0, 3).map((id) => {
                    const item = menuItems.find((i) => i.id === id);
                    return item ? <span key={id} className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{item.name}</span> : null;
                  })}
                  {promo.applicable_items.length > 3 && <span className="text-xs text-slate-400">+{promo.applicable_items.length - 3} more</span>}
                  <button onClick={() => { setDraftItems([...promo.applicable_items]); setItemSearch(""); setEditingItems(true); }} className="text-xs text-slate-400 hover:text-orange-500 underline ml-1">edit</button>
                </>
              )}
            </div>
          ) : (
            <div className="mt-2 border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-slate-50">
                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="flex-1 text-xs bg-transparent focus:outline-none text-slate-700"
                  autoFocus
                />
                <span className="text-xs font-semibold text-orange-600">{draftItems.length} sel.</span>
              </div>
              <div className="max-h-36 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setDraftItems([])}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left border-b text-xs hover:bg-slate-50 ${draftItems.length === 0 ? "bg-orange-50" : ""}`}
                >
                  <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${draftItems.length === 0 ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}>
                    {draftItems.length === 0 && <Check className="w-2 h-2 text-white" />}
                  </div>
                  <span className="text-slate-600">All items</span>
                </button>
                {menuItems.filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase())).map((item) => {
                  const checked = draftItems.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDraftItems((prev) => checked ? prev.filter((id) => id !== item.id) : [...prev, item.id])}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-left border-b last:border-0 text-xs hover:bg-slate-50 ${checked ? "bg-orange-50" : ""}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${checked ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}>
                        {checked && <Check className="w-2 h-2 text-white" />}
                      </div>
                      <span className="flex-1 text-slate-700">{item.name}</span>
                      <span className="text-slate-400">ZMW {item.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 px-2 py-1.5 bg-slate-50 border-t">
                <button onClick={() => { onUpdateItems(promo.id, draftItems); setEditingItems(false); }} className="text-xs text-white bg-primary rounded px-2 py-1">Save</button>
                <button onClick={() => setEditingItems(false)} className="text-xs text-slate-500">Cancel</button>
              </div>
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
