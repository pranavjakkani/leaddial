import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendVisitConfirmedEmail } from '@/lib/resend'
import type { LeadStatus } from '@/lib/types'

function normaliseOutcome(raw: string | undefined | null): LeadStatus | null {
  if (!raw) return null
  const v = raw.toLowerCase().trim()
  if (v === 'visit_confirmed' || v === 'confirmed') return 'visit_confirmed'
  if (v === 'callback_requested' || v === 'callback') return 'callback_requested'
  if (v === 'not_interested') return 'not_interested'
  if (v === 'follow_up') return 'follow_up'
  if (v === 'no_answer') return 'no_answer'
  return null
}

// Bolna wraps each extracted field in a confidence envelope:
// { field: { field: { subjective: "value", objective: "value", ... } } }
// This unwraps it to a plain string.
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

function isCompleted(body: Record<string, unknown>): boolean {
  const data = body.data as Record<string, unknown> | undefined
  return (
    body.status === 'completed' ||
    body.call_status === 'completed' ||
    data?.status === 'completed' ||
    data?.call_status === 'completed'
  )
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  console.log('Bolna webhook payload:', JSON.stringify(body, null, 2))

  try {
    if (!isCompleted(body)) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const callId =
      (body.execution_id as string | undefined) ||
      (body.call_id as string | undefined) ||
      (body.id as string | undefined) ||
      ((body.data as Record<string, unknown> | undefined)?.execution_id as string | undefined) ||
      ((body.data as Record<string, unknown> | undefined)?.call_id as string | undefined)

    if (!callId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const supabase = createServerClient()

    // NEW — find the call record first
    const { data: call, error: callFetchError } = await supabase
      .from('calls')
      .select('*, lead:leads(*)')
      .eq('execution_id', callId)
      .single()

    if (callFetchError || !call) {
      return NextResponse.json({ received: true }, { status: 200 })
    }
    const lead = call.lead

    // Extract data from both payload shapes
    const dataBlock = body.data as Record<string, unknown> | undefined
    const extracted =
      (body.extracted_data as Record<string, unknown> | undefined) ||
      (dataBlock?.extracted_data as Record<string, unknown> | undefined) ||
      (body.variables_extracted as Record<string, unknown> | undefined) ||
      (dataBlock?.variables_extracted as Record<string, unknown> | undefined) ||
      {}

    const rawOutcome =
      unwrap(extracted.call_outcome, 'call_outcome') ||
      (body.call_outcome as string | undefined) ||
      (dataBlock?.call_outcome as string | undefined) ||
      null

    const outcome = normaliseOutcome(rawOutcome)

    const rawScore = unwrap(extracted.lead_score, 'lead_score') ?? body.lead_score ?? dataBlock?.lead_score
    const leadScore = rawScore != null ? parseInt(String(rawScore), 10) : null

    const telephonyData = body.telephony_data as Record<string, unknown> | undefined
    const recordingUrl =
      (telephonyData?.recording_url as string | undefined) ||
      (body.recording_url as string | undefined) ||
      (dataBlock?.recording_url as string | undefined) ||
      null

    console.log('[webhook] extracted:', {
      callId,
      rawOutcome,
      outcome,
      recordingUrl,
      telephonyData,
      extractedKeys: Object.keys(extracted),
      topLevelKeys: Object.keys(body),
    })

    const update: Record<string, unknown> = {
      call_outcome: rawOutcome ?? null,
      possession_preference: unwrap(extracted.possession_preference, 'possession_preference'),
      confirmed_bhk: unwrap(extracted.confirmed_bhk, 'confirmed_bhk'),
      budget_range: unwrap(extracted.budget_range, 'budget_range'),
      visit_slot: unwrap(extracted.visit_slot, 'visit_slot'),
      lead_score: isNaN(leadScore as number) ? null : leadScore,
    }

    // Lead status: use outcome if known, otherwise follow_up (completed is not a valid LeadStatus)
    update.status = outcome ?? 'follow_up'

    // Update the call record — calls.status is only a technical marker (calling → completed)
    await supabase.from('calls').update({
      call_outcome: rawOutcome ?? null,
      recording_url: recordingUrl,
      summary:
        (extracted.call_summary as string | undefined) ??
        (body.call_summary as string | undefined) ??
        (dataBlock?.call_summary as string | undefined) ??
        (body.transcript as string | undefined) ??
        null,
      status: 'completed',
    }).eq('id', call.id)

    // Update the lead
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(update)
      .eq('id', lead.id)
      .select()
      .single()

    if (updateError) {
      console.error('Webhook update error:', updateError)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (outcome === 'visit_confirmed' && updatedLead) {
      await sendVisitConfirmedEmail(updatedLead)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
