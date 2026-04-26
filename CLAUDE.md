# LeadDial — Real Estate Voice Agent Dashboard

## Project Overview
Web app for Shree Priya Developers (Ulwe, Navi Mumbai) that manages real estate leads,
triggers outbound AI voice calls via Bolna, receives post-call webhook data, and notifies
the site manager when a lead confirms a site visit.

Built as part of the Bolna FSE Assignment. Deadline: April 27.

## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (PostgreSQL via @supabase/supabase-js)
- Resend (email notifications)
- Vercel (deploy — mark all env vars as Sensitive in dashboard)

## Key Flows
1. Site manager adds lead → stored in Supabase
2. Site manager clicks "Call" → app calls Bolna API → lead status → "calling"
3. Bolna calls the lead, runs voice agent (Joshna)
4. Post-call: Bolna POSTs to /api/webhook/bolna
5. Webhook handler parses payload → updates lead in Supabase
6. If outcome = visit_confirmed → Resend fires email to site manager
7. Dashboard shows live status, call summary, extracted data, EOD stats

## Bolna API
Base URL: https://api.bolna.dev
Auth: Bearer token in Authorization header
Trigger call: POST /v2/call
Webhook fires to: /api/webhook/bolna (set in Bolna Analytics Tab)
Webhook IP to whitelist: 13.203.39.153

## Environment Variables (see .env.local)
BOLNA_API_KEY=
BOLNA_AGENT_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
SITE_MANAGER_EMAIL=
NEXT_PUBLIC_APP_URL=

## Database (Supabase)
Table: leads
See supabase/schema.sql for full schema.

Key columns: id, first_name, phone, salutation, source, bhk_type, status,
possession_preference, confirmed_bhk, budget_range, visit_slot, call_outcome,
call_summary, lead_score, bolna_call_id, created_at, updated_at

Status values: pending | calling | visit_confirmed | callback_requested | not_interested | follow_up | no_answer

## Design Direction — LIGHT THEME, COLORFUL

Background: #FFFFFF (page), #F8FAFC (table/card surfaces)
Sidebar/header accent: deep navy #0F172A with white text
Primary action color: amber #F59E0B (call buttons, CTAs)
Status badge colors (bright, readable on white):
  pending → slate #64748B background, white text
  calling → blue #3B82F6 with pulse animation
  visit_confirmed → emerald #10B981
  callback_requested → amber #F59E0B
  not_interested → rose #F43F5E
  follow_up → orange #F97316
  no_answer → gray #94A3B8

Border: #E2E8F0 (subtle, not heavy)
Text: #0F172A primary, #64748B muted

Fonts: Import 'Plus Jakarta Sans' (body + headings) from Google Fonts.
No Inter. No Roboto. Plus Jakarta Sans gives a clean, modern, slightly premium feel.

Header bar: white background with bottom border, LeadDial logo (text) in navy, subtitle in muted.
Stats row: white cards with colored left border accent per stat, light shadow.
Table: white surface, alternating #F8FAFC row on hover, colored status badges.
Call button: amber background, dark text, slightly rounded. Disabled + spinner when calling.

The result should feel like a polished internal ops tool — clean, airy, professional.
Not corporate grey. Not dark. Not purple-gradient AI slop.

## File Structure
app/
  page.tsx                    ← Lead dashboard (stats + table + modals)
  layout.tsx                  ← Root layout with fonts
  globals.css
  api/
    webhook/bolna/
      route.ts                ← Receives Bolna post-call POST payload
    calls/trigger/
      route.ts                ← Triggers Bolna outbound call
    leads/
      route.ts                ← GET all leads, POST new lead
    leads/[id]/
      route.ts                ← PATCH update, DELETE lead

components/
  LeadTable.tsx               ← Main table with all leads
  LeadRow.tsx                 ← Single row with status badge + actions
  AddLeadModal.tsx            ← Modal: add new lead (name, phone, salutation, source, BHK)
  StatsBar.tsx                ← Top bar: total / calling / confirmed / follow-up
  StatusBadge.tsx             ← Coloured badge for call status
  CallButton.tsx              ← Triggers call with loading state

lib/
  supabase.ts                 ← Supabase server + browser clients
  bolna.ts                    ← Bolna API wrapper (triggerCall)
  resend.ts                   ← Resend email helper (sendVisitConfirmedEmail)
  types.ts                    ← Lead type definition

supabase/
  schema.sql                  ← Run once in Supabase SQL editor

## Important Implementation Notes
- Webhook route must NOT require auth (Bolna POSTs from external IP)
- Use SUPABASE_SERVICE_ROLE_KEY for server-side DB writes (not anon key)
- Bolna webhook fires multiple times per call (status updates: queued → in-progress → completed)
  Only process when payload status = "completed" to avoid partial data overwrites
- Match inbound webhook to lead using bolna_call_id stored when call was triggered
- The Bolna call trigger response returns a call_id — store it on the lead immediately
- Lead table should auto-refresh every 10 seconds (simple polling, no websockets needed for demo)
- For demo: seed 3-4 sample leads on first load if table is empty
