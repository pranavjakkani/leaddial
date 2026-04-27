'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Property } from '@/lib/types'

const CONFIG_OPTIONS = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Shop']

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17 2H7L2 7v10l5 5h10l5-5V7l-5-5zM7 20H4v-3h3v3zm0-5H4v-3h3v3zm0-5H4V7h3v3zm6 10h-4v-3h4v3zm0-5h-4v-3h4v3zm0-5h-4V7h4v3zm6 10h-3v-3h3v3zm0-5h-3v-3h3v3zm0-5h-3V7h3v3z" />
    </svg>
  )
}

function IconLocationPin({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}

function IconCloudUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
    </svg>
  )
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  )
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    follow_up: 'bg-amber-100 text-amber-700',
  }
  const cls = map[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// ── Property Card ─────────────────────────────────────────────────────────────

function PropertyCard({
  prop,
  onDelete,
}: {
  prop: Property
  onDelete: (id: string) => void
}) {
  const gradientMap: Record<string, string> = {
    Residential: 'bg-gradient-to-br from-teal-700 to-teal-900',
    Commercial: 'bg-gradient-to-br from-slate-600 to-slate-800',
    'Premium Listing': 'bg-gradient-to-br from-amber-600 to-orange-800',
  }
  const gradient = gradientMap[prop.listing_type] ?? gradientMap['Residential']

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Image area */}
      <div className={`relative h-48 ${gradient}`}>
        {/* Listing type badge */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold text-primary uppercase tracking-wide">
          {prop.listing_type}
        </span>

        {/* Action buttons */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          <button className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-primary transition-colors">
            <IconPencil />
          </button>
          <button
            onClick={() => onDelete(prop.id)}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        {/* Name + status */}
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-primary">{prop.name}</h4>
          <StatusBadge status={prop.status} />
        </div>

        {/* Location */}
        <div className="flex items-center text-slate-500 mb-4 gap-1">
          <IconLocationPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">{prop.location ?? '—'}</span>
        </div>

        {/* Config chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {prop.configurations.map((cfg) => (
            <span
              key={cfg}
              className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-medium"
            >
              {cfg}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Area Range</span>
            <span className="text-sm font-bold text-slate-700">
              {prop.area_min && prop.area_max
                ? `${prop.area_min} - ${prop.area_max} Sq. Ft.`
                : '—'}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Price Starting</span>
            <span className="text-sm font-bold text-secondary-container">{prop.price_starting ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function YourPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState({
    name: '',
    location: '',
    configurations: [] as string[],
    customConfig: '',
    area: '',
    description: '',
  })
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastCounter = useRef(0)

  function addToast(message: string, type: Toast['type'] = 'success') {
    const id = ++toastCounter.current
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/properties')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: Property[] = await res.json()
      setProperties(data)
    } catch {
      addToast('Failed to load properties', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  function toggleConfig(cfg: string) {
    setForm((f) => ({
      ...f,
      configurations: f.configurations.includes(cfg)
        ? f.configurations.filter((c) => c !== cfg)
        : [...f.configurations, cfg],
    }))
  }

  async function handleAddProperty() {
    if (!form.name.trim()) {
      addToast('Property name is required', 'error')
      return
    }
    const allConfigs = [
      ...form.configurations,
      ...(form.customConfig.trim() ? [form.customConfig.trim()] : []),
    ]
    const listing_type = allConfigs.some((c) => c.toLowerCase() === 'shop')
      ? 'Commercial'
      : 'Residential'

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          location: form.location.trim() || null,
          configurations: allConfigs,
          area_min: form.area ? parseInt(form.area) : null,
          area_max: null,
          price_starting: null,
          description: form.description.trim() || null,
          listing_type,
          status: 'pending',
        }),
      })
      if (!res.ok) throw new Error('Failed to add')
      const newProp: Property = await res.json()
      setProperties((prev) => [newProp, ...prev])
      addToast(`${form.name} added`)
      setForm({ name: '', location: '', configurations: [], customConfig: '', area: '', description: '' })
    } catch {
      addToast('Failed to add property', 'error')
    }
  }

  async function handleDelete(id: string) {
    const prop = properties.find((p) => p.id === id)
    // Optimistic removal
    setProperties((prev) => prev.filter((p) => p.id !== id))
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      if (prop) addToast(`${prop.name} removed`)
    } catch {
      // Revert on failure
      if (prop) setProperties((prev) => [prop, ...prev])
      addToast('Failed to delete property', 'error')
    }
  }

  const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2'
  const inputClass =
    'w-full border border-slate-200 rounded-lg text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-8 max-w-360">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary tracking-tight">Your Properties</h2>
        <p className="text-slate-500 mt-1 text-sm">Manage and add new real estate projects</p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* ── LEFT: Add New Property form ───────────────────────────────────── */}
        <div className="xl:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Card header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <span className="text-primary">
                <IconBuilding />
              </span>
              <span className="font-semibold text-lg text-primary">Add New Property</span>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">

              {/* 1. Property Name */}
              <div>
                <label className={labelClass}>Property Name</label>
                <input
                  type="text"
                  placeholder="e.g. Horizon Heights"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {/* 2. Location */}
              <div>
                <label className={labelClass}>Location</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <IconLocationPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search address..."
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              {/* 3. Configuration Available */}
              <div>
                <label className={labelClass}>Configuration Available</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {CONFIG_OPTIONS.map((cfg) => {
                    const selected = form.configurations.includes(cfg)
                    return (
                      <button
                        key={cfg}
                        type="button"
                        onClick={() => toggleConfig(cfg)}
                        className={
                          selected
                            ? 'border border-primary bg-primary/5 text-primary rounded-lg p-2 text-xs font-semibold transition-colors'
                            : 'border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors'
                        }
                      >
                        {cfg}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Custom Input (e.g. Duplex)"
                  value={form.customConfig}
                  onChange={(e) => setForm((f) => ({ ...f, customConfig: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {/* 4. Area */}
              <div>
                <label className={labelClass}>Area (Sq. Ft.)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {/* 5. Description */}
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the project features..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* 6. Media Upload */}
              <div>
                <label className={labelClass}>Media (Photos &amp; PDFs)</label>
                <div
                  onClick={() => addToast('Media upload coming soon', 'info')}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer"
                >
                  <span className="text-slate-400 mb-3">
                    <IconCloudUpload />
                  </span>
                  <p className="text-sm font-medium text-slate-600">Drag &amp; drop or click to upload</p>
                  <p className="text-xs text-slate-400 mt-1">High-res images or floor plan PDFs</p>
                </div>
              </div>

              {/* 7. Submit */}
              <button
                type="button"
                onClick={handleAddProperty}
                className="w-full bg-secondary-container text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Add Property
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Active Listings grid ───────────────────────────────────── */}
        <div className="xl:col-span-8">

          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg text-primary">
              Active Listings ({properties.length})
            </h3>
            <div className="flex gap-2">
              <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                <IconGrid />
              </button>
              <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                <IconList />
              </button>
            </div>
          </div>

          {/* Property grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-slate-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {properties.map((prop) => (
                  <PropertyCard key={prop.id} prop={prop} onDelete={handleDelete} />
                ))}

                {/* Quick Add Listing card */}
                <div
                  onClick={() => addToast('Quick add coming soon')}
                  className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-white hover:border-primary transition-all group min-h-50"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 group-hover:bg-primary transition-colors flex items-center justify-center mb-4">
                    <span className="text-slate-500 group-hover:text-white transition-colors">
                      <IconPlus />
                    </span>
                  </div>
                  <p className="font-bold text-slate-600">Quick Add Listing</p>
                  <p className="text-xs text-slate-400 mt-1">Start a new draft project</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Toast notifications ───────────────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg text-white transition-all ${
              toast.type === 'error'
                ? 'bg-[#F43F5E]'
                : toast.type === 'info'
                ? 'bg-[#3B82F6]'
                : 'bg-[#10B981]'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
