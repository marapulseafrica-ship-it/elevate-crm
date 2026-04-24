"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, QrCode } from "lucide-react";

interface Props {
  restaurantName: string;
  logoUrl: string | null;
  apiKey: string;
}

export function CheckinForm({ restaurantName, logoUrl, apiKey }: Props) {
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, name, phone, email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-sm shadow-lg border-0">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">You're checked in!</h2>
          <p className="text-slate-500 text-sm">
            Thanks, <span className="font-semibold text-slate-700">{name}</span>. Your visit at{" "}
            <span className="font-semibold text-slate-700">{restaurantName}</span> has been recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-lg border-0">
      <CardContent className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="w-20 h-20 mx-auto mb-3 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
              <img src={logoUrl} alt={restaurantName} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
              <QrCode className="w-9 h-9 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800">{restaurantName}</h1>
          <p className="text-sm text-slate-500 mt-1">Check in to earn loyalty rewards</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+260 97 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
            />
            <p className="text-xs text-slate-400">Include your country code e.g. +260</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Checking in..." : "Check In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
