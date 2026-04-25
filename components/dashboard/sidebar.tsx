"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Send, BarChart3, Settings, MessageSquare, Plus, HelpCircle, X, UtensilsCrossed } from "lucide-react";
import { useSidebar } from "./sidebar-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Campaigns", href: "/campaigns", icon: Send },
  { name: "Menu", href: "/menu", icon: UtensilsCrossed },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help Center", href: "/help", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();

  const navContent = (
    <>
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">ELEVATE <span className="text-primary">CRM</span></span>
        </Link>
        {/* Close button — mobile only */}
        <button
          className="md:hidden text-slate-500 hover:text-slate-800"
          onClick={() => setOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-700 hover:bg-white/60"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-2 border-t bg-white/40">
        <Link
          href="/campaigns?new=true"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-blue-50 to-slate-50 border-r flex-col h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-gradient-to-b from-blue-50 to-slate-50 border-r flex flex-col z-50">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
