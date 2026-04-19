# Restaurant CRM Dashboard

A multi-tenant restaurant CRM with WhatsApp campaign automation. Built with Next.js 14, Supabase, Tailwind CSS, and shadcn/ui.

## Features

- **Multi-tenant**: Each restaurant's data is fully isolated via Supabase Row Level Security
- **Customer management**: Track visits, auto-segment into New / Returning / Loyal / Inactive
- **Campaign builder**: Target segments, compose messages with variables, track delivery
- **Analytics**: Campaign performance, segment distribution, delivery rates
- **WhatsApp-ready**: Designed to integrate with n8n → WhatsApp Business API

## Segment rules

- **New** = 1 visit
- **Returning** = 2–4 visits
- **Loyal** = 5+ visits
- **Inactive** = no visit in 30+ days (overrides other tags)

---

## Local development setup

### Prerequisites

- Node.js 18 or higher
- A Supabase project with the schema installed (see `../supabase/SETUP.md`)

### Steps

**1. Install dependencies**

```bash
npm install
```

**2. Create your `.env.local`**

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in your Supabase credentials. Find them in your Supabase dashboard:
- **Project Settings → API → Project URL** → paste into `NEXT_PUBLIC_SUPABASE_URL`
- **Project Settings → API → Project API keys → anon public** → paste into `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Your `.env.local` should look like:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

**3. Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**4. Log in**

If you ran the seed data in Supabase, use the email/password of the user you created there. You should see the "Pizza Palace" dashboard with 50 sample customers.

If you haven't created a user yet, click **Sign up** and create one.

---

## Push to GitHub

**1. Create a new GitHub repo**

Go to https://github.com/new. Name it something like `restaurant-crm-dashboard`. **Don't** initialize with a README (we already have one). Set it to Private if you want.

**2. Push your code**

From inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit: Restaurant CRM dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/restaurant-crm-dashboard.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

> If git isn't already configured on your machine, run these one-time:
> ```
> git config --global user.name "Your Name"
> git config --global user.email "you@example.com"
> ```

---

## Deploy to Vercel

Vercel is the easiest way to deploy Next.js — it's made by the same team.

**1. Go to [vercel.com](https://vercel.com) and sign up** (use the "Continue with GitHub" option so it connects automatically).

**2. Click "Add New → Project"**

**3. Import your GitHub repo** — you should see `restaurant-crm-dashboard` in the list. Click **Import**.

**4. Configure the project**

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Environment Variables**: Click "Add" and paste both:
  - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key

**5. Click "Deploy"**

Wait ~2 minutes. You'll get a URL like `https://restaurant-crm-dashboard-xyz.vercel.app`.

**6. Add your live URL to Supabase**

In Supabase: **Authentication → URL Configuration → Site URL** → paste your Vercel URL.

Also add it under **Redirect URLs** so email confirmations work.

---

## Project structure

```
restaurant-crm-dashboard/
├── app/
│   ├── (auth)/               # Login and signup pages
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Overview screen
│   │   ├── customers/        # Customer list + filters
│   │   ├── campaigns/        # Campaign builder + history
│   │   ├── analytics/        # Campaign performance
│   │   └── settings/         # Restaurant settings + API key
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn primitives (Button, Card, etc.)
│   ├── dashboard/            # Sidebar, Header, StatCard, VisitsChart
│   ├── customers/
│   ├── campaigns/            # CampaignBuilder
│   └── analytics/            # AnalyticsCharts
├── lib/
│   ├── supabase/             # Browser, server, middleware clients
│   ├── queries/              # Typed data-fetching functions
│   └── utils.ts
├── types/
│   └── database.ts           # TypeScript types matching DB schema
├── middleware.ts             # Auth protection for dashboard routes
└── [config files]
```

---

## How the n8n integration will work

The dashboard **creates** campaigns with `status = "draft"`. The actual sending happens in n8n. Here's the handoff:

1. User hits "Send Campaign" → a new `campaigns` row is created with `status = "draft"`
2. (Future: add a button that POSTs to an n8n webhook with the campaign_id + restaurant api_key)
3. n8n picks up the campaign, calls `get_segment_customers(restaurant_id, segment)` to get recipients
4. n8n loops through each customer, sends WhatsApp via API, writes to `campaign_logs`
5. When done, n8n updates `campaigns.status = "completed"` and increments counters

The dashboard reads the updated counts automatically on refresh.

**Each restaurant's unique API key is visible in Settings → n8n / WhatsApp Integration.** n8n uses this to look up the right restaurant when a webhook fires.

---

## Tech stack

- **Next.js 14** (App Router, Server Components)
- **Supabase** (PostgreSQL, Auth, RLS)
- **Tailwind CSS** + **shadcn/ui** components
- **Recharts** for data visualization
- **TypeScript** end-to-end
- **date-fns** for date formatting
- **Lucide** icons

---

## Troubleshooting

**"Dashboard data not loading"** — Make sure you ran all 4 SQL files in Supabase (`01_schema.sql` → `04_seed_data.sql`) and that your user is the `owner_user_id` of at least one restaurant.

**"Invalid login credentials"** — The user exists in Supabase Auth but not linked to a restaurant. Either run the seed data or sign up again via the UI.

**"User not allowed"** — RLS policies are blocking you. Check that your logged-in user owns a row in the `restaurants` table.

**Build errors on Vercel** — Double-check the two env variables are set in Vercel project settings.
