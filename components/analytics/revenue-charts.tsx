"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import type { RevenueBySegment } from "@/lib/queries/analytics";

interface Props {
  revenue: RevenueBySegment;
}

const COLORS = { new: "#3b82f6", returning: "#f59e0b", loyal: "#10b981" };

export function RevenueCharts({ revenue }: Props) {
  const total = revenue.total;

  const barData = [
    { name: "New", value: revenue.new, avg: revenue.avg_new, count: revenue.count_new, color: COLORS.new },
    { name: "Returning", value: revenue.returning, avg: revenue.avg_returning, count: revenue.count_returning, color: COLORS.returning },
    { name: "Loyal", value: revenue.loyal, avg: revenue.avg_loyal, count: revenue.count_loyal, color: COLORS.loyal },
  ];

  const pct = (val: number) => total > 0 ? ((val / total) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white text-center">
          <p className="text-2xl font-bold text-slate-900">ZMW {total.toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-1">Total Revenue</p>
        </Card>
        {barData.map((seg) => (
          <Card key={seg.name} className="p-4 bg-white text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: seg.color }} />
            <p className="text-2xl font-bold text-slate-900">ZMW {seg.value.toFixed(0)}</p>
            <p className="text-xs text-slate-500">{seg.name} ({pct(seg.value)}%)</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue by segment bar */}
        <Card className="p-5 bg-white">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue by Segment</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `ZMW ${v}`} />
              <Tooltip formatter={(v: number) => [`ZMW ${v.toFixed(2)}`, "Revenue"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Avg spend per segment */}
        <Card className="p-5 bg-white">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Average Spend per Segment</h3>
          <div className="space-y-4 pt-2">
            {barData.map((seg) => (
              <div key={seg.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    {seg.name}
                  </span>
                  <span className="font-semibold text-slate-800">ZMW {Number(seg.avg).toFixed(2)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: barData.reduce((m, s) => Math.max(m, Number(s.avg)), 0) > 0
                        ? `${(Number(seg.avg) / barData.reduce((m, s) => Math.max(m, Number(s.avg)), 0)) * 100}%`
                        : "0%",
                      backgroundColor: seg.color,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{seg.count} orders</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
