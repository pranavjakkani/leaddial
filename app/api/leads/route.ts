import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { first_name, phone, salutation = 'Sir', source = 'NoBroker', bhk_type = '2 BHK' } = body

    if (!first_name) {
      return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
    }
    if (!phone || !phone.startsWith('+')) {
      return NextResponse.json({ error: 'phone must start with +' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('leads')
      .insert({ first_name, phone, salutation, source, bhk_type })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
