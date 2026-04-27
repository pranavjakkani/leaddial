'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import type { Lead } from '@/lib/types'

const POLL_INTERVAL = 10_000

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function PhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-16 h-16 text-slate-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
      />
    </svg>
  )
}

interface TranscriptLine {
  role: 'assistant' | 'user' | 'system'
  text: string
}

function parseTranscript(summary: string | null): TranscriptLine[] {
  if (!summary || summary.trim() === '') return []
  return summary
    .split('\n')
    .map((line) => {
      const lower = line.toLowerCase()
      if (lower.startsWith('assistant:')) {
        return { role: 'assistant' as const, text: line.slice('assistant:'.length).trim() }
      }
      if (lower.startsWith('user:')) {
        return { role: 'user' as const, text: line.slice('user:'.length).trim() }
      }
      return { role: 'system' as const, text: line.trim() }
    })
    .filter((l) => l.text.length > 0)
}

function DetailPanel({ lead }: { lead: Lead }) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'details'>('transcript')
  const transcriptLines = parseTranscript(lead.call_summary)

  const detailFields: { label: string; value: string | number | null }[] = [
    { label: 'Name', value: lead.first_name },
    { label: 'Phone', value: lead.phone },
    { label: 'Salutation', value: lead.salutation },
    { label: 'Source', value: lead.source },
    { label: 'BHK Type', value: lead.bhk_type },
    { label: 'Status', value: lead.status.replace(/_/g, ' ') },
    { label: 'Possession Preference', value: lead.possession_preference },
    { label: 'Confirmed BHK', value: lead.confirmed_bhk },
    { label: 'Budget Range', value: lead.budget_range },
    { label: 'Visit Slot', value: lead.visit_slot },
    { label: 'Call Outcome', value: lead.call_outcome },
    { label: 'Lead Score', value: lead.lead_score },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-[#003441] text-white flex items-center justify-center text-xl font-bold shrink-0">
            {getInitials(lead.first_name)}
          </div>
          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#003441]">{lead.first_name}</h2>
              <StatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{lead.phone}</p>
          </div>
        </div>

        {/* Chips row */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
            {lead.bhk_type}
          </span>
          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
            {lead.source}
          </span>
          {lead.lead_score !== null && (
            <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
              Score: {lead.lead_score}
            </span>
          )}
          {lead.visit_slot && (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
              {lead.visit_slot}
            </span>
          )}
        </div>

        {/* Call ID */}
        {lead.bolna_call_id && (
          <p className="mt-3 text-[11px] font-mono text-slate-400">
            Call ID: {lead.bolna_call_id}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white shrink-0">
        <div className="flex px-6">
          {(['transcript', 'details'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 mr-6 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-orange-500 text-[#003441] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-[#003441]'
              }`}
            >
              {tab === 'transcript' ? 'Transcript' : 'Lead Details'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'transcript' ? (
          <div className="px-6 py-5 space-y-3">
            {transcriptLines.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">No transcript available.</p>
            ) : (
              transcriptLines.map((line, i) => {
                if (line.role === 'system') {
                  return (
                    <p key={i} className="text-sm text-slate-500 text-center italic py-1">
                      {line.text}
                    </p>
                  )
                }
                if (line.role === 'assistant') {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className="bg-[#003441] text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm max-w-[75%]">
                        {line.text}
                      </div>
                    </div>
                  )
                }
                // user
                return (
                  <div key={i} className="flex justify-start">
                    <div className="bg-slate-100 text-[#003441] text-sm px-4 py-2.5 rounded-2xl rounded-bl-sm max-w-[75%]">
                      {line.text}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {detailFields.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm text-[#003441] font-medium">
                    {value !== null && value !== undefined && value !== '' ? String(value) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer — AI Next Steps */}
      <div className="bg-orange-50 border-t border-orange-200 px-6 py-3 text-sm text-orange-700 font-medium shrink-0">
        AI suggests: Follow up in 2 days · Confirm visit slot · Send property brochure
      </div>
    </div>
  )
}

export default function CallHistoryPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLeads = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      await fetch('/api/sync').catch(() => {})
      const res = await fetch('/api/leads')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: Lead[] = await res.json()
      setLeads(data)
    } catch {
      // silent fail on polling
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    pollingRef.current = setInterval(() => fetchLeads(true), POLL_INTERVAL)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchLeads])

  // Only leads that have a bolna_call_id, sorted by updated_at descending
  const callLeads = leads
    .filter((l) => l.bolna_call_id !== null)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const selectedLead = callLeads.find((l) => l.id === selectedId) ?? null

  // Stats
  const totalCalls = callLeads.length
  const confirmed = callLeads.filter((l) => l.status === 'visit_confirmed').length
  const notInterested = callLeads.filter((l) => l.status === 'not_interested').length
  const followUp = callLeads.filter(
    (l) => l.status === 'follow_up' || l.status === 'callback_requested'
  ).length

  const stats = [
    { label: 'Total Calls', value: totalCalls },
    { label: 'Confirmed', value: confirmed },
    { label: 'Not Interested', value: notInterested },
    { label: 'Follow Up', value: followUp },
  ]

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left column ──────────────────────────────────────────────────── */}
      <div className="w-96 shrink-0 flex flex-col border-r border-slate-200 bg-white">

        {/* Page title */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <h1 className="text-lg font-bold text-[#003441]">Call History</h1>
          <p className="text-xs text-slate-500 mt-0.5">All AI-dialled calls</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-0 border-b border-slate-100 shrink-0">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`px-3 py-3 text-center ${i < stats.length - 1 ? 'border-r border-slate-100' : ''}`}
            >
              <p className="text-xl font-bold text-[#003441]">{stat.value}</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Call list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : callLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <PhoneIcon />
              <p className="text-sm text-slate-400 font-medium">No calls yet</p>
              <p className="text-xs text-slate-400">
                Leads that have been dialled will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {callLeads.map((lead) => {
                const isSelected = lead.id === selectedId
                return (
                  <li key={lead.id}>
                    <button
                      onClick={() => setSelectedId(lead.id)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        isSelected
                          ? 'bg-orange-50 border-l-4 border-orange-500'
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#003441] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {getInitials(lead.first_name)}
                      </div>

                      {/* Name + phone */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#003441] truncate">
                          {lead.first_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{lead.phone}</p>
                      </div>

                      {/* Right side: badge + time */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <StatusBadge status={lead.status} />
                        <span className="text-[10px] text-slate-400">{timeAgo(lead.updated_at)}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right column ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {selectedLead ? (
          <DetailPanel key={selectedLead.id} lead={selectedLead} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <PhoneIcon />
            <p className="text-base font-medium">Select a call to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
