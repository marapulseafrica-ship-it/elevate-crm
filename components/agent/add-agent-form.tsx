"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

export function AddAgentForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nrc, setNrc] = useState("");
  const [address, setAddress] = useState("");
  const [userId, setUserId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("airtel_money");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("Full name is required"); return; }
    if (!userId.trim()) { setError("User ID is required (the agent must sign up first to get a user ID)"); return; }
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: err } = await supabase.from("sales_agents").insert({
      user_id: userId.trim(),
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      nrc_number: nrc.trim() || null,
      address: address.trim() || null,
      payment_method: paymentMethod,
      payment_details: paymentDetails.trim() || null,
      contract_signed_at: new Date().toISOString(),
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSuccess(`Agent "${fullName}" added successfully!`);
    setFullName(""); setEmail(""); setPhone(""); setNrc(""); setAddress(""); setUserId(""); setPaymentDetails("");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Full Name *</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Agent full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Supabase User ID *</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-xs"
            placeholder="UUID from auth.users (agent signs up first)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Agent must sign up at /signup first. Copy their user ID from Supabase Auth.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            type="email"
            placeholder="agent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Phone</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="+260..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">NRC Number</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="NRC number"
            value={nrc}
            onChange={(e) => setNrc(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Address</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Physical address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Payment Method</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="airtel_money">Airtel Money</option>
            <option value="mtn_momo">MTN MoMo</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Payment Details</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Phone number or account number"
            value={paymentDetails}
            onChange={(e) => setPaymentDetails(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2">{success}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {saving ? "Adding…" : "Add Agent"}
        </button>
      </div>
    </form>
  );
}
