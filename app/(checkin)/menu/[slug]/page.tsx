import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { MenuView } from "@/components/checkin/menu-view";
import type { MenuCategory, MenuItem, MenuPromotion } from "@/types/database";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: { slug: string };
  searchParams: { name?: string; phone?: string; segment?: string };
}

export default async function MenuPage({ params, searchParams }: Props) {
  const { data: restaurant } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, logo_url, is_active, google_review_url")
    .eq("slug", params.slug)
    .single();

  if (!restaurant || !restaurant.is_active) notFound();

  const [{ data: categories }, { data: items }, { data: promotions }] = await Promise.all([
    supabaseAdmin
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order"),
    supabaseAdmin
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .order("sort_order"),
    supabaseAdmin
      .from("menu_promotions")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true),
  ]);

  const customerName = searchParams.name ?? "Guest";
  const phone = searchParams.phone ?? "";
  const customerSegment = searchParams.segment ?? "new";

  // Filter promotions by expiry
  const now = new Date().toISOString();
  const activePromos = (promotions ?? []).filter(
    (p: MenuPromotion) => !p.expires_at || p.expires_at > now
  );

  return (
    <MenuView
      restaurantName={restaurant.name}
      logoUrl={restaurant.logo_url}
      slug={params.slug}
      restaurantId={restaurant.id}
      googleReviewUrl={restaurant.google_review_url ?? null}
      customerName={customerName}
      phone={phone}
      categories={(categories ?? []) as MenuCategory[]}
      items={(items ?? []) as MenuItem[]}
      promotions={activePromos as MenuPromotion[]}
      customerSegment={customerSegment}
    />
  );
}
