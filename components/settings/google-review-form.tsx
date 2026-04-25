"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  restaurantId: string;
  initialUrl: string | null;
}

export function GoogleReviewForm({ restaurantId, initialUrl }: Props) {
  const supabase = createClient();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function save() {
    setSaving(true);
    setStatus("idle");
    const { error } = await supabase
      .from("restaurants")
      .update({ google_review_url: url.trim() || null })
      .eq("id", restaurantId);
    setSaving(false);
    setStatus(error ? "error" : "saved");
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-yellow-50 p-2.5 rounded-lg">
          <Star className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-semibold">Google Review Link</h3>
          <p className="text-sm text-slate-500">Customers with a 4+ rating will be prompted to leave a Google review.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="https://g.page/r/your-review-link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {status === "saved" && (
        <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
          <CheckCircle2 className="w-4 h-4" /> Saved successfully
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600 flex items-center gap-1 mt-2">
          <AlertCircle className="w-4 h-4" /> Failed to save. Please try again.
        </p>
      )}
    </Card>
  );
}
