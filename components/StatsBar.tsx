'use client'

import type { Lead } from '@/lib/types'

interface StatCardProps {
  label: string
  value: number
  borderColor: string
}

function StatCard({ label, value, borderColor }: StatCardProps) {
  return (
    <div
      className={`bg-white border border-[#E2E8F0] border-l-4 rounded-lg p-4 shadow-sm`}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="text-2xl font-bold text-[#0F172A]">{value}</div>
      <div className="text-sm text-[#64748B] mt-0.5">{label}</div>
    </div>
  )
}

export function StatsBar({ leads }: { leads: Lead[] }) {
  const total = leads.length
  const calling = leads.filter((l) => l.status === 'calling').length
  const confirmed = leads.filter((l) => l.status === 'visit_confirmed').length
  const followUp = leads.filter(
    (l) => l.status === 'follow_up' || l.status === 'callback_requested'
  ).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Total Leads" value={total} borderColor="#0F172A" />
      <StatCard label="Calling Now" value={calling} borderColor="#3B82F6" />
      <StatCard label="Visits Confirmed" value={confirmed} borderColor="#10B981" />
      <StatCard label="Follow Ups" value={followUp} borderColor="#F97316" />
    </div>
  )
}
