"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Megaphone, Users, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/queries/notifications";
import { formatDistanceToNow } from "date-fns";

interface NotificationsDropdownProps {
  restaurantId?: string;
}

const typeIcon = {
  campaign: Megaphone,
  customer: Users,
  system: Info,
  info: Info,
};

export function NotificationsDropdown({ restaurantId }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
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
    setOpen((prev) => !prev);
    if (!open) loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!restaurantId) return;
    await markAllNotificationsRead(restaurantId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 text-blue-600"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

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
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b last:border-0 transition-colors ${
                      n.is_read ? "bg-white" : "bg-blue-50/60"
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${
                      n.is_read ? "bg-slate-100" : "bg-blue-100"
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${n.is_read ? "text-slate-500" : "text-blue-600"}`} />
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
        </div>
      )}
    </div>
  );
}
