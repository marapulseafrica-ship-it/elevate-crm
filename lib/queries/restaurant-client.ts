import { createClient } from "@/lib/supabase/client";

export interface WhatsAppCredentials {
  whatsapp_phone_number_id: string;
  whatsapp_business_account_id: string;
  whatsapp_access_token: string;
  whatsapp_app_id: string;
  whatsapp_template_name: string;
  whatsapp_number: string;
}

export async function updateWhatsAppCredentials(
  restaurantId: string,
  credentials: Partial<WhatsAppCredentials>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ ...credentials, updated_at: new Date().toISOString() })
    .eq("id", restaurantId);

  return { error: error?.message ?? null };
}

export async function updateRestaurantLogo(
  restaurantId: string,
  logoUrl: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", restaurantId);

  return { error: error?.message ?? null };
}
