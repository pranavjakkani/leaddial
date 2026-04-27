'use client'

import type { LeadStatus } from '@/lib/types'

const CONFIG: Record<LeadStatus, { classes: string; label: string; pulse?: boolean }> = {
  pending:            { classes: 'bg-blue-100 text-blue-700',     label: 'Pending' },
  calling:            { classes: 'bg-blue-100 text-blue-700',     label: 'Calling', pulse: true },
  visit_confirmed:    { classes: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' },
  callback_requested: { classes: 'bg-amber-100 text-amber-700',   label: 'Callback' },
  not_interested:     { classes: 'bg-rose-100 text-rose-700',     label: 'Not Interested' },
  follow_up:          { classes: 'bg-amber-100 text-amber-700',   label: 'Follow Up' },
  no_answer:          { classes: 'bg-slate-100 text-slate-600',   label: 'No Answer' },
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  const { classes, label, pulse } = CONFIG[status] ?? CONFIG.pending

  return (
    <span
      className={`inline-flex items-center gap-1 ${classes} text-[11px] font-bold uppercase tracking-wide rounded-full px-3 py-1`}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  )
}
