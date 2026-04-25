"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Megaphone, Users, Info, X, QrCode, Calendar, ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/lib/queries/notifications";
import { formatDistanceToNow } from "date-fns";

interface NotificationsDropdownProps {
  restaurantId?: string;
}

const typeIcon: Record<string, any> = {
  campaign: Megaphone,
  campaign_completed: Megaphone,
  customer: Users,
  customer_checkin: QrCode,
  daily_digest: Calendar,
  system: Info,
  info: Info,
};

const typeColor: Record<string, string> = {
  campaign_completed: "bg-blue-100 text-blue-600",
  customer_checkin: "bg-orange-100 text-orange-600",
  daily_digest: "bg-purple-100 text-purple-600",
  campaign: "bg-blue-100 text-blue-600",
  customer: "bg-emerald-100 text-emerald-600",
  system: "bg-slate-100 text-slate-500",
  info: "bg-slate-100 text-slate-500",
};

export function NotificationsDropdown({ restaurantId }: NotificationsDropdownProps) {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState<Notification | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const data = await getNotifications(restaurantId);
    setNotifications(data);
    setLoading(false);
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) { setSelected(null); loadNotifications(); }
  };

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (restaurantId) loadNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="relative" onClick={handleOpen}>
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg z-30 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            {selected ? (
              <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <h3 className="font-semibold text-sm">Notifications</h3>
            )}
            <div className="flex items-center gap-1">
              {!selected && unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-blue-600" onClick={handleMarkAllRead}>
                  <CheckCheck className="w-3 h-3 mr-1" /> Mark all read
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOpen(false); setSelected(null); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Detail view */}
          {selected ? (
            <div className="p-4 max-h-96 overflow-y-auto">
              {(() => {
                const Icon = typeIcon[selected.type] || Info;
                const colorClass = typeColor[selected.type] || "bg-slate-100 text-slate-500";
                return (
                  <>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{selected.title}</h4>
                    <p className="text-xs text-slate-400 mb-3">
                      {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                    </p>
                    {selected.body && (
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selected.body}</p>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            /* List view */
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcon[n.type] || Info;
                  const colorClass = typeColor[n.type] || "bg-slate-100 text-slate-500";
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleSelect(n)}
                      className={`flex gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                        n.is_read ? "bg-white" : "bg-blue-50/60"
                      }`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${n.is_read ? "text-slate-700" : "text-slate-900"}`}>
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
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Footer */}
          {!selected && (
            <div className="border-t px-4 py-2.5">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-colors"
              >
                <History className="w-3.5 h-3.5" /> View full notification history
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
