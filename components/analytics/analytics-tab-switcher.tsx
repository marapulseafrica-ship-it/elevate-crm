"use client";

import { useState } from "react";
import type { RevenueBySegment } from "@/lib/queries/analytics";
import { RevenueCharts } from "./revenue-charts";
import { PromoRoiTab } from "./promo-roi-tab";

interface Props {
  campaigns: any[];
  segmentCounts: { new: number; returning: number; loyal: number; inactive: number };
  revenue: RevenueBySegment;
  bestCampaign: any | null;
  analyticsChartsSlot: React.ReactNode;
  restaurantId: string;
}

export function AnalyticsTabSwitcher({ campaigns, segmentCounts, revenue, bestCampaign, analyticsChartsSlot, restaurantId }: Props) {
  const [tab, setTab] = useState<"campaigns" | "revenue" | "promotions">("campaigns");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab("campaigns")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "campaigns" ? "bg-primary text-white" : "bg-white border text-slate-700 hover:bg-slate-50"}`}
        >
          Campaign Analytics
        </button>
        <button
          onClick={() => setTab("revenue")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "revenue" ? "bg-primary text-white" : "bg-white border text-slate-700 hover:bg-slate-50"}`}
        >
          Revenue & Spending
        </button>
        <button
          onClick={() => setTab("promotions")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "promotions" ? "bg-primary text-white" : "bg-white border text-slate-700 hover:bg-slate-50"}`}
        >
          Promo ROI
        </button>
      </div>

      {tab === "campaigns" && analyticsChartsSlot}
      {tab === "revenue" && <RevenueCharts revenue={revenue} />}
      {tab === "promotions" && <PromoRoiTab restaurantId={restaurantId} />}
    </div>
  );
}
