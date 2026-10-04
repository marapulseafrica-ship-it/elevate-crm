"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import type { RevenueBySegment, RevenueSourceBreakdown } from "@/lib/queries/analytics";

interface Props {
  revenue: RevenueBySegment;
  revenueSource?: RevenueSourceBreakdown;
}

const COLORS = { new: "#3b82f6", returning: "#f59e0b", loyal: "#10b981" };

export function RevenueCharts({ revenue, revenueSource }: Props) {
  const total = revenue.total;

  const barData = [
    { name: "New", value: revenue.new, avg: revenue.avg_new, count: revenue.count_new, color: COLORS.new },
    { name: "Returning", value: revenue.returning, avg: revenue.avg_returning, count: revenue.count_returning, color: COLORS.returning },
    { name: "Loyal", value: revenue.loyal, avg: revenue.avg_loyal, count: revenue.count_loyal, color: COLORS.loyal },
  ];

  const pct = (val: number) => total > 0 ? ((val / total) * 100).toFixed(0) : "0";

  const rs = revenueSource;
  const grandRev = rs ? Number(rs.total_revenue) : 0;
  const campRev  = rs ? Number(rs.campaign_revenue) : 0;
  const orgRev   = rs ? Number(rs.organic_revenue) : 0;
  const pct = (n: number) => grandRev > 0 ? `${Math.round((n / grandRev) * 100)}%` : "0%";

  return (
    <div className="space-y-5">
      {/* Campaign vs Organic revenue split */}
      {rs && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Revenue Source — All Time</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-white text-center">
              <p className="text-2xl font-bold text-slate-800">ZMW {grandRev.toFixed(0)}</p>
              <p className="text-xs text-slate-500 mt-1">Total Revenue</p>
            </Card>
            <Card className="p-5 bg-white text-center border-emerald-200">
              <p className="text-2xl font-bold text-emerald-600">ZMW {campRev.toFixed(0)}</p>
              <p className="text-xs text-emerald-600 mt-1">Campaign-driven · {pct(campRev)}</p>
              <p className="text-xs text-slate-400 mt-0.5">This month: ZMW {Number(rs.month_campaign_revenue).toFixed(0)}</p>
            </Card>
            <Card className="p-5 bg-white text-center border-blue-200">
              <p className="text-2xl font-bold text-blue-600">ZMW {orgRev.toFixed(0)}</p>
              <p className="text-xs text-blue-600 mt-1">Organic · {pct(orgRev)}</p>
              <p className="text-xs text-slate-400 mt-0.5">This month: ZMW {Number(rs.month_organic_revenue).toFixed(0)}</p>
            </Card>
          </div>
          {/* Progress bar showing split */}
          {grandRev > 0 && (
            <div className="mt-3 flex rounded-full overflow-hidden h-3">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: pct(campRev) }}
                title={`Campaign: ZMW ${campRev.toFixed(0)}`}
              />
              <div
                className="bg-blue-400 transition-all"
                style={{ width: pct(orgRev) }}
                title={`Organic: ZMW ${orgRev.toFixed(0)}`}
              />
            </div>
          )}
          <div className="flex gap-4 mt-1.5">
            <span className="text-xs flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Campaign</span>
            <span className="text-xs flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Organic</span>
          </div>
        </div>
      )}

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
