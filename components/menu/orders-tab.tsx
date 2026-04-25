"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Order, OrderItem, OrderStatus } from "@/types/database";

interface OrderWithItems extends Order {
  items: OrderItem[];
}

interface Props {
  restaurantId: string;
}

const statusColor: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export function OrdersTab({ restaurantId }: Props) {
  const supabase = createClient();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data as OrderWithItems[]) ?? []);
    setLoading(false);
  }, [restaurantId, supabase]);

  useEffect(() => { load(); }, [load]);

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
  }

  const displayed = filter === "active"
    ? orders.filter((o) => o.status === "pending" || o.status === "confirmed")
    : orders;

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "active" ? "bg-primary text-white" : "bg-white border text-slate-700 hover:bg-slate-50"}`}
          >
            Active{pendingCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{pendingCount}</span>}
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === "all" ? "bg-primary text-white" : "bg-white border text-slate-700 hover:bg-slate-50"}`}
          >
            All Orders
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading && orders.length === 0 ? (
        <Card className="p-8 text-center bg-white">
          <p className="text-sm text-slate-500">Loading orders…</p>
        </Card>
      ) : displayed.length === 0 ? (
        <Card className="p-12 text-center bg-white">
          <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{filter === "active" ? "No active orders right now." : "No orders yet."}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayed.map((order) => (
            <Card key={order.id} className={`p-5 bg-white ${order.status === "pending" ? "border-yellow-300 border-2" : ""}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{order.customer_name}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      Table {order.table_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </p>
                </div>
                <p className="text-lg font-bold text-orange-600 flex-shrink-0">ZMW {order.total_amount.toFixed(2)}</p>
              </div>

              {/* Items list */}
              <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-1">
                {(order.items ?? []).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">{item.item_name} <span className="text-slate-400">×{item.quantity}</span></span>
                    <span className="text-slate-900 font-medium">ZMW {item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <p className="text-xs text-slate-500 italic mb-3">Note: {order.notes}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {order.status === "pending" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateStatus(order.id, "confirmed")}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
                  </Button>
                )}
                {order.status === "confirmed" && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(order.id, "completed")}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Complete
                  </Button>
                )}
                {(order.status === "pending" || order.status === "confirmed") && (
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus(order.id, "cancelled")}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
