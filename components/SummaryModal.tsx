'use client'

import { useState } from 'react'
import type { Lead } from '@/lib/types'

interface SummaryModalProps {
  lead: Lead
  onClose: () => void
  onSaved: (leadId: string, newSummary: string) => void
}

export function SummaryModal({ lead, onClose, onSaved }: SummaryModalProps) {
  const [value, setValue] = useState(lead.call_summary ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_summary: value }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onSaved(lead.id, value)
      onClose()
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <div className="font-semibold text-[#0F172A] text-sm">{lead.first_name}</div>
            <div className="text-xs text-[#64748B] mt-0.5">Call Summary</div>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#0F172A] text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <textarea
            className="w-full min-h-[200px] text-sm text-[#0F172A] border border-[#E2E8F0] rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="No summary yet…"
          />
          {error && <p className="text-xs text-[#F43F5E]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E2E8F0]">
          <button
            onClick={onClose}
            className="text-sm text-[#64748B] hover:text-[#0F172A] px-3 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#F59E0B] text-[#0F172A] font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
