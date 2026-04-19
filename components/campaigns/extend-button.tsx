"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CalendarPlus, Loader2 } from "lucide-react";

interface Props {
  campaignId: string;
  endsAt: string | null;
}

export function ExtendButton({ campaignId, endsAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExtend = async () => {
    setLoading(true);
    const supabase = createClient();

    // Add 30 days to current ends_at, or 30 days from now if null
    const base = endsAt ? new Date(endsAt) : new Date();
    base.setDate(base.getDate() + 30);

    await supabase
      .from("campaigns")
      .update({ ends_at: base.toISOString(), extended_at: new Date().toISOString() })
      .eq("id", campaignId);

    setLoading(false);
    router.refresh();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExtend}
      disabled={loading}
      className="text-xs h-7 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarPlus className="w-3 h-3 mr-1" />}
      Extend 30d
    </Button>
  );
}
