"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Megaphone, Users, Info, QrCode, Calendar, CheckCheck, ShoppingBag } from "lucide-react";
import { getAllNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from "@/lib/queries/notifications";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

const typeIcon: Record<string, any> = {
  campaign_completed: Megaphone,
  customer_checkin: QrCode,
  daily_digest: Calendar,
  new_order: ShoppingBag,
  campaign: Megaphone,
  customer: Users,
  system: Info,
  info: Info,
};

const typeColor: Record<string, string> = {
  campaign_completed: "bg-blue-100 text-blue-600",
  customer_checkin: "bg-orange-100 text-orange-600",
  daily_digest: "bg-purple-100 text-purple-600",
  new_order: "bg-green-100 text-green-600",
  campaign: "bg-blue-100 text-blue-600",
  customer: "bg-emerald-100 text-emerald-600",
  system: "bg-slate-100 text-slate-500",
  info: "bg-slate-100 text-slate-500",
};

const PAGE_SIZE = 30;

export default function NotificationsPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Notification | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("owner_user_id", user.id)
        .single();
      if (data) {
        setRestaurantId(data.id);
        setRestaurantName(data.name);
      }
    });
  }, []);

  const load = useCallback(async (p: number) => {
    if (!restaurantId) return;
    setLoading(true);
    const result = await getAllNotifications(restaurantId, p, PAGE_SIZE);
    setNotifications(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { if (restaurantId) load(page); }, [restaurantId, page, load]);

  const handleMarkAllRead = async () => {
    if (!restaurantId) return;
    await markAllNotificationsRead(restaurantId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleSelect = async (n: Notification) => {
    setSelected(n);
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Header
        title="Notifications"
        searchPlaceholder="Search customers..."
        restaurantName={restaurantName}
        restaurantId={restaurantId ?? ""}
      />

      <div className="p-4 md:p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Notification History</h2>
            <p className="text-sm text-slate-500">{total} total · {unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4" /> Mark all read
            </Button>
          )}
        </div>

        {selected ? (
          <Card className="p-6 bg-white">
            <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
              ← Back to list
            </button>
            {(() => {
              const Icon = typeIcon[selected.type] || Info;
              const colorClass = typeColor[selected.type] || "bg-slate-100 text-slate-500";
              return (
                <>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1">{selected.title}</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })} · {new Date(selected.created_at).toLocaleString()}
                  </p>
                  {selected.body && (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selected.body}</p>
                  )}
                </>
              );
            })()}
          </Card>
        ) : (
          <Card className="bg-white overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <>
                {notifications.map((n) => {
                  const Icon = typeIcon[n.type] || Info;
                  const colorClass = typeColor[n.type] || "bg-slate-100 text-slate-500";
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleSelect(n)}
                      className={`flex gap-4 px-5 py-4 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                        n.is_read ? "bg-white" : "bg-blue-50/40"
                      }`}
                    >
                      <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${n.is_read ? "text-slate-700" : "text-slate-900"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t bg-slate-50">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      Previous
                    </Button>
                    <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
