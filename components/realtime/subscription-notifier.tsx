"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Props {
  restaurantId: string;
  initialStatus: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "active",
  expired: "expired",
  cancelled: "cancelled",
  trial: "trial",
};

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  basic: "Basic",
  pro: "Pro",
  premium: "Premium",
};

export function SubscriptionNotifier({ restaurantId, initialStatus }: Props) {
  const router = useRouter();
  const prevStatus = useRef(initialStatus);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`restaurant-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "restaurants",
          filter: `id=eq.${restaurantId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            subscription_status: string;
            subscription_tier: string;
          };
          const newStatus = newRow.subscription_status;
          const newTier = newRow.subscription_tier;
          const oldStatus = prevStatus.current;

          if (newStatus !== oldStatus) {
            prevStatus.current = newStatus;

            if (newStatus === "active" && oldStatus !== "active") {
              const tierLabel = TIER_LABELS[newTier] ?? newTier;
              toast.success(`Subscription activated! 🎉`, {
                description: `Your ${tierLabel} plan is now live. Enjoy all features!`,
                duration: 8000,
              });

              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification("Elevate CRM — Subscription Activated", {
                  body: `Your ${tierLabel} plan is now active.`,
                  icon: "/favicon.ico",
                });
              }
            } else if (newStatus === "expired") {
              toast.warning("Subscription expired", {
                description: "Renew your plan to keep access to all features.",
                duration: 10000,
              });
            } else if (newStatus === "cancelled") {
              toast.info("Subscription paused", {
                description: "Contact support or renew to restore access.",
                duration: 8000,
              });
            }

            // Refresh server data so UI reflects new tier/status instantly
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, router]);

  return null;
}
