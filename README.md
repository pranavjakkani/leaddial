# LeadDial

Real estate AI voice agent dashboard for Horizon Developers, Ulwe (Navi Mumbai).

Manages real estate leads, triggers outbound AI voice calls via Bolna, receives post-call webhook data, stores call history, and emails the site manager when a lead confirms a site visit.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase** (PostgreSQL)
- **Bolna** (AI voice agent — outbound calls, extraction, knowledgebase RAG)
- **Resend** (email notifications)
- **Vercel** (deployment)

## Features

- **Lead Inventory** — add and manage leads with status tracking
- **One-click AI Call** — triggers Bolna outbound call with lead data injected as agent variables
- **Automate All** — sequential queue that calls every pending lead one by one, waiting for each call to complete before dialling the next
- **Call History** — per-call transcript, recording playback, and extracted data stored in a normalised `calls` table
- **Your Properties** — add property listings that are automatically uploaded to Bolna's knowledgebase API as a RAG-indexed PDF, grounding the agent in real project data
- **Live Dashboard** — stats card polling every 10 seconds via a sync endpoint that queries Bolna's execution API
- **Visit Confirmed Email** — Resend notification to site manager with lead name, phone, BHK, visit slot, budget, and AI lead score

## Database Schema

Three tables — run `supabase/schema.sql` once in your Supabase SQL Editor.

| Table | Purpose |
|---|---|
| `leads` | One row per lead. Holds contact info, status, and post-call extracted fields. |
| `calls` | One row per Bolna execution. FK to `leads`. Stores transcript, recording URL, call outcome, and technical call status. |
| `properties` | One row per property listing. Stores Bolna RAG `rag_id` and knowledgebase sync status. |

**Key design decision:** `leads.status` is the business outcome (`visit_confirmed`, `callback_requested`, etc.). `calls.status` is a technical marker only (`calling` → `completed`). A lead can have multiple calls over time.

## Setup

### 1. Supabase

Run `supabase/schema.sql` in your Supabase SQL Editor.

### 2. Environment variables

Create `.env.local`:

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

In the Bolna dashboard → your agent → Analytics tab, set the webhook URL to:

```
https://your-app.vercel.app/api/webhook/bolna
```

Whitelist IP: `13.203.39.153`

### 4. Bolna extractions

In the Bolna dashboard → your agent → Extraction, add two fields:

| Name | Type | Prompt |
|---|---|---|
| `call_outcome` | Free Text | `Based on the conversation, return exactly one of: visit_confirmed, callback_requested, not_interested, follow_up, no_answer.` |
| `visit_slot` | Free Text | `If the lead agreed to a site visit, what date/time did they mention? Otherwise return null.` |

### 5. Run locally

```bash
npm install
npm run dev
```

For local webhook testing, run ngrok and point the Bolna webhook URL at your tunnel:

```bash
ngrok http 3000
# Set webhook URL to: https://<id>.ngrok-free.app/api/webhook/bolna
```

## Key flows

1. Site manager adds lead → stored in `leads` table with `status = pending`
2. Click **AI Call** → POST to `/api/calls/trigger` → Bolna outbound call triggered → `execution_id` stored in `calls` table → `leads.status = calling`
3. Bolna agent (Joshna) calls the lead, speaks Hinglish, qualifies on BHK / budget / possession preference, attempts to book a site visit
4. Call ends → Bolna POSTs to `/api/webhook/bolna` → handler unwraps Bolna's confidence envelope on each extracted field → writes to `calls` and `leads` in Supabase
5. If `call_outcome = visit_confirmed` → Resend fires email to site manager
6. Fallback: `/api/sync` polls Bolna's execution API every 10 seconds for any calls still marked `calling` — catches cases where the webhook was missed

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/leads` | GET, POST | Fetch all leads / add new lead |
| `/api/leads/[id]` | PATCH, DELETE | Update or delete a lead |
| `/api/calls/trigger` | POST | Trigger Bolna outbound call |
| `/api/call-history` | GET | Fetch all calls joined with lead data |
| `/api/sync` | GET | Poll Bolna execution API, update stale call records |
| `/api/webhook/bolna` | POST | Receive post-call data from Bolna (public, no auth) |
| `/api/properties` | GET, POST | Fetch / create properties + upload to Bolna knowledgebase |
| `/api/properties/[id]` | PATCH, DELETE | Update or delete a property |

## Deploy

```bash
vercel deploy
```

Mark all env vars as **Sensitive** in the Vercel dashboard.
