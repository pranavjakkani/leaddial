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
  created_at: string
  updated_at: string
}
