"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { VisitsChartPoint } from "@/types/database";
import { format, parseISO } from "date-fns";
import { Users, UserPlus, RotateCw, TrendingUp } from "lucide-react";

interface VisitsChartProps {
  data: VisitsChartPoint[];
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const total = (payload[0]?.value ?? 0) + (payload[1]?.value ?? 0);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-slate-700 mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: p.color }}
              />
              <span className="text-xs text-slate-600">{p.name}</span>
            </div>
            <span className="text-xs font-semibold text-slate-800">{p.value}</span>
          </div>
        ))}
        <div className="border-t pt-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">Total</span>
          <span className="text-xs font-bold text-slate-800">{total}</span>
        </div>
      </div>
    </div>
  );
}

export function VisitsChart({ data }: VisitsChartProps) {
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  const filtered = data.slice(-Number(range));

  const chartData = filtered.map((d) => ({
    date: format(parseISO(d.visit_day), "MMM d"),
    New: Number(d.new_visits),
    Returning: Number(d.returning_visits),
  }));

  const stats = useMemo(() => {
    const totalNew = filtered.reduce((s, d) => s + Number(d.new_visits), 0);
    const totalReturning = filtered.reduce((s, d) => s + Number(d.returning_visits), 0);
    const totalAll = filtered.reduce((s, d) => s + Number(d.total_visits), 0);
    const peak = filtered.reduce(
      (best, d) => (Number(d.total_visits) > Number(best.total_visits) ? d : best),
      filtered[0] ?? { total_visits: 0, visit_day: "" }
    );
    return { totalNew, totalReturning, totalAll, peak };
  }, [filtered]);

  const ranges: { label: string; value: "7" | "30" | "90" }[] = [
    { label: "7D", value: "7" },
    { label: "30D", value: "30" },
    { label: "90D", value: "90" },
  ];

  return (
    <Card className="p-6 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Customer Activity</h3>
          <p className="text-sm text-slate-400 mt-0.5">Daily visit events — not unique customer counts</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-0.5">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                range === r.value
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats — these are VISIT counts for the selected period, not customer counts */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserPlus className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-blue-600 font-medium">First-time visits</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.totalNew}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">Repeat visits</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.totalReturning}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">Total visits</span>
          </div>
          <div className="text-2xl font-bold text-slate-700">{stats.totalAll}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradReturning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#cbd5e1"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8" }}
              interval={Number(range) === 7 ? 0 : Number(range) === 30 ? 4 : 13}
            />
            <YAxis
              stroke="#cbd5e1"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8" }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="New"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#gradNew)"
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="Returning"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#gradReturning)"
              dot={false}
              activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-500">First-time visits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-500">Repeat visits</span>
        </div>
      </div>
    </Card>
  );
}
