import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { CheckinForm } from "@/components/checkin/checkin-form";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Props {
  params: { slug: string };
}

export default async function CheckinPage({ params }: Props) {
  const { data: restaurant } = await supabaseAdmin
    .from("restaurants")
    .select("name, logo_url, api_key, is_active, checkin_location_enabled")
    .eq("slug", params.slug)
    .single();

  if (!restaurant || !restaurant.is_active) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-4">
      <CheckinForm
        restaurantName={restaurant.name}
        logoUrl={restaurant.logo_url}
        apiKey={restaurant.api_key}
        slug={params.slug}
        locationEnabled={restaurant.checkin_location_enabled ?? false}
      />
    </main>
  );
}
