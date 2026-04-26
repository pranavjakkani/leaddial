'use client'

import { LeadRow } from '@/components/LeadRow'
import type { Lead } from '@/lib/types'

const HEADERS = ['Name / Phone', 'Salutation', 'Source', 'BHK', 'Status', 'Score', 'Summary', 'Actions']

function SkeletonRow() {
  const widths = ['w-28', 'w-12', 'w-20', 'w-12', 'w-20', 'w-8', 'w-32', 'w-16']
  return (
    <tr className="border-b border-[#E2E8F0]">
      {widths.map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-4 bg-[#E2E8F0] rounded animate-pulse ${w}`} />
        </td>
      ))}
    </tr>
  )
}

interface LeadTableProps {
  leads: Lead[]
  onCall: (leadId: string) => void
  onDelete: (leadId: string) => void
  callingIds: Set<string>
  flashingIds: Set<string>
  isLoading: boolean
}

export function LeadTable({
  leads,
  onCall,
  onDelete,
  callingIds,
  flashingIds,
  isLoading,
}: LeadTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#F8FAFC] sticky top-0">
            {HEADERS.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide border-b border-[#E2E8F0] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : leads.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#64748B]">
                No leads yet. Add your first lead above.
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onCall={onCall}
                onDelete={onDelete}
                isFlashing={flashingIds.has(lead.id)}
                isCalling={callingIds.has(lead.id)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
