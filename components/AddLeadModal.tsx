'use client'

import { useState } from 'react'
import type { Lead } from '@/lib/types'

interface AddLeadModalProps {
  onClose: () => void
  onAdd: (lead: Lead) => void
}

export function AddLeadModal({ onClose, onAdd }: AddLeadModalProps) {
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [salutation, setSalutation] = useState<'Sir' | "Ma'am">('Sir')
  const [source, setSource] = useState('NoBroker')
  const [bhkType, setBhkType] = useState('2 BHK')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!firstName.trim()) {
      setError('First name is required.')
      return
    }
    if (!phone.startsWith('+')) {
      setError('Phone must start with + (e.g. +919820001001).')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          phone: phone.trim(),
          salutation,
          source,
          bhk_type: bhkType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to add lead.')
        return
      }

      const newLead: Lead = await res.json()
      onAdd(newLead)
      onClose()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-xl mx-4">
        <h2 className="text-lg font-bold text-[#0F172A] mb-5">Add New Lead</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Rahul Mehta"
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm w-full text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm w-full text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
            />
          </div>

          {/* Salutation */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">Salutation</label>
            <div className="flex gap-0 border border-[#E2E8F0] rounded-lg overflow-hidden w-fit">
              {(['Sir', "Ma'am"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSalutation(s)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    salutation === s
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm w-full text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
            >
              <option>NoBroker</option>
              <option>Housing.com</option>
              <option>MagicBricks</option>
              <option>Direct</option>
            </select>
          </div>

          {/* BHK Type */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">BHK Type</label>
            <select
              value={bhkType}
              onChange={(e) => setBhkType(e.target.value)}
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm w-full text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
            >
              <option>1 BHK</option>
              <option>2 BHK</option>
              <option>3 BHK</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-[#F43F5E]">{error}</p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#E2E8F0] text-[#64748B] px-4 py-2 rounded-lg text-sm hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#F59E0B] text-[#0F172A] font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
