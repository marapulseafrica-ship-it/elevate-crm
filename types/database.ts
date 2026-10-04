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
  subscription_tier: "starter" | "basic" | "pro" | "premium";
  subscription_status: "trial" | "active" | "expired" | "cancelled";
  subscription_expires_at: string | null;
  is_super_admin: boolean;
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
  google_review_url: string | null;
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

// ── Menu system ──────────────────────────────────────────────

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuPromotion {
  id: string;
  restaurant_id: string;
  campaign_id: string | null;
  title: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  eligible_segment: "all" | "new" | "returning" | "loyal";
  applicable_items: string[];
  expires_at: string | null;
  is_active: boolean;
  extracted_from: string | null;
  created_at: string;
}

export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  customer_name: string;
  table_number: string;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  item_price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderFeedback {
  id: string;
  order_id: string;
  restaurant_id: string;
  customer_id: string | null;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  restaurant_id: string;
  plan: string;
  amount_usd: number;
  currency: string;
  payment_method: string | null;
  flw_tx_ref: string | null;
  flw_tx_id: string | null;
  status: "pending" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
}

export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
}

// ── Sales Agent system ────────────────────────────────────────────────────────

export type AgentLeadStatus = "pending" | "contacted" | "interested" | "free_trial" | "activated" | "lost";
export type AgentCallOutcome = "interested" | "not_interested" | "callback" | "free_trial" | "no_answer" | "other";
export type AgentCallType = "phone" | "whatsapp" | "in_person";
export type AgentPayoutStatus = "pending" | "approved" | "paid";

export interface SalesAgent {
  id: string;
  user_id: string | null;
  full_name: string;
  nrc_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  contract_signed_at: string | null;
  payment_method: "airtel_money" | "mtn_momo" | "bank_transfer" | null;
  payment_details: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentLead {
  id: string;
  agent_id: string;
  month: string;  // ISO date string, first day of month
  restaurant_name: string;
  location: string | null;
  phone: string | null;
  contact_person: string | null;
  status: AgentLeadStatus;
  qualified_calls: number;
  last_call_at: string | null;
  notes: string | null;
  claimed_at: string;
  converted_restaurant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentCall {
  id: string;
  lead_id: string;
  agent_id: string;
  call_date: string;
  call_type: AgentCallType;
  outcome: AgentCallOutcome;
  notes: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface AgentConversion {
  id: string;
  lead_id: string | null;
  agent_id: string;
  restaurant_id: string | null;
  free_trial_started_at: string;
  activated_at: string | null;
  activation_bonus_paid: boolean;
  paid_months: number;
  total_commission_earned: number;
  created_at: string;
  updated_at: string;
}

export interface AgentCommissionRecord {
  id: string;
  conversion_id: string;
  agent_id: string;
  paid_month: string;
  performance_fee: number;
  commission_amount: number;
  status: "pending" | "included" | "paid";
  created_at: string;
}

export interface AgentPayout {
  id: string;
  agent_id: string;
  month: string;
  qualified_calls: number;
  activity_fee: number;
  conversion_bonuses: number;
  commission: number;
  total: number;
  status: AgentPayoutStatus;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentMonthSummary {
  leads_submitted: number;
  leads_remaining: number;
  qualified_calls: number;
  calls_remaining: number;
  activity_fee: number;
  bonuses_this_month: number;
  commission_this_month: number;
  total_earnings_this_month: number;
}

export interface AgentEarningsSummary {
  total_calls: number;
  total_activity_fees: number;
  total_bonuses: number;
  total_commission: number;
  grand_total: number;
  paid_out: number;
  pending_payout: number;
  active_restaurants: number;
}

export interface AgentAdminRow {
  agent_id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  month_leads: number;
  month_calls: number;
  total_conversions: number;
  unpaid_total: number;
  lifetime_earned: number;
}

export interface ClaimedRestaurantRow {
  lead_id: string;
  agent_id: string;
  agent_name: string;
  restaurant_name: string;
  location: string | null;
  phone: string | null;
  claimed_at: string;
  is_mine: boolean;
}
