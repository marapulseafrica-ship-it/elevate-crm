import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  feature: string;
  requiredPlan: string;
}

export function LockedFeature({ feature, requiredPlan }: Props) {
  return (
    <Card className="p-10 flex flex-col items-center justify-center text-center bg-slate-50 border-dashed">
      <div className="bg-slate-200 p-3 rounded-full mb-3">
        <Lock className="w-6 h-6 text-slate-500" />
      </div>
      <h3 className="font-semibold text-slate-800 mb-1">{feature} is locked</h3>
      <p className="text-sm text-slate-500 mb-4">
        Upgrade to the <span className="font-semibold capitalize">{requiredPlan}</span> plan to unlock this feature.
      </p>
      <Link
        href="/billing"
        className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        View plans
      </Link>
    </Card>
  );
}
