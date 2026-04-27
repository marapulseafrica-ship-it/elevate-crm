"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
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
  canAccessRevenue?: boolean;
  canAccessPromoRoi?: boolean;
}

function LockedTab({ feature }: { feature: string }) {
  return (
    <Card className="p-10 flex flex-col items-center justify-center text-center bg-slate-50 border-dashed">
      <div className="bg-slate-200 p-3 rounded-full mb-3">
        <Lock className="w-6 h-6 text-slate-500" />
      </div>
      <h3 className="font-semibold text-slate-800 mb-1">{feature} is locked</h3>
      <p className="text-sm text-slate-500 mb-4">Upgrade to the <span className="font-semibold">Pro</span> plan to unlock this feature.</p>
      <Link href="/billing" className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
        View plans
      </Link>
    </Card>
  );
}

export function AnalyticsTabSwitcher({ campaigns, segmentCounts, revenue, bestCampaign, analyticsChartsSlot, restaurantId, canAccessRevenue = true, canAccessPromoRoi = true }: Props) {
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
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === "revenue" ? "bg-primary text-white" : "bg-white border text-slate-700 hover:bg-slate-50"}`}
        >
          Revenue & Spending
          {!canAccessRevenue && <Lock className="w-3 h-3" />}
        </button>
        <button
          onClick={() => setTab("promotions")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === "promotions" ? "bg-primary text-white" : "bg-white border text-slate-700 hover:bg-slate-50"}`}
        >
          Promo ROI
          {!canAccessPromoRoi && <Lock className="w-3 h-3" />}
        </button>
      </div>

      {tab === "campaigns" && analyticsChartsSlot}
      {tab === "revenue" && (canAccessRevenue ? <RevenueCharts revenue={revenue} /> : <LockedTab feature="Revenue & Spending" />)}
      {tab === "promotions" && (canAccessPromoRoi ? <PromoRoiTab restaurantId={restaurantId} /> : <LockedTab feature="Promo ROI" />)}
    </div>
  );
}
