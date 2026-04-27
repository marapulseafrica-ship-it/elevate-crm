"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import type { PlanConfig, PlanTier } from "@/lib/plans";

const colorMap: Record<string, string> = {
  blue:   "border-blue-200 bg-blue-50",
  emerald:"border-emerald-200 bg-emerald-50",
  orange: "border-orange-200 bg-orange-50",
  purple: "border-purple-200 bg-purple-50",
};

const btnMap: Record<string, string> = {
  blue:   "bg-blue-600 hover:bg-blue-700 text-white",
  emerald:"bg-emerald-600 hover:bg-emerald-700 text-white",
  orange: "bg-orange-500 hover:bg-orange-600 text-white",
  purple: "bg-purple-600 hover:bg-purple-700 text-white",
};

const badgeMap: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-700",
  emerald:"bg-emerald-100 text-emerald-700",
  orange: "bg-orange-100 text-orange-700",
  purple: "bg-purple-100 text-purple-700",
};

interface Props {
  plan: PlanConfig;
  isCurrent: boolean;
  isExpired: boolean;
  restaurantId: string;
  customerEmail: string;
  customerName: string;
}

export function PlanCard({ plan, isCurrent, isExpired, restaurantId, customerEmail, customerName }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.name, restaurantId, customerEmail, customerName }),
      });
      const data = await res.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error ?? "Failed to initiate payment");
        setLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Card className={`p-6 flex flex-col border-2 ${isCurrent && !isExpired ? colorMap[plan.color] : "bg-white border-slate-200"}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeMap[plan.color]}`}>
            {plan.label}
          </span>
          <div className="mt-2">
            <span className="text-3xl font-bold">{plan.price}</span>
            <span className="text-sm text-slate-500 ml-1">{plan.priceNote}</span>
          </div>
        </div>
        {isCurrent && !isExpired && (
          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">
            Current plan
          </span>
        )}
        {isCurrent && isExpired && (
          <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-full">
            Expired
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
        {plan.notIncluded.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
            <X className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent && !isExpired ? (
        <div className="text-center text-sm text-slate-500 font-medium py-2">Active plan</div>
      ) : (
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${btnMap[plan.color]}`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isCurrent && isExpired ? "Renew Plan" : "Upgrade"}
        </button>
      )}
    </Card>
  );
}
