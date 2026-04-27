'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AddLeadModal } from '@/components/AddLeadModal'
import { IconDots } from '@/components/IconDots'
import { StatusBadge } from '@/components/StatusBadge'
import type { Lead } from '@/lib/types'

const POLL_INTERVAL = 10_000 // 10 seconds
const FLASH_DURATION = 2_000  // 2 seconds

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-primary">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-orange-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function IconCalendarCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-emerald-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function IconPhoneCall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [, setCallingIds] = useState<Set<string>>(new Set())
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [callsCount, setCallsCount] = useState(0)
  const toastCounter = useRef(0)
  const prevLeadsRef = useRef<Record<string, Lead>>({})

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

  // Calls count from calls table
  useEffect(() => {
    function fetchCallsCount() {
      fetch('/api/call-history')
        .then((r) => r.json())
        .then((data: unknown) => setCallsCount(Array.isArray(data) ? data.length : 0))
        .catch(() => {})
    }
    fetchCallsCount()
    const timer = setInterval(fetchCallsCount, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [])

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


  function handleLeadAdded(lead: Lead) {
    setLeads((prev) => [lead, ...prev])
    prevLeadsRef.current[lead.id] = lead
    addToast(`${lead.first_name} added`)
  }

  // Derived counts
  const visitConfirmedCount = leads.filter((l) => l.status === 'visit_confirmed').length

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ── Bento stats grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">

        {/* Card 1 — Total Leads */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center">
              <IconUsers />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              +12%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Leads</p>
            <p className="text-[36px] font-bold text-primary leading-tight">{leads.length}</p>
          </div>
        </div>

        {/* Card 2 — Calls Made */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <IconPhone />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              +8%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Calls Made</p>
            <p className="text-[36px] font-bold text-primary leading-tight">{callsCount}</p>
          </div>
        </div>

        {/* Card 3 — Visits Confirmed */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <IconCalendarCheck />
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              — 0%
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Visits Confirmed</p>
            <p className="text-[36px] font-bold text-primary leading-tight">{visitConfirmedCount}</p>
          </div>
        </div>

        {/* Card 4 — AI Agent Status */}
        <div className="bg-primary text-white p-6 rounded-xl shadow-md flex flex-col justify-between">
          <p className="text-on-primary-container text-[11px] font-semibold uppercase tracking-wider">AI Agent Active</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
            <span className="text-2xl font-semibold">Running</span>
          </div>
          <p className="text-xs text-on-primary-container mt-4">
            AI has screened {callsCount} lead{callsCount !== 1 ? 's' : ''} today.
          </p>
        </div>
      </div>

      {/* ── Recent Hot Leads ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

        {/* Section header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-primary">Recent Hot Leads</h2>
            {/* <p className="text-sm text-slate-500 mt-0.5">Real-time leads requiring immediate attention</p> */}
          </div>
          {/* <button
            onClick={() => setShowAddModal(true)}
            className="bg-secondary-container text-white font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-orange-500 transition-colors"
          >
            + Add Lead
          </button> */}
        </div>

        {/* Lead list — visit_confirmed only */}
        {(() => {
          const hotLeads = leads.filter((l) => l.status === 'visit_confirmed')
          if (isLoading) return <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
          if (hotLeads.length === 0) return <div className="p-8 text-center text-slate-400 text-sm">No confirmed visits yet.</div>
          return (
            <ul>
              {hotLeads.map((lead) => {
                const isFlashing = flashingIds.has(lead.id)
                const initials = lead.first_name.slice(0, 2).toUpperCase()

                return (
                  <li
                    key={lead.id}
                    className={`p-5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isFlashing ? 'bg-amber-50' : ''}`}
                  >
                    <div className="flex items-start gap-5">

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center font-bold text-base text-primary shrink-0">
                        {initials}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-base font-bold text-primary">{lead.first_name}</span>
                          <StatusBadge status={lead.status} />
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-sm text-slate-500">{lead.source}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-sm text-slate-500">{lead.bhk_type}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-sm text-slate-500">{lead.phone}</span>
                        </div>
                      </div>

                      {/* Actions — icon buttons */}
                      <div className="self-center flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCall(lead.id)}
                          className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100"
                          title="Call lead"
                        >
                          <IconPhoneCall />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100"
                          title="More options"
                        >
                          <IconDots />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        })()}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleLeadAdded}
        />
      )}

      {/* ── Toast notifications ─────────────────────────────────────────────── */}
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
