"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckinForm } from "./checkin-form";

interface Props {
  restaurantName: string;
  logoUrl: string | null;
  apiKey: string;
  slug: string;
  locationEnabled: boolean;
}

const sessionKey = (slug: string) => `elevate_menu_session_${slug}`;

export function CheckinGate(props: Props) {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(sessionKey(props.slug));
      if (!raw) return;
      const session = JSON.parse(raw) as { name: string; phone: string; segment: string; expiresAt: number };
      if (session.expiresAt > Date.now()) {
        const menuUrl = `/menu/${props.slug}?name=${encodeURIComponent(session.name)}&phone=${encodeURIComponent(session.phone)}&segment=${session.segment}`;
        router.replace(menuUrl);
      }
    } catch {}
  }, [props.slug, router]);

  return <CheckinForm {...props} />;
}
