import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { triggerCall } from '@/lib/bolna'

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const callId = await triggerCall(lead)

    const { error: insertError } = await supabase
      .from('calls')
      .insert({
        lead_id: leadId,
        execution_id: callId,
        status: 'calling',
        called_at: new Date().toISOString(),
      })

    if (insertError) throw insertError

    const { error: updateError } = await supabase
      .from('leads')
      .update({ status: 'calling' })
      .eq('id', leadId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, execution_id: callId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
