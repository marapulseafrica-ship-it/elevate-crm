// Database types matching the Supabase schema in supabase/01_schema.sql

export type CustomerSegment = "new" | "returning" | "loyal" | "inactive";

export type AudienceSegment =
  | "all" | "new" | "returning" | "loyal"
  | "inactive_30d" | "inactive_60d" | "inactive_90d"
  | "referrers" | "birthday_this_month" | "custom";

export type CampaignType =
  | "win_back" | "promotion" | "loyalty_reward"
  | "welcome" | "birthday" | "referral" | "general";

export type CampaignStatus =
  | "draft" | "scheduled" | "sending"
  | "completed" | "failed" | "cancelled";

export type MessageStatus =
  | "pending" | "sent" | "delivered" | "read" | "failed" | "opted_out";

export interface Restaurant {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  email: string;
  whatsapp_number: string | null;
  country: string;
  timezone: string;
  logo_url: string | null;
  subscription_tier: "starter" | "growth" | "pro";
  api_key: string;
  is_active: boolean;
  whatsapp_phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
  whatsapp_access_token: string | null;
  whatsapp_app_id: string | null;
  whatsapp_template_name: string | null;
  notification_preferences: Record<string, boolean> | null;
  latitude: number | null;
  longitude: number | null;
  checkin_location_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  total_visits: number;
  first_visit_date: string | null;
  last_visit_date: string | null;
  referred_by_id: string | null;
  referral_count: number;
  opted_in_whatsapp: boolean;
  opted_in_email: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithSegment extends Customer {
  segment: CustomerSegment;
  days_since_last_visit: number | null;
}

export interface Visit {
  id: string;
  customer_id: string;
  restaurant_id: string;
  visit_date: string;
  source: "qr_checkin" | "manual" | "imported" | "pos";
  notes: string | null;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  restaurant_id: string;
  name: string;
  category: CampaignType;
  body: string;
  whatsapp_template_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  restaurant_id: string;
  name: string;
  campaign_type: CampaignType;
  audience_segment: AudienceSegment;
  custom_filter: Record<string, unknown> | null;
  template_id: string | null;
  message_body: string;
  status: CampaignStatus;
  audience_count: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  read_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  ends_at: string | null;
  extended_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignLog {
  id: string;
  campaign_id: string;
  customer_id: string;
  restaurant_id: string;
  phone_sent_to: string;
  message_body: string;
  status: MessageStatus;
  whatsapp_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  total_customers: number;
  new_this_month: number;
  returning_30d: number;
  new_7d: number;
  inactive_30d: number;
  visits_today: number;
  visits_this_week: number;
  last_campaign: {
    name: string;
    sent_count: number;
    delivered_count: number;
    status: string;
    completed_at: string;
  } | null;
}

export interface VisitsChartPoint {
  visit_day: string;
  new_visits: number;
  returning_visits: number;
  total_visits: number;
}

export interface CampaignPerformance {
  id: string;
  name: string;
  campaign_type: CampaignType;
  audience_segment: AudienceSegment;
  audience_count: number;
  sent_count: number;
  delivered_count: number;
  delivery_rate: number;
  completed_at: string;
}
