import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { createClient } from "@/lib/supabase/server";
import { HelpCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WhatsAppCredentialsForm } from "@/components/settings/whatsapp-credentials-form";
import { CheckinQrCard } from "@/components/settings/checkin-qr-card";
import { CheckinLocationCard } from "@/components/settings/checkin-location-card";
import { ProfilePictureUpload } from "@/components/settings/profile-picture-upload";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";

export default async function SettingsPage() {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <Header
        title="Settings"
        searchPlaceholder="Search customers..."
        restaurantName={restaurant.name}
        userEmail={user?.email}
        restaurantId={restaurant.id}
        logoUrl={restaurant.logo_url}
      />

      <div className="p-4 md:p-6 space-y-4 max-w-4xl">
        {/* Restaurant info card */}
        <Card className="p-6 bg-white">
          <ProfilePictureUpload
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            currentLogoUrl={restaurant.logo_url}
          />
          <div className="mt-4 pt-4 border-t">
            <h2 className="text-xl font-semibold">{restaurant.name}</h2>
            <div className="text-sm text-slate-500">{restaurant.email}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="active" className="capitalize">{restaurant.subscription_tier}</Badge>
              <span className="text-xs text-slate-500">{restaurant.country} · {restaurant.timezone}</span>
            </div>
          </div>
        </Card>

        {/* Check-in QR Code */}
        <CheckinQrCard slug={restaurant.slug} restaurantName={restaurant.name} />

        {/* Check-in Location Lock */}
        <CheckinLocationCard
          restaurantId={restaurant.id}
          initialEnabled={restaurant.checkin_location_enabled ?? false}
          initialLat={restaurant.latitude ?? null}
          initialLng={restaurant.longitude ?? null}
        />

        {/* WhatsApp Business API Credentials */}
        <WhatsAppCredentialsForm restaurant={restaurant} />

        {/* Notification Settings */}
        <NotificationSettingsForm restaurant={restaurant} />

        {/* Security Settings */}
        <SecuritySettingsForm />

        {/* Help & Support */}
        <Card className="p-5 bg-white">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Help &amp; Support</h3>
              <p className="text-sm text-slate-500">Visit the help center or contact support for assistance.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/help">Help Center <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
