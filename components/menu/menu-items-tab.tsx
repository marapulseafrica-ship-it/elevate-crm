"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X, ImagePlus, UtensilsCrossed, ToggleLeft, ToggleRight } from "lucide-react";
import type { MenuCategory, MenuItem } from "@/types/database";

interface Props {
  restaurantId: string;
  initialCategories: MenuCategory[];
  initialItems: MenuItem[];
}

interface ItemForm {
  name: string;
  description: string;
  price: string;
  category_id: string;
  is_available: boolean;
  image_url: string;
}

const emptyForm = (): ItemForm => ({
  name: "", description: "", price: "", category_id: "", is_available: true, image_url: ""
});

export function MenuItemsTab({ restaurantId, initialCategories, initialItems }: Props) {
  const supabase = createClient();
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm());
  const [newCatName, setNewCatName] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const grouped = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category_id === cat.id),
  }));
  const uncategorised = items.filter((i) => !i.category_id || !categories.find((c) => c.id === i.category_id));

  async function addCategory() {
    if (!newCatName.trim()) return;
    const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order));
    const { data, error } = await supabase
      .from("menu_categories")
      .insert({ restaurant_id: restaurantId, name: newCatName.trim(), sort_order: maxOrder + 1 })
      .select()
      .single();
    if (!error && data) {
      setCategories((prev) => [...prev, data as MenuCategory]);
      setNewCatName("");
    }
  }

  async function deleteCategory(id: string) {
    await supabase.from("menu_categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function openAdd() {
    setEditingItem(null);
    setForm(emptyForm());
    setError("");
    setShowItemModal(true);
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: item.price.toString(),
      category_id: item.category_id ?? "",
      is_available: item.is_available,
      image_url: item.image_url ?? "",
    });
    setError("");
    setShowItemModal(true);
  }

  async function uploadImage(file: File): Promise<string | null> {
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `${restaurantId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file, { upsert: true });
    if (error) { setUploadingImage(false); return null; }
    const { data: { publicUrl } } = supabase.storage.from("menu-images").getPublicUrl(path);
    setUploadingImage(false);
    return publicUrl;
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setForm((f) => ({ ...f, image_url: url }));
  }

  async function saveItem() {
    if (!form.name.trim() || !form.price.trim()) { setError("Name and price are required."); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError("Invalid price."); return; }
    setError(""); setSavingItem(true);

    const payload = {
      restaurant_id: restaurantId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      category_id: form.category_id || null,
      is_available: form.is_available,
      image_url: form.image_url || null,
    };

    if (editingItem) {
      const { data, error } = await supabase.from("menu_items").update(payload).eq("id", editingItem.id).select().single();
      if (!error && data) setItems((prev) => prev.map((i) => i.id === editingItem.id ? data as MenuItem : i));
    } else {
      const maxOrder = Math.max(0, ...items.map((i) => i.sort_order));
      const { data, error } = await supabase.from("menu_items").insert({ ...payload, sort_order: maxOrder + 1 }).select().single();
      if (!error && data) setItems((prev) => [...prev, data as MenuItem]);
    }
    setSavingItem(false);
    setShowItemModal(false);
  }

  async function deleteItem(id: string) {
    await supabase.from("menu_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function toggleAvailable(item: MenuItem) {
    const { data } = await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id).select().single();
    if (data) setItems((prev) => prev.map((i) => i.id === item.id ? data as MenuItem : i));
  }

  return (
    <div className="space-y-6">
      {/* Category manager */}
      <Card className="p-5 bg-white">
        <h3 className="font-semibold text-slate-900 mb-3">Categories</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-sm">
              <span>{cat.name}</span>
              <button onClick={() => deleteCategory(cat.id)} className="text-slate-400 hover:text-red-500 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm">
          <Input
            placeholder="New category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            className="text-sm"
          />
          <Button size="sm" onClick={addCategory} disabled={!newCatName.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </Card>

      {/* Items */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Menu Items ({items.length})</h3>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center bg-white">
          <UtensilsCrossed className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No menu items yet. Add your first item above.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.filter((g) => g.items.length > 0).map((group) => (
            <div key={group.id}>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{group.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.items.map((item) => <ItemCard key={item.id} item={item} onEdit={openEdit} onDelete={deleteItem} onToggle={toggleAvailable} />)}
              </div>
            </div>
          ))}
          {uncategorised.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Uncategorised</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {uncategorised.map((item) => <ItemCard key={item.id} item={item} onEdit={openEdit} onDelete={deleteItem} onToggle={toggleAvailable} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Item modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900">{editingItem ? "Edit Item" : "Add Menu Item"}</h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Image upload */}
              <div>
                <Label className="text-sm mb-1.5 block">Photo (optional)</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors overflow-hidden"
                >
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400">{uploadingImage ? "Uploading…" : "Click to upload photo"}</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              </div>

              <div>
                <Label htmlFor="item-name" className="text-sm">Name *</Label>
                <Input id="item-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Grilled Chicken" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="item-desc" className="text-sm">Description</Label>
                <textarea id="item-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description..." rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="item-price" className="text-sm">Price (ZMW) *</Label>
                  <Input id="item-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Category</Label>
                  <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">None</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setForm((f) => ({ ...f, is_available: !f.is_available }))} className="text-slate-600">
                  {form.is_available
                    ? <ToggleRight className="w-7 h-7 text-green-500" />
                    : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                </button>
                <span className="text-sm text-slate-700">{form.is_available ? "Available" : "Unavailable"}</span>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowItemModal(false)}>Cancel</Button>
                <Button className="flex-1" onClick={saveItem} disabled={savingItem || uploadingImage}>
                  {savingItem ? "Saving…" : editingItem ? "Save Changes" : "Add Item"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete, onToggle }: {
  item: MenuItem;
  onEdit: (i: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggle: (i: MenuItem) => void;
}) {
  return (
    <Card className="overflow-hidden bg-white">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-24 bg-orange-50 flex items-center justify-center">
          <UtensilsCrossed className="w-8 h-8 text-orange-200" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-900 truncate">{item.name}</p>
            {item.description && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>}
            <p className="text-orange-600 font-bold text-sm mt-1">ZMW {item.price.toFixed(2)}</p>
          </div>
          <Badge variant={item.is_available ? "active" : "outline"} className="text-xs flex-shrink-0">
            {item.is_available ? "On" : "Off"}
          </Badge>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => onToggle(item)} className="flex-1 text-xs border rounded-lg py-1.5 hover:bg-slate-50 transition-colors text-slate-600">
            {item.is_available ? "Mark Unavailable" : "Mark Available"}
          </button>
          <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg border hover:bg-slate-50 text-slate-600">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg border hover:bg-red-50 text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
