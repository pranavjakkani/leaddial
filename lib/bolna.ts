import type { Lead } from '@/lib/types'

export interface BolnaExecution {
  id: string
  status: string
  transcript: string | null
  extracted_data: Record<string, unknown> | null
  conversation_duration: number | null
}

export async function getExecution(executionId: string): Promise<BolnaExecution> {
  const response = await fetch(
    `https://api.bolna.ai/agent/${process.env.BOLNA_AGENT_ID}/execution/${executionId}`,
    { headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` } }
  )
  if (!response.ok) throw new Error(`Bolna execution API ${response.status}`)
  return response.json()
}

export async function triggerCall(lead: Lead): Promise<string> {
  const response = await fetch('https://api.bolna.ai/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
    },
    body: JSON.stringify({
      agent_id: process.env.BOLNA_AGENT_ID,
      recipient_phone_number: lead.phone,
      user_data: {
        first_name: lead.first_name,
        salutation: lead.salutation,
        source: lead.source,
        bhk_type: lead.bhk_type,
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Bolna API error ${response.status}: ${text}`)
  }

  const data = await response.json()
  console.log('Bolna trigger response:', JSON.stringify(data))
  return data.execution_id
}
