# LeadDial

Real estate voice agent dashboard for Shree Priya Developers, Ulwe (Navi Mumbai).

Built for the Bolna FSE Assignment — manages leads, triggers outbound AI voice calls via Bolna, receives post-call webhook data, and emails the site manager on visit confirmation.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL)
- **Bolna** (AI voice calls)
- **Resend** (email notifications)
- **Vercel** (deployment)

## Setup

### 1. Supabase

Run `supabase/schema.sql` in your Supabase SQL Editor to create the `leads` table.

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
BOLNA_API_KEY=
BOLNA_AGENT_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
SITE_MANAGER_EMAIL=
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3. Bolna webhook

In the Bolna Analytics tab, set the webhook URL to:
```
https://your-app.vercel.app/api/webhook/bolna
```

Whitelist IP: `13.203.39.153`

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key flows

1. Site manager adds lead → stored in Supabase
2. Click **Call** → app triggers Bolna outbound call → status → `calling`
3. Bolna calls the lead, runs voice agent (Joshna)
4. Post-call: Bolna POSTs to `/api/webhook/bolna`
5. Webhook parses payload → updates lead in Supabase
6. If outcome = `visit_confirmed` → Resend emails the site manager
7. Dashboard polls every 10s and reflects live status

## Deploy

```bash
vercel deploy
```

Mark all env vars as **Sensitive** in the Vercel dashboard.
