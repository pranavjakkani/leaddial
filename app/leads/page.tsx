'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AddLeadModal } from '@/components/AddLeadModal'
import { IconDots } from '@/components/IconDots'
import { StatusBadge } from '@/components/StatusBadge'
import type { Lead } from '@/lib/types'

const POLL_INTERVAL = 10_000
const FLASH_DURATION = 2_000

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

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

function IconSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// Source badge color map
function getSourceColors(source: string): { bg: string; text: string } {
  const lower = source.toLowerCase()
  if (lower.includes('housing')) return { bg: 'bg-blue-100', text: 'text-blue-700' }
  if (lower.includes('magic') || lower.includes('99')) return { bg: 'bg-green-100', text: 'text-green-700' }
  if (lower.includes('nobroker') || lower.includes('no broker')) return { bg: 'bg-orange-100', text: 'text-orange-700' }
  return { bg: 'bg-slate-100', text: 'text-slate-600' }
}

export default function LeadInventoryPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [callingIds, setCallingIds] = useState<Set<string>>(new Set())
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [search, setSearch] = useState('')
  const [automating, setAutomating] = useState<{ current: number; total: number } | null>(null)
  const toastCounter = useRef(0)
  const prevLeadsRef = useRef<Record<string, Lead>>({})
  const autoQueueRef = useRef<string[]>([])

  function addToast(message: string, type: Toast['type'] = 'success') {
    const id = ++toastCounter.current
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }

  const fetchLeads = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      await fetch('/api/sync').catch(() => {})
      const res = await fetch('/api/leads')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: Lead[] = await res.json()

      // Detect status changes and flash those rows
      const prev = prevLeadsRef.current
      const changed = data
        .filter((l) => prev[l.id] && prev[l.id].status !== l.status)
        .map((l) => l.id)

      if (changed.length > 0) {
        setFlashingIds((f) => new Set([...f, ...changed]))
        setTimeout(() => {
          setFlashingIds((f) => {
            const next = new Set(f)
            changed.forEach((id) => next.delete(id))
            return next
          })
        }, FLASH_DURATION)
      }

      // Advance auto-call queue when the current lead's call ends
      const queue = autoQueueRef.current
      if (queue.length > 0) {
        const currentId = queue[0]
        const justLeft = changed.find(
          (id) => id === currentId && prev[id]?.status === 'calling'
        )
        if (justLeft) {
          queue.shift()
          if (queue.length > 0) {
            const total = queue.length + (automating?.total ?? queue.length) - queue.length
            setAutomating((a) => a ? { ...a, current: a.total - queue.length } : null)
            // Trigger next — use setTimeout to let state settle first
            setTimeout(() => handleCall(queue[0]), 0)
          } else {
            setAutomating((a) => {
              if (a) addToast(`All ${a.total} leads called`)
              return null
            })
          }
        }
      }

      // Update prev map
      prevLeadsRef.current = Object.fromEntries(data.map((l) => [l.id, l]))
      setLeads(data)
    } catch {
      if (!silent) addToast('Failed to load leads', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load + polling
  useEffect(() => {
    fetchLeads()
    const timer = setInterval(() => fetchLeads(true), POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchLeads])

  async function handleCall(leadId: string) {
    setCallingIds((s) => new Set([...s, leadId]))
    // Optimistic status update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: 'calling' as const } : l))
    )

    try {
      const res = await fetch('/api/calls/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Call failed')
      }

      addToast('Call triggered successfully')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger call'
      addToast(msg, 'error')
      // Revert optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: 'pending' as const } : l))
      )
    } finally {
      setCallingIds((s) => {
        const next = new Set(s)
        next.delete(leadId)
        return next
      })
    }
  }

  function handleCallAllPending() {
    const pending = leads.filter((l) => l.status === 'pending')
    if (pending.length === 0) {
      addToast('No pending leads to call', 'error')
      return
    }
    // Load queue — first ID gets triggered immediately, rest wait for poll to advance
    autoQueueRef.current = pending.map((l) => l.id)
    setAutomating({ current: 1, total: pending.length })
    handleCall(pending[0].id)
  }

  async function handleDelete(leadId: string) {
    // Optimistic removal
    setLeads((prev) => prev.filter((l) => l.id !== leadId))

    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      addToast('Lead deleted')
    } catch {
      addToast('Failed to delete lead', 'error')
      fetchLeads(true) // restore
    }
  }

  function handleLeadAdded(lead: Lead) {
    setLeads((prev) => [lead, ...prev])
    prevLeadsRef.current[lead.id] = lead
    addToast(`${lead.first_name} added`)
  }

  // Derived counts
  const pendingCount = leads.filter((l) => l.status === 'pending').length
  const visitConfirmedCount = leads.filter((l) => l.status === 'visit_confirmed').length
  const followUpCount = leads.filter(
    (l) => l.status === 'follow_up' || l.status === 'callback_requested'
  ).length

  // Filtered leads for table display
  const filtered = leads.filter(
    (l) =>
      l.first_name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
  )

  return (
    <div className="p-6">

      {/* ── Page header row ───────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#003441] tracking-tight">Lead Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track your real estate prospects.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* <button
            disabled
            className="bg-white border border-slate-200 text-[#003441] px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm opacity-60 cursor-not-allowed"
          >
            ↑ Import Leads
          </button> */}
          <button
            onClick={handleCallAllPending}
            disabled={automating !== null}
            className="bg-[#fe8438] text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {automating
              ? `Calling ${automating.current} / ${automating.total}…`
              : '⚡ Automate All'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#003441] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

        {/* Total Leads */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Leads</p>
          <p className="text-2xl font-bold text-[#003441]">{leads.length}</p>
        </div>

        {/* Pending Calls */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Pending Calls</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-[#003441]">{pendingCount}</p>
            {pendingCount > 0 && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                High Priority
              </span>
            )}
          </div>
        </div>

        {/* Visits Confirmed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Visits Confirmed</p>
          <p className="text-2xl font-bold text-[#003441]">{visitConfirmedCount}</p>
        </div>

        {/* Follow Ups */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Follow Ups</p>
          <p className="text-2xl font-bold text-[#003441]">{followUpCount}</p>
        </div>
      </div>

      {/* ── Table container ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Table controls bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <span className="text-sm text-slate-500">Showing {leads.length} leads</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#003441]/30 bg-white text-[#003441] placeholder:text-slate-400 w-48"
          />
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['NAME / CONTACT', 'SOURCE', 'BHK', 'STATUS', 'LAST CALL', 'ACTIONS'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="animate-pulse bg-slate-200 h-4 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                  No leads found.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const isCalling = lead.status === 'calling' || callingIds.has(lead.id)
                const isFlashing = flashingIds.has(lead.id)
                const sourceColors = getSourceColors(lead.source)
                const sourceInitial = lead.source.charAt(0).toUpperCase()
                const truncatedSummary = lead.call_summary
                  ? lead.call_summary.length > 40
                    ? lead.call_summary.slice(0, 40) + '…'
                    : lead.call_summary
                  : null

                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isFlashing ? 'bg-amber-50' : ''
                    }`}
                  >
                    {/* Name / Contact */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[#003441]">{lead.first_name}</div>
                      <div className="text-sm text-slate-500">{lead.phone}</div>
                    </td>

                    {/* Source */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${sourceColors.bg} ${sourceColors.text}`}
                        >
                          {sourceInitial}
                        </span>
                        <span className="text-sm text-slate-600">{lead.source}</span>
                      </div>
                    </td>

                    {/* BHK */}
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-sm font-medium">
                        {lead.bhk_type}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={lead.status} />
                    </td>

                    {/* Last Call */}
                    <td className="px-6 py-4">
                      {/* {truncatedSummary ? (
                        <button
                          onClick={() => setSummaryLead(lead)}
                          className="text-sm text-slate-500 hover:text-[#003441] text-left transition-colors max-w-[180px] truncate block"
                          title="Click to view full summary"
                        >
                          {truncatedSummary}
                        </button>
                      ) : ( */}
                        <span className="text-sm text-slate-400">
                          {timeAgo(lead.updated_at)}
                        </span>
                      {/* )} */}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => handleCall(lead.id)}
                          disabled={isCalling}
                          className="bg-[#0F4C5C] text-white px-3 py-1.5 rounded-lg text-sm font-bold inline-flex items-center gap-2 hover:bg-[#003441] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {callingIds.has(lead.id) ? (
                            <>
                              <IconSpinner />
                              Calling…
                            </>
                          ) : lead.status === 'calling' ? (
                            <>
                              <span className="animate-pulse">●</span>
                              Calling…
                            </>
                          ) : (
                            <>🤖 AI Call</>
                          )}
                        </button>
                        {/* <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-slate-400 hover:text-rose-500 ml-2 text-sm transition-colors"
                          title="Delete lead"
                        >
                          ✕
                        </button> */}
                         <button
                          className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100"
                          title="More options"
                        >
                          <IconDots />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleLeadAdded}
        />
      )}

      {/* ── Toast notifications ───────────────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg text-white transition-all ${
              toast.type === 'error' ? 'bg-[#F43F5E]' : 'bg-[#10B981]'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
