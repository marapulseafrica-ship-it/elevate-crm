"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";

interface Props {
  slug: string;
  restaurantName: string;
}

export function CheckinQrCard({ slug, restaurantName }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/c/${slug}`;

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${slug}-checkin-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-orange-50 p-2.5 rounded-lg">
          <QrCode className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Check-in QR Code</h3>
          <p className="text-xs text-slate-500">Print and place on tables so customers can check in</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div ref={canvasRef} className="p-3 border-2 border-dashed border-slate-200 rounded-xl bg-white">
          <QRCodeCanvas
            value={url}
            size={160}
            bgColor="#ffffff"
            fgColor="#1e293b"
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div>
            <p className="text-sm font-medium text-slate-700">{restaurantName} Check-in</p>
            <p className="text-xs text-slate-400 mt-1 break-all">{url}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download QR PNG
          </Button>
        </div>
      </div>
    </Card>
  );
}
