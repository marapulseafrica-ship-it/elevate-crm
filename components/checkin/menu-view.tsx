"use client";

import { useState, useMemo } from "react";
import type { MenuCategory, MenuItem, MenuPromotion } from "@/types/database";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, UtensilsCrossed, Star, ExternalLink } from "lucide-react";

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  qty: number;
}

interface Props {
  restaurantName: string;
  logoUrl: string | null;
  slug: string;
  restaurantId: string;
  googleReviewUrl: string | null;
  customerName: string;
  phone: string;
  categories: MenuCategory[];
  items: MenuItem[];
  promotions: MenuPromotion[];
  customerSegment: string;
}

function applyPromo(
  price: number,
  itemId: string,
  promotions: MenuPromotion[],
  customerSegment: string
): { discountedPrice: number; promo: MenuPromotion | null } {
  const applicablePromo = promotions.find((p) => {
    if (p.eligible_segment !== "all" && p.eligible_segment !== customerSegment) return false;
    if (p.applicable_items.length > 0 && !p.applicable_items.includes(itemId)) return false;
    return true;
  });

  if (!applicablePromo) return { discountedPrice: price, promo: null };

  const discounted =
    applicablePromo.discount_type === "percent"
      ? price * (1 - applicablePromo.discount_value / 100)
      : Math.max(0, price - applicablePromo.discount_value);

  return { discountedPrice: Math.round(discounted * 100) / 100, promo: applicablePromo };
}

function getUpsells(cart: CartItem[], items: MenuItem[], categories: MenuCategory[]): MenuItem[] {
  const catByName = (keyword: string) =>
    categories.find((c) => c.name.toLowerCase().includes(keyword.toLowerCase()))?.id;

  const cartNames = cart.map((c) => c.name.toLowerCase());
  const inCart = (kw: string) => cartNames.some((n) => n.includes(kw.toLowerCase()));
  const inCartByCategory = (catId: string | undefined) =>
    catId ? cart.some((c) => items.find((i) => i.id === c.itemId)?.category_id === catId) : false;

  const drinksCatId  = catByName("drink") ?? catByName("beverage");
  const chipsCatId   = catByName("side")  ?? catByName("chip") ?? catByName("fries");
  const dessertCatId = catByName("dessert") ?? catByName("sweet");

  const cheapest = (catId: string | undefined) =>
    catId ? items
      .filter((i) => i.is_available && i.category_id === catId && !cart.some((c) => c.itemId === i.id))
      .sort((a, b) => a.price - b.price)[0] ?? null
    : null;

  const suggestions: MenuItem[] = [];

  const hasBurgerOrWrap = inCart("burger") || inCart("pita") || inCart("wrap");
  const hasChicken = inCart("chicken") || inCart("wing") || inCart("breast");
  const hasDrink   = inCartByCategory(drinksCatId);

  if (hasBurgerOrWrap) {
    const chips = cheapest(chipsCatId);
    const drink = cheapest(drinksCatId);
    if (chips) suggestions.push(chips);
    if (drink) suggestions.push(drink);
  } else if (hasChicken) {
    const drink   = cheapest(drinksCatId);
    const dessert = cheapest(dessertCatId);
    if (drink)   suggestions.push(drink);
    if (dessert) suggestions.push(dessert);
  }

  if (!hasDrink && suggestions.length < 2) {
    const drink = cheapest(drinksCatId);
    if (drink && !suggestions.some((s) => s.id === drink.id)) suggestions.push(drink);
  }

  return suggestions.slice(0, 2);
}

export function MenuView({ restaurantName, logoUrl, slug, restaurantId, googleReviewUrl, customerName, phone, categories, items, promotions, customerSegment }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? "all");
  const [step, setStep] = useState<"browse" | "cart" | "confirm" | "done">("browse");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Feedback state
  const [rating, setRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items.filter((i) => i.is_available);
    return items.filter((i) => i.category_id === activeCategory && i.is_available);
  }, [items, activeCategory]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, ci) => {
      const item = items.find((i) => i.id === ci.itemId);
      if (!item) return sum + ci.price * ci.qty;
      const { discountedPrice } = applyPromo(item.price, item.id, promotions, customerSegment);
      return sum + discountedPrice * ci.qty;
    }, 0);
  }, [cart, items, promotions, customerSegment]);

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  function addToCart(item: MenuItem) {
    const { discountedPrice } = applyPromo(item.price, item.id, promotions, customerSegment);
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.id);
      if (existing) return prev.map((c) => c.itemId === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { itemId: item.id, name: item.name, price: discountedPrice, qty: 1 }];
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) => {
      return prev
        .map((c) => c.itemId === itemId ? { ...c, qty: c.qty + delta } : c)
        .filter((c) => c.qty > 0);
    });
  }

  async function placeOrder() {
    if (!tableNumber.trim()) { setError("Please enter your table number."); return; }
    setError(null);
    setSubmitting(true);

    // Find the first promotion applied to any cart item
    let appliedPromotionId: string | undefined;
    for (const ci of cart) {
      const item = items.find((i) => i.id === ci.itemId);
      if (item) {
        const { promo } = applyPromo(item.price, item.id, promotions, customerSegment);
        if (promo) { appliedPromotionId = promo.id; break; }
      }
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          customer_name: customerName,
          phone,
          table_number: tableNumber.trim(),
          items: cart.map((c) => ({ menu_item_id: c.itemId, qty: c.qty })),
          notes: notes.trim() || undefined,
          promotion_id: appliedPromotionId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Order failed");
      setOrderId(data.order_id);
      setStep("done");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFeedback(r: number) {
    setRating(r);
    if (feedbackSubmitted || !orderId) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        restaurant_id: restaurantId,
        rating: r,
        comment: r <= 3 ? feedbackComment : undefined,
      }),
    });
    if (r >= 4) setFeedbackSubmitted(true);
  }

  async function submitPrivateFeedback() {
    if (feedbackSubmitted || !orderId) return;
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        restaurant_id: restaurantId,
        rating,
        comment: feedbackComment,
      }),
    });
    setFeedbackSubmitted(true);
  }

  // ── Done screen ────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Order Placed!</h2>
          <p className="text-slate-600 text-sm mb-1">Thank you, <strong>{customerName}</strong>.</p>
          <p className="text-slate-600 text-sm mb-4">Your order has been sent to the kitchen. We'll bring it to <strong>Table {tableNumber}</strong>.</p>
          <div className="bg-slate-50 rounded-xl p-4 text-left mb-6 space-y-1">
            {cart.map((c) => (
              <div key={c.itemId} className="flex justify-between text-sm">
                <span className="text-slate-700">{c.name} ×{c.qty}</span>
                <span className="text-slate-900 font-medium">ZMW {(c.price * c.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-2 border-t mt-2">
              <span>Total</span>
              <span className="text-orange-600">ZMW {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Feedback section */}
          {!feedbackSubmitted ? (
            <div className="border-t pt-5 mt-2">
              <p className="text-sm font-semibold text-slate-700 mb-3">How was your experience?</p>
              <div className="flex justify-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => submitFeedback(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= rating ? "fill-orange-400 text-orange-400" : "text-slate-300"}`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && rating >= 4 && googleReviewUrl && (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Leave a Google Review
                </a>
              )}
              {rating > 0 && rating <= 3 && (
                <div className="mt-2 text-left">
                  <textarea
                    placeholder="Tell us what we can improve…"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                  <button
                    onClick={submitPrivateFeedback}
                    className="mt-2 w-full bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-sm"
                  >
                    Send Feedback
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="border-t pt-4 mt-2">
              <p className="text-sm text-green-600 font-medium">Thanks for your feedback!</p>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-4">{restaurantName}</p>
        </div>
      </div>
    );
  }

  // ── Cart / checkout screen ─────────────────────────────────
  if (step === "cart") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex flex-col">
        <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
          <button onClick={() => setStep("browse")} className="text-slate-500 hover:text-slate-800">
            ← Back
          </button>
          <h1 className="font-bold text-slate-900 flex-1">Your Order</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((c) => {
            const item = items.find((i) => i.id === c.itemId);
            const { discountedPrice } = item
              ? applyPromo(item.price, item.id, promotions, customerSegment)
              : { discountedPrice: c.price };
            return (
              <div key={c.itemId} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">{c.name}</p>
                  <p className="text-orange-600 font-semibold text-sm">ZMW {(discountedPrice * c.qty).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(c.itemId, -1)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                    {c.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                  </button>
                  <span className="w-6 text-center font-semibold text-sm">{c.qty}</span>
                  <button onClick={() => updateQty(c.itemId, 1)} className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center hover:bg-orange-200">
                    <Plus className="w-3.5 h-3.5 text-orange-600" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Upsell suggestions */}
          {(() => {
            const upsells = getUpsells(cart, items, categories);
            if (upsells.length === 0) return null;
            return (
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-orange-700 mb-2">You might also like</p>
                <div className="flex gap-2">
                  {upsells.map((u) => {
                    const { discountedPrice } = applyPromo(u.price, u.id, promotions, customerSegment);
                    return (
                      <button
                        key={u.id}
                        onClick={() => addToCart(u)}
                        className="flex-1 bg-white border border-orange-200 rounded-xl p-2 text-left hover:bg-orange-50 transition-colors"
                      >
                        <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{u.name}</p>
                        <p className="text-xs text-orange-600 font-bold mt-1">+ ZMW {discountedPrice.toFixed(2)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Table Number *</label>
              <input
                type="text"
                placeholder="e.g. 5"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Special notes (optional)</label>
              <textarea
                placeholder="Any allergies or requests?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </div>

        <div className="bg-white border-t p-4">
          <div className="flex justify-between text-sm font-semibold mb-3">
            <span>Total</span>
            <span className="text-orange-600 text-lg">ZMW {cartTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={submitting || cart.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {submitting ? "Placing order…" : "Place Order"}
          </button>
        </div>
      </div>
    );
  }

  // ── Browse screen ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        {logoUrl ? (
          <img src={logoUrl} alt={restaurantName} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-orange-600" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="font-bold text-slate-900 text-base leading-tight">{restaurantName}</h1>
          <p className="text-xs text-slate-500">Menu</p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={() => setStep("cart")}
            className="relative bg-orange-500 text-white rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-2 hover:bg-orange-600 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{cartCount}</span>
            <span className="hidden sm:inline">· ZMW {cartTotal.toFixed(2)}</span>
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveCategory("all")}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === "all" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No items available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const { discountedPrice, promo } = applyPromo(item.price, item.id, promotions, customerSegment);
              const cartItem = cart.find((c) => c.itemId === item.id);
              const hasDiscount = discountedPrice < item.price;

              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  {item.image_url ? (
                    <div className="relative">
                      <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover" />
                      {hasDiscount && promo && (
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {promo.discount_type === "percent" ? `-${promo.discount_value}%` : `-ZMW ${promo.discount_value}`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-28 bg-orange-50 flex items-center justify-center relative">
                      <UtensilsCrossed className="w-10 h-10 text-orange-200" />
                      {hasDiscount && promo && (
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {promo.discount_type === "percent" ? `-${promo.discount_value}%` : `-ZMW ${promo.discount_value}`}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-3">
                      <div>
                        {hasDiscount ? (
                          <div>
                            <span className="text-orange-600 font-bold text-sm">ZMW {discountedPrice.toFixed(2)}</span>
                            <span className="text-slate-400 text-xs line-through ml-1.5">ZMW {item.price.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-orange-600 font-bold text-sm">ZMW {item.price.toFixed(2)}</span>
                        )}
                      </div>

                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                            {cartItem.qty === 1 ? <Trash2 className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3" />}
                          </button>
                          <span className="text-sm font-bold w-5 text-center">{cartItem.qty}</span>
                          <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center hover:bg-orange-200">
                            <Plus className="w-3 h-3 text-orange-600" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(item)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t p-4">
          <button
            onClick={() => setStep("cart")}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-between px-4"
          >
            <span className="bg-orange-400 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">{cartCount}</span>
            <span>View Order</span>
            <span>ZMW {cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
