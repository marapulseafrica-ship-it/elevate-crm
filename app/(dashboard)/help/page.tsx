import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { getCurrentRestaurant } from "@/lib/queries/restaurant";
import { createClient } from "@/lib/supabase/server";
import { FAQAccordion } from "@/components/help/faq-accordion";
import {
  LayoutDashboard,
  Users,
  Send,
  BarChart3,
  Settings,
  BookOpen,
  MessageCircle,
  QrCode,
  Zap,
  Mail,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const SUPPORT_EMAIL = "elevatealsolutionsagency@gmail.com";
const SUPPORT_WHATSAPP = "260966468562";

const gettingStarted = [
  {
    step: 1,
    title: "Set up your restaurant profile",
    description:
      "Go to Settings → fill in your restaurant name, email, country and timezone. Upload a profile picture so your brand looks polished.",
    href: "/settings",
    cta: "Go to Settings",
  },
  {
    step: 2,
    title: "Connect WhatsApp Business API",
    description:
      "In Settings → WhatsApp Business API, enter your Phone Number ID, Business Account ID, and permanent access token from Meta for Developers.",
    href: "/settings",
    cta: "Add credentials",
  },
  {
    step: 3,
    title: "Add your first customers",
    description:
      "Go to Customers → use the QR check-in link to let customers self-register, or add them manually. Each customer is automatically segmented.",
    href: "/customers",
    cta: "View Customers",
  },
  {
    step: 4,
    title: "Send your first campaign",
    description:
      "Go to Campaigns → New Campaign → pick an audience segment, choose a message type, write your message, and send.",
    href: "/campaigns",
    cta: "Create Campaign",
  },
];

const featureGuides = [
  {
    icon: LayoutDashboard,
    color: "bg-blue-50 text-blue-600",
    title: "Dashboard",
    items: [
      "Stat cards show total customers, new this month, active this week, and inactive customers.",
      "The Customer Activity chart tracks daily new vs. returning visits over the last 30 days.",
      "Quick Actions let you jump straight to creating a campaign or adding a customer.",
      "The Insights panel highlights your most common customer segment and recent campaign results.",
    ],
  },
  {
    icon: Users,
    color: "bg-violet-50 text-violet-600",
    title: "Customers",
    items: [
      "Customers are automatically segmented: New (1 visit), Returning (2–4 visits), Loyal (5+ visits), Inactive (no visit in 30+ days).",
      "Use the filter tabs at the top to view customers by segment.",
      "The Segment Summary sidebar shows a breakdown of your entire customer base.",
      "Click any customer row to see their visit history, segment, and contact details.",
    ],
  },
  {
    icon: Send,
    color: "bg-green-50 text-green-600",
    title: "Campaigns",
    items: [
      "Step 1 — Audience: choose a segment (e.g. Inactive, Loyal) or target all customers.",
      "Step 2 — Type: pick a campaign purpose like Win-Back, Promotion, Birthday, or Loyalty Reward.",
      "Step 3 — Compose: write your message. Use {{customer_name}} and {{restaurant_name}} as variables.",
      "The audience count updates live as you choose a segment so you know exactly how many will receive it.",
      "Campaign history shows sent, delivered and read counts for every past campaign.",
    ],
  },
  {
    icon: BarChart3,
    color: "bg-orange-50 text-orange-600",
    title: "Analytics",
    items: [
      "The Campaign Performance chart compares sent vs. delivered across your last 10 campaigns.",
      "The Customer Segments pie chart shows the current distribution across New, Returning, Loyal, and Inactive.",
      "The performance table shows delivery rate per campaign — aim for above 90%.",
      "Analytics only covers engagement data (visits, campaigns). Revenue data requires a POS integration.",
    ],
  },
  {
    icon: Settings,
    color: "bg-slate-100 text-slate-600",
    title: "Settings",
    items: [
      "Update your restaurant profile (name, email, country, timezone) at any time.",
      "WhatsApp Business API credentials are stored securely and used by the automation layer to send messages.",
      "Your n8n API Key is unique to your restaurant — use it to authenticate webhook calls from n8n.",
      "Notification preferences let you control which alerts you receive and via which channel.",
    ],
  },
];

const faqs = [
  {
    question: "How does customer segmentation work?",
    answer:
      "Segments are calculated automatically based on visit history. New = exactly 1 visit. Returning = 2–4 visits. Loyal = 5 or more visits. Inactive = no visit in the last 30 days (this overrides all other tags). Segments update in real time whenever a visit is recorded.",
  },
  {
    question: "What WhatsApp credentials do I need and where do I find them?",
    answer:
      "You need four things from Meta for Developers (developers.facebook.com): (1) Phone Number ID — found under your WhatsApp app → API Setup. (2) Business Account ID (WABA ID). (3) App ID — your Meta App's identifier. (4) A permanent System User access token — create this in Meta Business Manager → System Users. Do not use the temporary 24-hour token.",
  },
  {
    question: "Why is my campaign not sending?",
    answer:
      "Check three things: (1) Your WhatsApp credentials are saved correctly in Settings. (2) Your message template name matches an approved template in Meta Business Manager. (3) The n8n workflow is running and the webhook URL points to your Elevate CRM API key. If customers are in the audience but no messages are going out, check the n8n execution log for errors.",
  },
  {
    question: "How do I add customers?",
    answer:
      "There are two ways. Manual: go to Customers and click 'Add Customer', fill in name and phone number. QR Check-in: share your restaurant's QR check-in link — when a customer scans it and submits the form, they are automatically registered and their first visit is logged.",
  },
  {
    question: "What is the QR check-in and how does it work?",
    answer:
      "The QR check-in is a simple web form unique to your restaurant. Place the QR code at your counter or table. When a customer scans it, they enter their name and phone number. This fires a webhook to n8n which registers them as a customer (or logs a new visit if they're returning) in Elevate CRM.",
  },
  {
    question: "What message variables can I use in campaigns?",
    answer:
      "Two variables are supported and substituted automatically at send time: {{customer_name}} inserts the recipient's name, and {{restaurant_name}} inserts your restaurant's name. Example: 'Hi {{customer_name}}, we miss you at {{restaurant_name}}!'",
  },
  {
    question: "What is the n8n API key used for?",
    answer:
      "Your unique API key authenticates requests coming from your n8n automation workflows. It ensures that only your n8n instance can write campaign logs and visit records to your restaurant's data. Never share it publicly. You can find it in Settings → WhatsApp Business API → Your n8n API Key.",
  },
  {
    question: "What do the subscription tiers include?",
    answer:
      "Starter covers core CRM features: customer management, segmentation, and campaign building. Growth adds advanced analytics and higher campaign volumes. Pro is for multi-location businesses with dedicated support and custom integrations. Contact us to upgrade your plan.",
  },
  {
    question: "Can I have multiple staff members log in?",
    answer:
      "Multi-user support per restaurant is on the roadmap but not yet available. Currently one owner account per restaurant is supported. If you need team access urgently, contact support and we can discuss options.",
  },
  {
    question: "Is my customer data secure?",
    answer:
      "Yes. All data is stored in Supabase (PostgreSQL) with Row Level Security enforced at the database level — meaning your data is strictly isolated from other restaurants. Connections are encrypted in transit (TLS). WhatsApp access tokens are stored in your database row, which only you can access.",
  },
];

const troubleshooting = [
  {
    problem: "Dashboard shows no data",
    fix: 'Make sure you have at least one customer with a recorded visit. If you just signed up, add a customer and log a visit — the dashboard updates in real time. If the issue persists, try signing out and back in (stale auth cookies can cause blank data).',
  },
  {
    problem: "Profile picture not uploading",
    fix: "Check that the file is JPEG, PNG, GIF or WebP and under 5 MB. If you see a 'Bucket not found' error, contact support — it means the storage bucket needs to be initialised for your project.",
  },
  {
    problem: "Customer not appearing in their segment",
    fix: "Segments are recalculated on every page load from live visit data. If a customer's visit count looks wrong, check for duplicate visit records in the Customers detail view. The Inactive tag requires no visit for 30+ days and overrides all other segments.",
  },
  {
    problem: "WhatsApp messages not delivering",
    fix: "Verify: (1) the template name in Settings exactly matches the approved template name in Meta Business Manager (case-sensitive). (2) Your access token hasn't expired — use a permanent System User token, not the temporary one. (3) The recipient's number is in E.164 format (+260...).",
  },
];

export default async function HelpPage() {
  const restaurant = (await getCurrentRestaurant())!;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <Header
        title="Help Center"
        restaurantName={restaurant.name}
        userEmail={user?.email}
        restaurantId={restaurant.id}
        logoUrl={restaurant.logo_url}
      />

      <div className="p-4 md:p-6 max-w-4xl space-y-6 md:space-y-8">

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-6 h-6 text-blue-200" />
            <span className="text-blue-200 text-sm font-medium uppercase tracking-wider">Elevate CRM Help Center</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">How can we help you?</h2>
          <p className="text-blue-100 text-sm max-w-lg">
            Everything you need to get the most out of Elevate CRM — from setting up WhatsApp to understanding your customer segments.
          </p>
        </div>

        {/* Getting Started */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" /> Getting Started
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gettingStarted.map((item) => (
              <Card key={item.step} className="p-5 bg-white hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 mb-1">{item.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.description}</p>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      {item.cta} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Feature Guides */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Feature Guides
          </h3>
          <div className="space-y-4">
            {featureGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Card key={guide.title} className="p-5 bg-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${guide.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-semibold text-slate-800">{guide.title}</h4>
                  </div>
                  <ul className="space-y-2">
                    {guide.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Troubleshooting */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" /> Troubleshooting
          </h3>
          <Card className="p-5 bg-white divide-y divide-slate-100">
            {troubleshooting.map((item, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold text-slate-800 mb-1">{item.problem}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.fix}</p>
              </div>
            ))}
          </Card>
        </section>

        {/* FAQ */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" /> Frequently Asked Questions
          </h3>
          <Card className="p-5 bg-white">
            <FAQAccordion items={faqs} />
          </Card>
        </section>

        {/* Contact Support */}
        <section>
          <Card className="p-6 bg-white">
            <div className="flex items-start gap-4">
              <div className="bg-blue-50 p-3 rounded-lg shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Still need help?</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Our support team typically responds within 24 hours on business days.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 leading-none mb-0.5">Email us at</p>
                      <p className="text-sm font-semibold text-slate-800 select-all">{SUPPORT_EMAIL}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hi, I need help with Elevate CRM. Restaurant: ${restaurant.name}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Chat on WhatsApp
                    </a>
                    <span className="text-sm text-slate-500">+260 966 468 562</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">Response time: within 24 hours on business days</p>
              </div>
            </div>
          </Card>
        </section>

      </div>
    </>
  );
}
