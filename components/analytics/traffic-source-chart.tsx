"use client";

import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { VisitSourceDay, CampaignCustomerToday } from "@/lib/queries/analytics";
import { format, parseISO } from "date-fns";

interface Props {
  trend: VisitSourceDay[];
  todayCustomers: CampaignCustomerToday[];
  todayTotal: number;
  todayCampaign: number;
  todayOrganic: number;
  todayCampaignRevenue: number;
  todayOrganicRevenue: number;
}

export function TrafficSourceChart({
  trend,
  todayCustomers,
  todayTotal,
  todayCampaign,
  todayOrganic,
  todayCampaignRevenue,
  todayOrganicRevenue,
}: Props) {
  const visitData = trend.map((d) => ({
    date: format(parseISO(d.day), "MMM d"),
    "Campaign": Number(d.campaign_driven),
    "Organic": Number(d.organic),
  }));

  const revenueData = trend.map((d) => ({
    date: format(parseISO(d.day), "MMM d"),
    "Campaign Revenue": Number(d.campaign_revenue),
    "Organic Revenue": Number(d.organic_revenue),
  }));

  const totalCampaign = trend.reduce((s, d) => s + Number(d.campaign_driven), 0);
  const totalOrganic  = trend.reduce((s, d) => s + Number(d.organic), 0);
  const grandTotal    = totalCampaign + totalOrganic;
  const totalCampaignRev = trend.reduce((s, d) => s + Number(d.campaign_revenue), 0);
  const totalOrganicRev  = trend.reduce((s, d) => s + Number(d.organic_revenue), 0);
  const grandRevTotal    = totalCampaignRev + totalOrganicRev;

  const pct = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";

  return (
    <div className="space-y-6">
      {/* Visits summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Visits — Last 30 Days</h3>
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-5 bg-white text-center">
            <div className="text-3xl font-bold text-slate-800">{grandTotal}</div>
            <div className="text-xs text-slate-500 mt-1">Total Visits</div>
          </Card>
          <Card className="p-5 bg-white text-center">
            <div className="text-3xl font-bold text-emerald-600">{totalCampaign}</div>
            <div className="text-xs text-emerald-600 mt-1">Campaign · {pct(totalCampaign, grandTotal)}</div>
          </Card>
          <Card className="p-5 bg-white text-center">
            <div className="text-3xl font-bold text-blue-600">{totalOrganic}</div>
            <div className="text-xs text-blue-600 mt-1">Organic · {pct(totalOrganic, grandTotal)}</div>
          </Card>
        </div>
      </div>

      {/* Revenue summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Revenue — Last 30 Days</h3>
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-5 bg-white text-center">
            <div className="text-2xl font-bold text-slate-800">ZMW {grandRevTotal.toFixed(0)}</div>
            <div className="text-xs text-slate-500 mt-1">Total Revenue</div>
          </Card>
          <Card className="p-5 bg-white text-center">
            <div className="text-2xl font-bold text-emerald-600">ZMW {totalCampaignRev.toFixed(0)}</div>
            <div className="text-xs text-emerald-600 mt-1">Campaign · {pct(totalCampaignRev, grandRevTotal)}</div>
          </Card>
          <Card className="p-5 bg-white text-center">
            <div className="text-2xl font-bold text-blue-600">ZMW {totalOrganicRev.toFixed(0)}</div>
            <div className="text-xs text-blue-600 mt-1">Organic · {pct(totalOrganicRev, grandRevTotal)}</div>
          </Card>
        </div>
      </div>

      {/* Visits chart */}
      <Card className="p-6 bg-white">
        <h3 className="text-base font-semibold mb-4">Campaign vs Organic Visits</h3>
        {visitData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400">No visit data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={visitData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} cursor={{ fill: "#f8fafc" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="Campaign" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Organic"  stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Revenue chart */}
      <Card className="p-6 bg-white">
        <h3 className="text-base font-semibold mb-4">Campaign vs Organic Revenue (ZMW)</h3>
        {revenueData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400">No revenue data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                formatter={(v: number) => [`ZMW ${Number(v).toFixed(2)}`, undefined]}
                cursor={{ fill: "#f8fafc" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="Campaign Revenue" stackId="b" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Organic Revenue"  stackId="b" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Today's breakdown */}
      <Card className="p-0 overflow-hidden bg-white">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">Today&apos;s Breakdown</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {todayTotal} visit{todayTotal !== 1 ? "s" : ""} today — {todayCampaign} campaign, {todayOrganic} organic
            {(todayCampaignRevenue + todayOrganicRevenue) > 0 && (
              <> · ZMW {(todayCampaignRevenue + todayOrganicRevenue).toFixed(2)} total revenue</>
            )}
          </p>
        </div>

        {/* Today revenue split */}
        {(todayCampaignRevenue + todayOrganicRevenue) > 0 && (
          <div className="grid grid-cols-2 divide-x border-b">
            <div className="px-6 py-4 text-center">
              <div className="text-xl font-bold text-emerald-600">ZMW {todayCampaignRevenue.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-0.5">Campaign Revenue Today</div>
            </div>
            <div className="px-6 py-4 text-center">
              <div className="text-xl font-bold text-blue-600">ZMW {todayOrganicRevenue.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-0.5">Organic Revenue Today</div>
            </div>
          </div>
        )}

        {/* Campaign visitors list */}
        {todayCustomers.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">No campaign-driven visitors today yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b text-xs text-slate-500 uppercase">
                  <th className="text-left font-medium px-6 py-3">Name</th>
                  <th className="text-left font-medium px-6 py-3">Phone</th>
                  <th className="text-left font-medium px-6 py-3">Campaign</th>
                  <th className="text-left font-medium px-6 py-3">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {todayCustomers.map((c, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-800">{c.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{c.phone}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{c.campaign_name}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {format(new Date(c.attributed_at), "HH:mm")}
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
