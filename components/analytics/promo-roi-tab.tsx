"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Tag, TrendingUp } from "lucide-react";
import type { MenuPromotion } from "@/types/database";

interface PromoRoiRow {
  promo: MenuPromotion;
  total_revenue: number;
  customers_used: number;
  order_count: number;
}

interface Props {
  restaurantId: string;
}

export function PromoRoiTab({ restaurantId }: Props) {
  const supabase = createClient();
  const [rows, setRows] = useState<PromoRoiRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: promos } = await supabase
      .from("menu_promotions")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!promos?.length) { setRows([]); setLoading(false); return; }

    const results: PromoRoiRow[] = await Promise.all(
      (promos as MenuPromotion[]).map(async (promo) => {
        const { data } = await supabase.rpc("get_promo_roi", {
          p_restaurant_id: restaurantId,
          p_promotion_id: promo.id,
        });
        return {
          promo,
          total_revenue: data?.total_revenue ?? 0,
          customers_used: data?.customers_used ?? 0,
          order_count: data?.order_count ?? 0,
        };
      })
    );

    setRows(results);
    setLoading(false);
  }, [restaurantId, supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card className="bg-white overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-sm text-slate-700">Promotion ROI</h3>
          <p className="text-xs text-slate-400 mt-0.5">Revenue generated from orders linked to each promotion (completed orders only)</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No promotions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b text-xs text-slate-500 uppercase">
                  <th className="text-left font-medium px-5 py-3">Promotion</th>
                  <th className="text-left font-medium px-5 py-3">Discount</th>
                  <th className="text-left font-medium px-5 py-3">Orders</th>
                  <th className="text-left font-medium px-5 py-3">Customers</th>
                  <th className="text-left font-medium px-5 py-3">Revenue</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ promo, total_revenue, customers_used, order_count }) => (
                  <tr key={promo.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800">{promo.title}</p>
                      <p className="text-xs text-slate-400 capitalize">{promo.eligible_segment} customers</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {promo.discount_type === "percent" ? `${promo.discount_value}%` : `ZMW ${promo.discount_value}`} off
                    </td>
                    <td className="px-5 py-4 text-sm">{order_count}</td>
                    <td className="px-5 py-4 text-sm">{customers_used}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-orange-600">ZMW {Number(total_revenue).toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${promo.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {promo.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
