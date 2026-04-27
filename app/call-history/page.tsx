'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'

const POLL_INTERVAL = 10_000

// Local type — CallWithLead (mirrors /api/call-history response shape)
interface CallWithLead {
  id: string
  lead_id: string
  execution_id: string | null
  summary: string | null
  recording_url: string | null
  call_outcome: string | null
  called_at: string
  created_at: string
  lead: {
    id: string
    first_name: string
    phone: string
    salutation: string
    source: string
    bhk_type: string
    status: string        // LeadStatus — business outcome lives here only
    lead_score: number | null
    possession_preference: string | null
    confirmed_bhk: string | null
    budget_range: string | null
    visit_slot: string | null
    call_outcome: string | null
  }
}

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

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  function formatTime(sec: number) {
    if (!isFinite(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value)
    setCurrentTime(t)
    if (audioRef.current) audioRef.current.currentTime = t
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container transition-colors shrink-0"
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-full accent-secondary-container cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 text-center">Call recording · Bolna AI</p>
    </div>
  )
}

function DetailPanel({ call }: { call: CallWithLead }) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'details' | 'recording'>('transcript')
  const transcriptLines = parseTranscript(call.summary)

  const detailFields: { label: string; value: string | number | null }[] = [
    { label: 'Name', value: call.lead.first_name },
    { label: 'Phone', value: call.lead.phone },
    { label: 'Salutation', value: call.lead.salutation },
    { label: 'Source', value: call.lead.source },
    { label: 'BHK Type', value: call.lead.bhk_type },
    { label: 'Status', value: call.lead.status.replace(/_/g, ' ') },
    { label: 'Possession Preference', value: call.lead.possession_preference },
    { label: 'Confirmed BHK', value: call.lead.confirmed_bhk },
    { label: 'Budget Range', value: call.lead.budget_range },
    { label: 'Visit Slot', value: call.lead.visit_slot },
    { label: 'Call Outcome', value: call.lead.call_outcome },
    { label: 'Lead Score', value: call.lead.lead_score },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-[#003441] text-white flex items-center justify-center text-xl font-bold shrink-0">
            {getInitials(call.lead.first_name)}
          </div>
          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#003441]">{call.lead.first_name}</h2>
              <StatusBadge status={call.lead.status as import('@/lib/types').LeadStatus} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{call.lead.phone}</p>
          </div>
        </div>

        {/* Chips row */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
            {call.lead.bhk_type}
          </span>
          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
            {call.lead.source}
          </span>
          {call.lead.lead_score !== null && (
            <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
              Score: {call.lead.lead_score}
            </span>
          )}
          {call.lead.visit_slot && (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
              {call.lead.visit_slot}
            </span>
          )}
        </div>

        {/* Call ID */}
        {call.execution_id && (
          <p className="mt-3 text-[11px] font-mono text-slate-400">
            Call ID: {call.execution_id}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white shrink-0">
        <div className="flex px-6">
          {(['transcript', 'details', 'recording'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 mr-6 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-orange-500 text-primary font-semibold'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              {tab === 'transcript' ? 'Transcript' : tab === 'details' ? 'Lead Details' : 'Recording'}
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
        ) : activeTab === 'details' ? (
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {detailFields.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm text-primary font-medium">
                    {value !== null && value !== undefined && value !== '' ? String(value) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-6">
            {call.recording_url ? (
              <AudioPlayer url={call.recording_url} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                <p className="text-sm font-medium">No recording available</p>
                <p className="text-xs">Recording will appear here once the call is synced</p>
              </div>
            )}
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
  const [calls, setCalls] = useState<CallWithLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCalls = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const res = await fetch('/api/call-history')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: CallWithLead[] = await res.json()
      setCalls(data)
    } catch {
      // silent fail on polling
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalls()
    pollingRef.current = setInterval(() => fetchCalls(true), POLL_INTERVAL)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchCalls])

  const selectedCall = calls.find((c) => c.id === selectedId) ?? null

  // Stats derived from calls array
  const totalCalls = calls.length
  const confirmed = calls.filter((c) => c.lead.status === 'visit_confirmed').length
  const notInterested = calls.filter((c) => c.lead.status === 'not_interested').length
  const followUp = calls.filter(
    (c) => c.lead.status === 'follow_up' || c.lead.status === 'callback_requested'
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
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <PhoneIcon />
              <p className="text-sm text-slate-400 font-medium">No calls yet</p>
              <p className="text-xs text-slate-400">
                Leads that have been dialled will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {calls.map((call) => {
                const isSelected = call.id === selectedId
                return (
                  <li key={call.id}>
                    <button
                      onClick={() => setSelectedId(call.id)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        isSelected
                          ? 'bg-orange-50 border-l-4 border-orange-500'
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#003441] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {getInitials(call.lead.first_name)}
                      </div>

                      {/* Name + phone */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#003441] truncate">
                          {call.lead.first_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{call.lead.phone}</p>
                      </div>

                      {/* Right side: badge + time */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <StatusBadge status={call.lead.status as import('@/lib/types').LeadStatus} />
                        <span className="text-[10px] text-slate-400">{timeAgo(call.called_at)}</span>
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
        {selectedCall ? (
          <DetailPanel key={selectedCall.id} call={selectedCall} />
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
