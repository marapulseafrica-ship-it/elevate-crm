import { Header } from "@/components/dashboard/header";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { createClient } from "@/lib/supabase/server";
import { canAccess, isSuperAdmin, type PlanTier } from "@/lib/plans";
import { LockedFeature } from "@/components/billing/locked-feature";
import { getMenuCategories, getMenuItems, getMenuPromotions, getOrders } from "@/lib/queries/menu";
import { MenuPageTabs } from "@/components/menu/menu-page-tabs";

export default async function MenuPage() {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tier = (restaurant.subscription_tier ?? "starter") as PlanTier;
  const superAdmin = isSuperAdmin(user?.email);

  if (!superAdmin && !canAccess(tier, "menu")) {
    return (
      <>
        <Header
          title="Menu"
          searchPlaceholder="Search customers..."
          restaurantName={restaurant.name}
          userEmail={user?.email}
          restaurantId={restaurant.id}
          logoUrl={restaurant.logo_url}
        />
        <div className="p-4 md:p-6">
          <LockedFeature feature="Menu Management" requiredPlan="Basic" />
        </div>
      </>
    );
  }

  const [categories, items, promotions, orders] = await Promise.all([
    getMenuCategories(restaurant.id),
    getMenuItems(restaurant.id),
    getMenuPromotions(restaurant.id),
    getOrders(restaurant.id),
  ]);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const canAccessAi = superAdmin || canAccess(tier, "ai_insights");

  return (
    <>
      <Header
        title="Menu"
        searchPlaceholder="Search customers..."
        restaurantName={restaurant.name}
        userEmail={user?.email}
        restaurantId={restaurant.id}
        logoUrl={restaurant.logo_url}
      />
      <div className="p-4 md:p-6">
        <MenuPageTabs
          restaurantId={restaurant.id}
          initialCategories={categories}
          initialItems={items}
          initialPromotions={promotions}
          pendingOrders={pendingOrders}
          canAccessAi={canAccessAi}
        />
      </div>
    </>
  );
}
