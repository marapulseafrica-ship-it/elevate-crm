import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface Props {
  isExpired: boolean;
  tier: string;
}

export function UpgradeBanner({ isExpired, tier }: Props) {
  if (!isExpired) return null;
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-red-700">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>
          Your <span className="font-semibold capitalize">{tier}</span> plan has expired.
          Campaigns and new customers are paused until you renew.
        </span>
      </div>
      <Link
        href="/billing"
        className="flex-shrink-0 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
      >
        Renew now
      </Link>
    </div>
  );
}
