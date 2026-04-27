import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('calls')
      .select(`
        *,
        lead:leads(id, first_name, phone, salutation, source, bhk_type, status, lead_score, possession_preference, confirmed_bhk, budget_range, visit_slot, call_outcome)
      `)
      .order('called_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch call history' }, { status: 500 })
  }
}
