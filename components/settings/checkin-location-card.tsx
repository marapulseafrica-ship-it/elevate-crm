"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MapPin, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  restaurantId: string;
  initialEnabled: boolean;
  initialLat: number | null;
  initialLng: number | null;
}

export function CheckinLocationCard({ restaurantId, initialEnabled, initialLat, initialLng }: Props) {
  const [enabled, setEnabled]   = useState(initialEnabled);
  const [lat, setLat]           = useState<number | null>(initialLat);
  const [lng, setLng]           = useState<number | null>(initialLng);
  const [locating, setLocating] = useState(false);
  const [toast, setToast]       = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const supabase = createClient();

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const saveToDb = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("restaurants").update(patch).eq("id", restaurantId);
    return !error;
  };

  const handleToggle = async () => {
    const next = !enabled;
    const ok = await saveToDb({ checkin_location_enabled: next });
    if (ok) {
      setEnabled(next);
      showToast("success", next ? "Location check enabled." : "Location check disabled.");
    } else {
      showToast("error", "Failed to save. Try again.");
    }
  };

  const handleSetLocation = () => {
    if (!navigator.geolocation) {
      showToast("error", "Your browser doesn't support geolocation.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const ok = await saveToDb({ latitude: newLat, longitude: newLng });
        setLocating(false);
        if (ok) {
          setLat(newLat);
          setLng(newLng);
          showToast("success", "Restaurant location saved!");
        } else {
          showToast("error", "Failed to save location. Try again.");
        }
      },
      () => {
        setLocating(false);
        showToast("error", "Could not get your location. Please allow location access.");
      },
      { timeout: 10000 }
    );
  };

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-blue-50 p-2.5 rounded-lg">
          <MapPin className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Check-in Location Lock</h3>
          <p className="text-xs text-slate-500">Only allow check-ins from within 300m of your restaurant</p>
        </div>
        {/* Toggle */}
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-slate-200"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
          <div>
            <p className="text-sm font-medium text-slate-700">Restaurant coordinates</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Not set — click button to set"}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleSetLocation} disabled={locating} className="gap-1.5 shrink-0">
            <MapPin className="w-3.5 h-3.5" />
            {locating ? "Getting location..." : "Set from here"}
          </Button>
        </div>

        {enabled && !lat && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
            Location check is ON but no coordinates are saved. Customers won't be blocked until you set the location.
          </p>
        )}

        {!enabled && (
          <p className="text-xs text-slate-400">
            Location check is OFF — customers can check in from anywhere. Good for testing.
          </p>
        )}

        {toast && (
          <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${
            toast.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {toast.type === "success"
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </div>
        )}
      </div>
    </Card>
  );
}
