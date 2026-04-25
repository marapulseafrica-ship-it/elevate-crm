"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from "lucide-react";

interface ItemStat {
  item_name: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
}

interface InsightsData {
  recommendations: string;
  top: ItemStat[];
  slow: ItemStat[];
  restock: string[];
}

interface Props {
  restaurantId: string;
}

export function AiInsightsTab({ restaurantId }: Props) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/food-insights", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load insights");
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">AI Food Insights</h3>
          <p className="text-sm text-slate-500 mt-0.5">Powered by Claude — last 30 days of orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {data ? "Refresh" : "Generate Insights"}
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!data && !loading && (
        <Card className="p-12 bg-white text-center">
          <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Click "Generate Insights" to get AI-powered recommendations based on your sales data.</p>
        </Card>
      )}

      {loading && (
        <Card className="p-8 bg-white text-center">
          <p className="text-sm text-slate-500">Analysing your sales data…</p>
        </Card>
      )}

      {data && (
        <>
          {/* Restock alerts */}
          {data.restock.length > 0 && (
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">Restock Soon</p>
              </div>
              <p className="text-xs text-amber-700">High-demand items: {data.restock.join(", ")}</p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top sellers */}
            <Card className="p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <h4 className="font-semibold text-sm text-slate-700">Top Sellers (30 days)</h4>
              </div>
              <div className="space-y-2">
                {data.top.map((item, i) => (
                  <div key={item.item_name} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.item_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-slate-700">×{item.total_quantity}</p>
                      <p className="text-xs text-slate-400">ZMW {Number(item.total_revenue).toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Slow movers */}
            <Card className="p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <h4 className="font-semibold text-sm text-slate-700">Slow Movers (30 days)</h4>
              </div>
              <div className="space-y-2">
                {data.slow.map((item, i) => (
                  <div key={item.item_name} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.item_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-slate-700">×{item.total_quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* AI recommendations */}
          <Card className="p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h4 className="font-semibold text-sm text-slate-700">AI Recommendations</h4>
            </div>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {data.recommendations}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
