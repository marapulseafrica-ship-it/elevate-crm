import { Header } from "@/components/dashboard/header";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { createClient } from "@/lib/supabase/server";
import { getMenuCategories, getMenuItems, getMenuPromotions, getOrders } from "@/lib/queries/menu";
import { MenuItemsTab } from "@/components/menu/menu-items-tab";
import { OrdersTab } from "@/components/menu/orders-tab";
import { PromotionsTab } from "@/components/menu/promotions-tab";
import { MenuPageTabs } from "@/components/menu/menu-page-tabs";

export default async function MenuPage() {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [categories, items, promotions, orders] = await Promise.all([
    getMenuCategories(restaurant.id),
    getMenuItems(restaurant.id),
    getMenuPromotions(restaurant.id),
    getOrders(restaurant.id),
  ]);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;

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
        />
      </div>
    </>
  );
}
