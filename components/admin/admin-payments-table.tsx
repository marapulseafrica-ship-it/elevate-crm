"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";

interface Payment {
  id: string;
  plan: string;
  amount_usd: number;
  amount_zmw: number | null;
  flw_tx_ref: string;
  customer_tx_id: string | null;
  renewal_phone: string | null;
  created_at: string;
  completed_at: string | null;
  status: string;
  restaurants: { name: string; email: string; subscription_tier: string } | null;
}

interface Props {
  pending: Payment[];
  recent: Payment[];
}

function PaymentRow({ payment, onApprove, onReject, busy }: {
  payment: Payment;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  busy?: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        <div className="text-sm font-medium">{payment.restaurants?.name ?? "—"}</div>
        <div className="text-xs text-slate-400">{payment.restaurants?.email}</div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold capitalize">{payment.plan}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-mono">
          {payment.amount_zmw ? `ZMW ${Number(payment.amount_zmw).toFixed(2)}` : `$${payment.amount_usd}`}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-slate-600">{payment.flw_tx_ref}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-slate-700 break-all">{payment.customer_tx_id ?? "—"}</span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {format(new Date(payment.created_at), "d MMM, HH:mm")}
      </td>
      <td className="px-4 py-3">
        {onApprove && onReject ? (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(payment.id)}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Approve
            </button>
            <button
              onClick={() => onReject(payment.id)}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3 h-3" />
              Reject
            </button>
          </div>
        ) : (
          <Badge variant={payment.status === "completed" ? "completed" : "destructive"} className="capitalize">
            {payment.status}
          </Badge>
        )}
      </td>
    </tr>
  );
}

export function AdminPaymentsTable({ pending, recent }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState<Payment[]>(pending);
  const [localRecent, setLocalRecent] = useState<Payment[]>(recent);

  async function handleApprove(paymentId: string) {
    setBusyId(paymentId);
    try {
      const res = await fetch("/api/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        const approved = localPending.find((p) => p.id === paymentId);
        setLocalPending((prev) => prev.filter((p) => p.id !== paymentId));
        if (approved) setLocalRecent((prev) => [{ ...approved, status: "completed" }, ...prev]);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(paymentId: string) {
    setBusyId(paymentId);
    try {
      const res = await fetch("/api/payments/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        const rejected = localPending.find((p) => p.id === paymentId);
        setLocalPending((prev) => prev.filter((p) => p.id !== paymentId));
        if (rejected) setLocalRecent((prev) => [{ ...rejected, status: "failed" }, ...prev]);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  const tableHead = (
    <thead>
      <tr className="border-b text-xs text-slate-500 uppercase bg-slate-50">
        <th className="text-left font-medium px-4 py-3">Restaurant</th>
        <th className="text-left font-medium px-4 py-3">Plan</th>
        <th className="text-left font-medium px-4 py-3">Amount</th>
        <th className="text-left font-medium px-4 py-3">Reference</th>
        <th className="text-left font-medium px-4 py-3">Customer TX ID</th>
        <th className="text-left font-medium px-4 py-3">Submitted</th>
        <th className="text-left font-medium px-4 py-3">Action</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      {/* Pending */}
      <Card className="p-0 overflow-hidden bg-white">
        <div className="px-6 py-4 border-b flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h3 className="text-base font-semibold">Pending Approvals</h3>
          {localPending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {localPending.length}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            {tableHead}
            <tbody>
              {localPending.map((p) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  busy={busyId === p.id}
                />
              ))}
              {localPending.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    No pending payments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent */}
      {localRecent.length > 0 && (
        <Card className="p-0 overflow-hidden bg-white">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold">Recent (Approved / Rejected)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              {tableHead}
              <tbody>
                {localRecent.map((p) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
