import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getExecution } from '@/lib/bolna'
import { sendVisitConfirmedEmail } from '@/lib/resend'
import type { LeadStatus } from '@/lib/types'

const TERMINAL = new Set([
  'completed', 'call-disconnected', 'no-answer', 'busy',
  'canceled', 'failed', 'stopped', 'error', 'balance-low',
])

function mapStatus(bolnaStatus: string, extracted: Record<string, unknown> | null): LeadStatus {
  if (bolnaStatus === 'no-answer') return 'no_answer'
  if (bolnaStatus === 'busy') return 'callback_requested'

  if (extracted) {
    const raw = (extracted.call_outcome as string | undefined)?.toLowerCase().trim()
    if (raw === 'visit_confirmed' || raw === 'confirmed') return 'visit_confirmed'
    if (raw === 'callback_requested' || raw === 'callback') return 'callback_requested'
    if (raw === 'not_interested') return 'not_interested'
    if (raw === 'no_answer') return 'no_answer'
  }

  return 'follow_up'
}

export async function GET() {
  const supabase = createServerClient()

  const { data: callingLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'calling')
    .not('bolna_call_id', 'is', null)

  if (!callingLeads?.length) return NextResponse.json({ synced: 0 })

  let synced = 0

  for (const lead of callingLeads) {
    try {
      const execution = await getExecution(lead.bolna_call_id)

      if (!TERMINAL.has(execution.status)) continue

      const extracted = execution.extracted_data ?? {}
      const status = mapStatus(execution.status, execution.extracted_data)

      const update = {
        status,
        call_summary: execution.transcript ?? null,
        call_outcome: (extracted.call_outcome as string | undefined) ?? null,
        lead_score: extracted.lead_score != null ? parseInt(String(extracted.lead_score), 10) : null,
        possession_preference: (extracted.possession_preference as string | undefined) ?? null,
        confirmed_bhk: (extracted.confirmed_bhk as string | undefined) ?? null,
        budget_range: (extracted.budget_range as string | undefined) ?? null,
        visit_slot: (extracted.visit_slot as string | undefined) ?? null,
      }

      const { data: updatedLead, error } = await supabase
        .from('leads')
        .update(update)
        .eq('id', lead.id)
        .select()
        .single()

      if (error) {
        console.error(`Sync update error for lead ${lead.id}:`, error)
        continue
      }

      synced++

      if (status === 'visit_confirmed' && updatedLead) {
        await sendVisitConfirmedEmail(updatedLead)
      }
    } catch (err) {
      console.error(`Sync error for lead ${lead.id}:`, err)
    }
  }

  return NextResponse.json({ synced })
}
