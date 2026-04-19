"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateRestaurantLogo } from "@/lib/queries/restaurant-client";

interface ProfilePictureUploadProps {
  restaurantId: string;
  restaurantName: string;
  currentLogoUrl: string | null;
  onUpload?: (newUrl: string) => void;
}

export function ProfilePictureUpload({
  restaurantId,
  restaurantName,
  currentLogoUrl,
  onUpload,
}: ProfilePictureUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (restaurantName || "R").charAt(0).toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${restaurantId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("restaurant-logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("restaurant-logos")
      .getPublicUrl(path);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await updateRestaurantLogo(restaurantId, publicUrl);

    if (dbError) {
      setError(dbError);
      setUploading(false);
      return;
    }

    setLogoUrl(publicUrl);
    setUploading(false);
    setSuccess(true);
    onUpload?.(publicUrl);
    setTimeout(() => setSuccess(false), 3000);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-3xl flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={restaurantName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {uploading ? "Uploading..." : "Change profile picture"}
        </button>
        <p className="text-xs text-slate-400 mt-0.5">JPG, PNG or GIF · Max 5MB</p>
        {success && (
          <span className="flex items-center gap-1 text-xs text-green-600 mt-1">
            <CheckCircle2 className="w-3 h-3" /> Photo updated
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1 text-xs text-red-600 mt-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}
