import { NextRequest, NextResponse } from 'next/server'
import { createPropertyKnowledgebase } from '@/lib/bolna'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let createdPropertyId: string | null = null

  try {
    const body = await req.json()
    const {
      name,
      location = null,
      configurations = [],
      area_min = null,
      area_max = null,
      price_starting = null,
      description = null,
      listing_type = 'Residential',
      status = 'pending',
    } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const propertyPayload = {
      name: name.trim(),
      location: typeof location === 'string' ? location.trim() || null : null,
      configurations: Array.isArray(configurations)
        ? configurations
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
      area_min,
      area_max,
      price_starting,
      description: typeof description === 'string' ? description.trim() || null : null,
      listing_type,
      status,
    }

    const supabase = createServerClient()
    const { data: createdProperty, error: insertError } = await supabase
      .from('properties')
      .insert(propertyPayload)
      .select()
      .single()

    if (insertError) throw insertError

    createdPropertyId = createdProperty.id

    const knowledgebase = await createPropertyKnowledgebase(propertyPayload)

    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update({
        bolna_rag_id: knowledgebase.rag_id,
        bolna_knowledge_status: knowledgebase.status,
        bolna_knowledge_file_name: knowledgebase.file_name,
        bolna_knowledge_source_type: knowledgebase.source_type,
      })
      .eq('id', createdPropertyId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updatedProperty, { status: 201 })
  } catch (err) {
    if (createdPropertyId) {
      const supabase = createServerClient()
      const { error: rollbackError } = await supabase
        .from('properties')
        .delete()
        .eq('id', createdPropertyId)

      if (rollbackError) {
        console.error('Property rollback failed:', rollbackError)
      }
    }

    const message = err instanceof Error ? err.message : 'Failed to create property'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
