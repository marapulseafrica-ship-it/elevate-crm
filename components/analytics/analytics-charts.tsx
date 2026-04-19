"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { CampaignPerformance } from "@/types/database";

interface Props {
  campaigns: CampaignPerformance[];
  segmentCounts: Record<string, number>;
}

/* ── Palette ─────────────────────────────────────────────── */
const SEGMENTS = [
  { key: "new",       label: "New",       color: "#3b82f6", bg: "bg-blue-500" },
  { key: "returning", label: "Returning", color: "#10b981", bg: "bg-emerald-500" },
  { key: "loyal",     label: "Loyal",     color: "#8b5cf6", bg: "bg-violet-500" },
  { key: "inactive",  label: "Inactive",  color: "#f97316", bg: "bg-orange-500" },
];

/* ── Campaign bar tooltip ────────────────────────────────── */
function CampaignTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const sent = payload.find((p) => p.dataKey === "Sent")?.value ?? 0;
  const delivered = payload.find((p) => p.dataKey === "Delivered")?.value ?? 0;
  const rate = sent > 0 ? Math.round((Number(delivered) / Number(sent)) * 100) : 0;
  const rateColor = rate >= 90 ? "#10b981" : rate >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[170px]">
      <p className="text-xs font-semibold text-slate-700 mb-2 truncate max-w-[150px]">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-600">Sent</span>
          </div>
          <span className="text-xs font-semibold">{sent}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">Delivered</span>
          </div>
          <span className="text-xs font-semibold">{delivered}</span>
        </div>
        <div className="border-t pt-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">Delivery rate</span>
          <span className="text-xs font-bold" style={{ color: rateColor }}>{rate}%</span>
        </div>
      </div>
    </div>
  );
}

/* ── Custom bar with delivery-rate fill ──────────────────── */
function DeliveryRateBar(props: any) {
  const { x, y, width, height, sent, delivered } = props;
  const rate = sent > 0 ? delivered / sent : 0;
  const fill = rate >= 0.9 ? "#10b981" : rate >= 0.7 ? "#f59e0b" : "#ef4444";
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />;
}

/* ── Segment donut tooltip ───────────────────────────────── */
function SegmentTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.payload.color }} />
        <span className="text-xs font-semibold text-slate-700">{d.name}</span>
      </div>
      <div className="mt-1 text-sm font-bold text-slate-800">{d.value} customers</div>
      <div className="text-xs text-slate-400">{d.payload.pct}% of total</div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export function AnalyticsCharts({ campaigns, segmentCounts }: Props) {
  /* Campaign bar data */
  const campaignData = campaigns
    .slice(0, 8)
    .reverse()
    .map((c) => ({
      name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name,
      Sent: c.sent_count,
      Delivered: c.delivered_count,
      rate: c.delivery_rate,
    }));

  /* Segment donut data */
  const total = SEGMENTS.reduce((s, seg) => s + (segmentCounts[seg.key] || 0), 0);
  const pieData = SEGMENTS.map((seg) => ({
    name: seg.label,
    value: segmentCounts[seg.key] || 0,
    color: seg.color,
    pct: total > 0 ? Math.round(((segmentCounts[seg.key] || 0) / total) * 100) : 0,
  })).filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Campaign Performance ── */}
      <Card className="lg:col-span-2 p-6 bg-white">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Campaign Performance</h3>
            <p className="text-sm text-slate-400 mt-0.5">Sent vs delivered — last {Math.min(campaigns.length, 8)} campaigns</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Sent</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Delivered</span>
          </div>
        </div>

        {campaignData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            No completed campaigns yet
          </div>
        ) : (
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} barGap={3} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="gradDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#cbd5e1"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8" }}
                />
                <YAxis
                  stroke="#cbd5e1"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CampaignTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="Sent" fill="url(#gradSent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Delivered" fill="url(#gradDelivered)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ── Customer Segments Donut ── */}
      <Card className="p-6 bg-white">
        <div className="mb-1">
          <h3 className="text-base font-semibold text-slate-800">Customer Segments</h3>
          <p className="text-sm text-slate-400 mt-0.5">{total} customers total</p>
        </div>

        {pieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            No customers yet
          </div>
        ) : (
          <>
            <div className="h-52 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {SEGMENTS.map((seg) => (
                      <radialGradient key={seg.key} id={`grad-${seg.key}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={seg.color} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={seg.color} stopOpacity={1} />
                      </radialGradient>
                    ))}
                  </defs>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<SegmentTooltip />} />
                  {/* Centre label */}
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom legend with counts + % */}
            <div className="space-y-2 mt-1">
              {SEGMENTS.filter((seg) => (segmentCounts[seg.key] || 0) > 0).map((seg) => {
                const count = segmentCounts[seg.key] || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={seg.key} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                    <span className="text-xs text-slate-600 flex-1">{seg.label}</span>
                    <span className="text-xs font-semibold text-slate-800">{count}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
