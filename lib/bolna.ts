import type { Lead } from '@/lib/types'

export interface BolnaExecution {
  id: string
  status: string
  transcript: string | null
  extracted_data: Record<string, unknown> | null
  conversation_duration: number | null
  recording_url: string | null
}

export interface PropertyKnowledgeInput {
  name: string
  location: string | null
  configurations: string[]
  area_min: number | null
  area_max: number | null
  price_starting: string | null
  description: string | null
  listing_type: string
  status: string
}

export interface BolnaKnowledgebase {
  rag_id: string
  file_name: string
  status: 'processing' | 'processed' | 'error'
  source_type: 'pdf' | 'url'
  language_support: 'multilingual' | null
}

function getBolnaApiKey() {
  const apiKey = process.env.BOLNA_API_KEY
  if (!apiKey) {
    throw new Error('BOLNA_API_KEY is not configured')
  }

  return apiKey
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function toPdfSafeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wrapText(value: string, maxLength = 88) {
  const text = toPdfSafeText(value)
  if (!text) return ['']

  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (nextLine.length <= maxLength) {
      currentLine = nextLine
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    currentLine = word
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function createKnowledgeFilename(propertyName: string) {
  const slug = propertyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'property'}-knowledgebase.pdf`
}

function buildPropertyKnowledgeLines(property: PropertyKnowledgeInput) {
  const areaRange =
    property.area_min && property.area_max
      ? `${property.area_min} - ${property.area_max} sq ft`
      : property.area_min
        ? `${property.area_min} sq ft`
        : property.area_max
          ? `${property.area_max} sq ft`
          : 'Not provided'

  const sections = [
    `Property Knowledge Sheet`,
    `Name: ${property.name}`,
    `Listing Type: ${property.listing_type}`,
    `Status: ${property.status}`,
    `Location: ${property.location ?? 'Not provided'}`,
    `Configurations: ${property.configurations.length ? property.configurations.join(', ') : 'Not provided'}`,
    `Area Range: ${areaRange}`,
    `Price Starting: ${property.price_starting ?? 'Not provided'}`,
    `Description: ${property.description ?? 'Not provided'}`,
  ]

  return sections.flatMap((section) => wrapText(section))
}

function buildPdfBuffer(lines: string[]) {
  const textCommands = [
    'BT',
    '/F1 12 Tf',
    '50 780 Td',
    '16 TL',
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ['T*', `(${escapePdfText(line)}) Tj`]
    ),
    'ET',
  ]

  const stream = `${textCommands.join('\n')}\n`
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream\nendobj\n`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += object
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, 'utf8')
}

export async function createPropertyKnowledgebase(
  property: PropertyKnowledgeInput
): Promise<BolnaKnowledgebase> {
  const formData = new FormData()
  const fileName = createKnowledgeFilename(property.name)
  const pdfBuffer = buildPdfBuffer(buildPropertyKnowledgeLines(property))

  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName)

  const response = await fetch('https://api.bolna.ai/knowledgebase', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getBolnaApiKey()}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Bolna knowledgebase API ${response.status}: ${text}`)
  }

  return response.json()
}

export async function getExecution(executionId: string): Promise<BolnaExecution> {
  const response = await fetch(
    `https://api.bolna.ai/agent/${process.env.BOLNA_AGENT_ID}/execution/${executionId}`,
    { headers: { Authorization: `Bearer ${getBolnaApiKey()}` } }
  )
  if (!response.ok) throw new Error(`Bolna execution API ${response.status}`)
  return response.json()
}

export async function triggerCall(lead: Lead): Promise<string> {
  const response = await fetch('https://api.bolna.ai/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getBolnaApiKey()}`,
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
