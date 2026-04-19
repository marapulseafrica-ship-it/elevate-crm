"use client";

import { Search, ChevronDown, LogOut, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef } from "react";
import { NotificationsDropdown } from "@/components/dashboard/notifications-dropdown";
import { useSidebar } from "./sidebar-context";

interface HeaderProps {
  title: string;
  searchPlaceholder?: string;
  restaurantName?: string;
  userEmail?: string;
  restaurantId?: string;
  logoUrl?: string | null;
}

export function Header({
  title,
  searchPlaceholder = "Search customers...",
  restaurantName,
  userEmail,
  restaurantId,
  logoUrl,
}: HeaderProps) {
  const router = useRouter();
  const { setOpen } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      router.push(`/customers?search=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const initials = (restaurantName || "R").charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b px-4 md:px-6 py-4 sticky top-0 z-10">
      {/* Main row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="md:hidden text-slate-500 hover:text-slate-800 shrink-0"
            onClick={() => setOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{title}</h1>
        </div>

        {/* Centre: search — hidden on mobile, shown on md+ */}
        <div className="hidden md:block flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              className="pl-9 bg-slate-50 border-slate-200"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        </div>

        {/* Right: search icon (mobile), notifications, user menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile search toggle */}
          <button
            className="md:hidden text-slate-500 hover:text-slate-800 p-1"
            onClick={() => {
              setSearchVisible((v) => !v);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <Search className="w-5 h-5" />
          </button>

          <NotificationsDropdown restaurantId={restaurantId} />

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-medium text-sm shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={restaurantName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium leading-tight">{restaurantName || "Restaurant"}</div>
                <div className="text-xs text-muted-foreground leading-tight">Admin</div>
              </div>
              <ChevronDown className="hidden sm:block w-4 h-4 text-muted-foreground" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg py-2 z-30">
                  <div className="px-3 py-2 border-b">
                    <div className="text-sm font-medium truncate">{userEmail}</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar — expands below header */}
      {searchVisible && (
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              className="pl-9 bg-slate-50 border-slate-200"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                handleSearchKeyDown(e);
                if (e.key === "Enter") setSearchVisible(false);
              }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
