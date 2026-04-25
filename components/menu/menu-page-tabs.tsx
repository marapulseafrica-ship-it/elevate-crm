"use client";

import { useState } from "react";
import { MenuItemsTab } from "./menu-items-tab";
import { OrdersTab } from "./orders-tab";
import { PromotionsTab } from "./promotions-tab";
import type { MenuCategory, MenuItem, MenuPromotion } from "@/types/database";

interface Props {
  restaurantId: string;
  initialCategories: MenuCategory[];
  initialItems: MenuItem[];
  initialPromotions: MenuPromotion[];
  pendingOrders: number;
}

export function MenuPageTabs({ restaurantId, initialCategories, initialItems, initialPromotions, pendingOrders }: Props) {
  const [tab, setTab] = useState<"items" | "orders" | "promotions">("items");
  const [pendingCount, setPendingCount] = useState(pendingOrders);

  const tabs = [
    { id: "items" as const, label: "Menu Items" },
    { id: "orders" as const, label: "Orders", badge: pendingCount > 0 ? pendingCount : undefined },
    { id: "promotions" as const, label: "Promotions" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === t.id ? "bg-primary text-white" : "bg-white border text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
            {t.badge != null && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <MenuItemsTab
          restaurantId={restaurantId}
          initialCategories={initialCategories}
          initialItems={initialItems}
        />
      )}
      {tab === "orders" && <OrdersTab restaurantId={restaurantId} onPendingCountChange={setPendingCount} />}
      {tab === "promotions" && (
        <PromotionsTab restaurantId={restaurantId} initialPromotions={initialPromotions} />
      )}
    </div>
  );
}
