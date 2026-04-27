export type LeadStatus =
  | 'pending'
  | 'calling'
  | 'visit_confirmed'
  | 'callback_requested'
  | 'not_interested'
  | 'follow_up'
  | 'no_answer'

export interface Lead {
  id: string
  first_name: string
  phone: string
  salutation: string
  source: string
  bhk_type: string
  status: LeadStatus
  possession_preference: string | null
  confirmed_bhk: string | null
  budget_range: string | null
  visit_slot: string | null
  call_outcome: string | null
  call_summary: string | null
  lead_score: number | null
  bolna_call_id: string | null
  recording_url: string | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  name: string
  location: string | null
  configurations: string[]
  area_min: number | null
  area_max: number | null
  price_starting: string | null
  description: string | null
  listing_type: string   // 'Residential' | 'Commercial' | 'Premium Listing'
  status: string         // 'pending' | 'confirmed' | 'follow_up'
  bolna_rag_id: string | null
  bolna_knowledge_status: 'processing' | 'processed' | 'error' | null
  bolna_knowledge_file_name: string | null
  bolna_knowledge_source_type: 'pdf' | 'url' | null
  created_at: string
  updated_at: string
}
