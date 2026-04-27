'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { StatsBar } from '@/components/StatsBar'
import { LeadTable } from '@/components/LeadTable'
import { AddLeadModal } from '@/components/AddLeadModal'
import type { Lead } from '@/lib/types'

const POLL_INTERVAL = 10_000 // 10 seconds
const FLASH_DURATION = 2_000  // 2 seconds

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [callingIds, setCallingIds] = useState<Set<string>>(new Set())
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
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

  async function handleCallAllPending() {
    const pending = leads.filter((l) => l.status === 'pending')
    if (pending.length === 0) {
      addToast('No pending leads to call', 'error')
      return
    }
    for (const lead of pending) {
      await handleCall(lead.id)
    }
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

  function handleLeadUpdated(leadId: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)))
    prevLeadsRef.current = Object.fromEntries(
      Object.entries(prevLeadsRef.current).map(([k, v]) =>
        k === leadId ? [k, { ...v, ...patch }] : [k, v]
      )
    )
  }

  function handleLeadAdded(lead: Lead) {
    setLeads((prev) => [lead, ...prev])
    prevLeadsRef.current[lead.id] = lead
    addToast(`${lead.first_name} added`)
  }

  const pendingCount = leads.filter((l) => l.status === 'pending').length

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-[#0F172A] tracking-tight">LeadDial</span>
            <span className="ml-2 text-sm text-[#64748B] hidden sm:inline">
              Horizon Developers · Ulwe, Navi Mumbai
            </span>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={handleCallAllPending}
                className="border border-[#E2E8F0] text-[#0F172A] text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors"
              >
                Call All Pending ({pendingCount})
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#F59E0B] text-[#0F172A] font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-amber-400 transition-colors"
            >
              + Add Lead
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        <StatsBar leads={leads} />
        <LeadTable
          leads={leads}
          onCall={handleCall}
          onDelete={handleDelete}
          onLeadUpdated={handleLeadUpdated}
          callingIds={callingIds}
          flashingIds={flashingIds}
          isLoading={isLoading}
        />
      </main>

      {/* Add Lead Modal */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleLeadAdded}
        />
      )}

      {/* Toast notifications */}
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
