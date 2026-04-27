'use client'

import { StatusBadge } from '@/components/StatusBadge'
import type { Lead } from '@/lib/types'

interface LeadRowProps {
  lead: Lead
  onCall: (leadId: string) => void
  onDelete: (leadId: string) => void
  isFlashing: boolean
  isCalling: boolean
}

export function LeadRow({ lead, onCall, onDelete, isFlashing, isCalling }: LeadRowProps) {
  const disableCall = lead.status === 'calling' || isCalling

  return (
    <tr
      className={`border-b border-[#E2E8F0] transition-colors ${
        isFlashing ? 'bg-amber-50' : 'bg-white hover:bg-[#F8FAFC]'
      }`}
    >
      {/* Name + Phone */}
      <td className="px-4 py-3">
        <div className="font-semibold text-sm text-[#0F172A]">{lead.first_name}</div>
        <div className="text-xs text-[#64748B] mt-0.5">{lead.phone}</div>
      </td>

      {/* Salutation */}
      <td className="px-4 py-3 text-sm text-[#64748B]">{lead.salutation}</td>

      {/* Source */}
      <td className="px-4 py-3 text-sm text-[#64748B]">{lead.source}</td>

      {/* BHK */}
      <td className="px-4 py-3 text-sm text-[#0F172A]">{lead.bhk_type}</td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={lead.status} />
      </td>

      {/* Lead Score */}
      <td className="px-4 py-3 text-sm text-[#64748B]">
        {lead.lead_score != null ? (
          <span className="font-medium text-[#0F172A]">{lead.lead_score}</span>
        ) : (
          '—'
        )}
        {lead.lead_score != null && <span className="text-xs text-[#94A3B8]">/10</span>}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCall(lead.id)}
            disabled={disableCall}
            className="flex items-center gap-1.5 bg-[#F59E0B] text-[#0F172A] font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCalling && (
              <svg
                className="animate-spin h-3 w-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isCalling ? 'Calling…' : 'Call'}
          </button>

          <button
            onClick={() => onDelete(lead.id)}
            className="text-[#F43F5E] hover:bg-rose-50 p-1.5 rounded-lg text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}
