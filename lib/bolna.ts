import type { Lead } from '@/lib/types'

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
  return data.call_id
}
