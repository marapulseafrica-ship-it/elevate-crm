"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, RefreshCw } from "lucide-react";

export function AiTimingCard() {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/promo-timing", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setRecommendation(json.recommendation);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 bg-gradient-to-br from-purple-50 to-white border-purple-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-800">Best Time to Send</h3>
            <p className="text-xs text-slate-500">AI analyses your order patterns</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="flex-shrink-0">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <div className="mt-3">
        {error && <p className="text-xs text-red-500">{error}</p>}
        {!recommendation && !loading && (
          <p className="text-xs text-slate-400">Click the sparkle button to get an AI recommendation for when to send your next campaign.</p>
        )}
        {loading && <p className="text-xs text-slate-400 animate-pulse">Analysing order patterns…</p>}
        {recommendation && (
          <p className="text-sm text-slate-700 leading-relaxed">{recommendation}</p>
        )}
      </div>
    </Card>
  );
}
