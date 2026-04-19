import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: string;
  trendDirection?: "up" | "down";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendDirection,
  icon: Icon,
  iconColor = "text-blue-500",
}: StatCardProps) {
  return (
    <Card className="p-5 bg-white">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-semibold tracking-tight">
          {typeof value === "number" ? formatNumber(value) : value}
        </div>
        {trend && (
          <div className={cn(
            "text-xs font-medium",
            trendDirection === "up" ? "text-emerald-600" : "text-red-600"
          )}>
            {trendDirection === "up" ? "↑" : "↓"} {trend}
          </div>
        )}
        {subtitle && (
          <div className="text-xs text-slate-500">{subtitle}</div>
        )}
      </div>
    </Card>
  );
}
