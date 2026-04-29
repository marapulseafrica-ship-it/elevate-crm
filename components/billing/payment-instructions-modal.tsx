"use client";

import { useState } from "react";
import { X, Copy, CheckCircle2, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanConfig } from "@/lib/plans";

interface Props {
  plan: PlanConfig;
  restaurantId: string;
  onClose: () => void;
}

const ZMW_RATE = Number(process.env.NEXT_PUBLIC_ZMW_PER_USD ?? 27);
const AIRTEL_NUMBER = process.env.NEXT_PUBLIC_AIRTEL_PAYMENT_NUMBER ?? "+260978350824";

export function PaymentInstructionsModal({ plan, restaurantId, onClose }: Props) {
  const priceUsd = parseFloat(plan.price.replace("$", ""));
  const amountZmw = (priceUsd * ZMW_RATE).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reference = `ELEV-${restaurantId.slice(0, 8).toUpperCase()}`;

  const [txId, setTxId] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [copied, setCopied] = useState<"ref" | "num" | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function copy(text: string, type: "ref" | "num") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleSubmit() {
    if (!txId.trim()) { setError("Please enter your Airtel transaction ID."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: plan.name,
          restaurantId,
          customerTxId: txId.trim(),
          renewalPhone: phone.trim() || null,
          consentGiven: consent,
          amountZmw: priceUsd * ZMW_RATE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">
            {submitted ? "Payment Submitted" : `Upgrade to ${plan.label}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="p-6 text-center space-y-4">
            <div className="bg-green-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">Payment received — pending approval</h3>
              <p className="text-sm text-slate-500 mt-1">
                We'll verify your payment and activate your <span className="font-semibold">{plan.label}</span> plan within a few hours. You'll receive an email confirmation.
              </p>
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        ) : (
          /* Instructions state */
          <div className="p-6 space-y-5">
            {/* Amount */}
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mb-1">Amount to send</p>
              <p className="text-3xl font-bold text-slate-800">ZMW {amountZmw}</p>
              <p className="text-xs text-slate-400 mt-1">{plan.price} {plan.priceNote}</p>
            </div>

            {/* Step 1 — Airtel number */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Step 1 — Send via Airtel Money to</p>
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-500" />
                  <span className="font-mono font-semibold text-slate-800">{AIRTEL_NUMBER}</span>
                </div>
                <button onClick={() => copy(AIRTEL_NUMBER, "num")} className="text-orange-500 hover:text-orange-700 transition-colors">
                  {copied === "num" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 2 — Reference */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Step 2 — Use this reference / note</p>
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <span className="font-mono font-semibold text-slate-800">{reference}</span>
                <button onClick={() => copy(reference, "ref")} className="text-blue-500 hover:text-blue-700 transition-colors">
                  {copied === "ref" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 3 — Submit TX ID */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Step 3 — Enter your Airtel transaction ID</p>
              <input
                type="text"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="e.g. MP24042912345678"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-slate-400 mt-1">Found in your Airtel Money SMS confirmation.</p>
            </div>

            {/* Optional phone for auto-renewal */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone for renewal reminders (optional)</p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +260978350824"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Consent */}
            {phone && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span className="text-xs text-slate-500">
                  I authorise Elevate CRM to send mobile money payment requests to my phone for subscription renewals. I can cancel anytime from billing settings.
                </span>
              </label>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button onClick={handleSubmit} disabled={loading || !txId.trim()} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              I've Sent the Payment
            </Button>

            <p className="text-xs text-center text-slate-400">
              Your plan will be activated within a few hours after we verify your payment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
