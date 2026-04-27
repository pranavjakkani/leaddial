import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getExecution } from '@/lib/bolna'
import { sendVisitConfirmedEmail } from '@/lib/resend'
import type { LeadStatus } from '@/lib/types'

function unwrap(val: unknown, key: string): string | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'string') return val || null
  if (typeof val === 'number') return String(val)
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    const inner = obj[key] ?? obj
    if (inner && typeof inner === 'object') {
      const envelope = inner as Record<string, unknown>
      const v = envelope.subjective ?? envelope.objective
      if (typeof v === 'string') return v || null
      if (typeof v === 'number') return String(v)
    }
  }
  return null
}

const TERMINAL = new Set([
  'completed', 'no-answer', 'busy', 'canceled', 'failed', 'stopped', 'error', 'balance-low',
])

function mapStatus(bolnaStatus: string, callOutcome: string | null): LeadStatus {
  if (bolnaStatus === 'no-answer') return 'no_answer'
  if (bolnaStatus === 'busy') return 'callback_requested'
  if (callOutcome) {
    const raw = callOutcome.toLowerCase().trim()
    if (raw === 'visit_confirmed' || raw === 'confirmed') return 'visit_confirmed'
    if (raw === 'callback_requested' || raw === 'callback') return 'callback_requested'
    if (raw === 'not_interested') return 'not_interested'
    if (raw === 'no_answer') return 'no_answer'
  }
  return 'follow_up'
}

export async function GET() {
  const supabase = createServerClient()

  // Find all leads still marked 'calling' — covers both:
  // (a) calls still in-progress (webhook hasn't fired)
  // (b) calls where webhook updated calls.status but failed to update leads.status
  const { data: stuckLeads } = await supabase
    .from('leads')
    .select('id')
    .eq('status', 'calling')

  if (!stuckLeads?.length) return NextResponse.json({ synced: 0 })

  const stuckLeadIds = stuckLeads.map((l) => l.id)

  // Get the most recent call per stuck lead (to avoid re-processing old calls)
  const { data: activeCalls } = await supabase
    .from('calls')
    .select('*, lead:leads(*)')
    .in('lead_id', stuckLeadIds)
    .not('execution_id', 'is', null)
    .order('called_at', { ascending: false })

  if (!activeCalls?.length) return NextResponse.json({ synced: 0 })

  // Deduplicate: keep only the latest call per lead (array is already sorted desc by called_at)
  const seenLeads = new Set<string>()
  const callsToSync = activeCalls.filter((c) => {
    if (seenLeads.has(c.lead_id)) return false
    seenLeads.add(c.lead_id)
    return true
  })

  let synced = 0

  for (const call of callsToSync) {
    try {
      const execution = await getExecution(call.execution_id)
      if (!TERMINAL.has(execution.status)) continue

      const extracted = execution.extracted_data ?? {}
      const rawOutcome = unwrap(extracted.call_outcome, 'call_outcome')
      const status = mapStatus(execution.status, rawOutcome)

      const recordingUrl =
        execution.telephony_data?.recording_url ??
        execution.recording_url ??
        null

      const callOutcome = unwrap(extracted.call_outcome, 'call_outcome')
      const rawScore = unwrap(extracted.lead_score, 'lead_score')
      const leadScore = rawScore != null ? parseInt(rawScore, 10) : null

      // Update the call record — calls.status is only a technical marker (calling → completed)
      await supabase.from('calls').update({
        summary: execution.transcript ?? null,
        recording_url: recordingUrl,
        call_outcome: callOutcome,
        status: 'completed',
      }).eq('id', call.id)

      // Update lead with latest extracted data + new status
      const { data: updatedLead, error } = await supabase
        .from('leads')
        .update({
          status,
          call_outcome: callOutcome,
          lead_score: isNaN(leadScore as number) ? null : leadScore,
          possession_preference: unwrap(extracted.possession_preference, 'possession_preference'),
          confirmed_bhk: unwrap(extracted.confirmed_bhk, 'confirmed_bhk'),
          budget_range: unwrap(extracted.budget_range, 'budget_range'),
          visit_slot: unwrap(extracted.visit_slot, 'visit_slot'),
        })
        .eq('id', call.lead_id)
        .select()
        .single()

      if (error) {
        console.error(`Sync update error for call ${call.id}:`, error)
        continue
      }

      synced++

      if (status === 'visit_confirmed' && updatedLead) {
        await sendVisitConfirmedEmail(updatedLead)
      }
    } catch (err) {
      console.error(`Sync error for call ${call.id}:`, err)
    }
  }

  return NextResponse.json({ synced })
}
