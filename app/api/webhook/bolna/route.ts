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

    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('bolna_call_id', callId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Extract data from both payload shapes
    const dataBlock = body.data as Record<string, unknown> | undefined
    const extracted =
      (body.extracted_data as Record<string, unknown> | undefined) ||
      (dataBlock?.extracted_data as Record<string, unknown> | undefined) ||
      (body.variables_extracted as Record<string, unknown> | undefined) ||
      (dataBlock?.variables_extracted as Record<string, unknown> | undefined) ||
      {}

    const rawOutcome =
      (extracted.call_outcome as string | undefined) ||
      (body.call_outcome as string | undefined) ||
      (dataBlock?.call_outcome as string | undefined)

    const outcome = normaliseOutcome(rawOutcome)

    const rawScore = extracted.lead_score ?? body.lead_score ?? dataBlock?.lead_score
    const leadScore = rawScore != null ? parseInt(String(rawScore), 10) : null

    const update: Record<string, unknown> = {
      call_outcome: rawOutcome ?? null,
      call_summary:
        (extracted.call_summary as string | undefined) ??
        (body.call_summary as string | undefined) ??
        (dataBlock?.call_summary as string | undefined) ??
        null,
      possession_preference:
        (extracted.possession_preference as string | undefined) ?? null,
      confirmed_bhk: (extracted.confirmed_bhk as string | undefined) ?? null,
      budget_range: (extracted.budget_range as string | undefined) ?? null,
      visit_slot: (extracted.visit_slot as string | undefined) ?? null,
      lead_score: isNaN(leadScore as number) ? null : leadScore,
    }

    if (outcome) {
      update.status = outcome
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(update)
      .eq('bolna_call_id', callId)
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
