"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Star, MessageSquare } from "lucide-react";
import type { OrderFeedback } from "@/types/database";

interface Props {
  restaurantId: string;
}

export function FeedbackTab({ restaurantId }: Props) {
  const supabase = createClient();
  const [feedback, setFeedback] = useState<OrderFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("order_feedback")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100);
    setFeedback((data as OrderFeedback[]) ?? []);
    setLoading(false);
  }, [restaurantId, supabase]);

  useEffect(() => { load(); }, [load]);

  const avg = feedback.length > 0
    ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: feedback.filter((f) => f.rating === star).length,
  }));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white text-center">
          <p className="text-4xl font-bold text-slate-900">{avg.toFixed(1)}</p>
          <div className="flex justify-center gap-0.5 my-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-5 h-5 ${s <= Math.round(avg) ? "fill-orange-400 text-orange-400" : "text-slate-200"}`} />
            ))}
          </div>
          <p className="text-xs text-slate-500">{feedback.length} reviews</p>
        </Card>
        <Card className="p-5 bg-white sm:col-span-2">
          <p className="text-sm font-semibold text-slate-700 mb-3">Rating Breakdown</p>
          {distribution.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 w-4">{star}</span>
              <Star className="w-3 h-3 fill-orange-400 text-orange-400 flex-shrink-0" />
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full transition-all"
                  style={{ width: feedback.length > 0 ? `${(count / feedback.length) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Recent comments */}
      <Card className="bg-white overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-sm text-slate-700">Recent Feedback</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : feedback.filter((f) => f.comment).length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No written feedback yet.</p>
          </div>
        ) : (
          feedback
            .filter((f) => f.comment)
            .map((f) => (
              <div key={f.id} className="px-5 py-4 border-b last:border-0">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= f.rating ? "fill-orange-400 text-orange-400" : "text-slate-200"}`} />
                  ))}
                  <span className="text-xs text-slate-400 ml-2">
                    {new Date(f.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{f.comment}</p>
              </div>
            ))
        )}
      </Card>
    </div>
  );
}
