'use client'

import type { LeadStatus } from '@/lib/types'

const CONFIG: Record<LeadStatus, { bg: string; label: string; pulse?: boolean }> = {
  pending:            { bg: 'bg-[#64748B]',  label: 'Pending' },
  calling:            { bg: 'bg-[#3B82F6]',  label: 'Calling', pulse: true },
  visit_confirmed:    { bg: 'bg-[#10B981]',  label: 'Visit Confirmed' },
  callback_requested: { bg: 'bg-[#F59E0B]',  label: 'Callback' },
  not_interested:     { bg: 'bg-[#F43F5E]',  label: 'Not Interested' },
  follow_up:          { bg: 'bg-[#F97316]',  label: 'Follow Up' },
  no_answer:          { bg: 'bg-[#94A3B8]',  label: 'No Answer' },
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const { bg, label, pulse } = CONFIG[status] ?? CONFIG.pending

  return (
    <span
      className={`inline-flex items-center gap-1 ${bg} text-white text-[11px] font-semibold uppercase tracking-wide rounded-md px-2 py-0.5`}
    >
      {pulse && (
        <span className="animate-pulse">●</span>
      )}
      {label}
    </span>
  )
}
