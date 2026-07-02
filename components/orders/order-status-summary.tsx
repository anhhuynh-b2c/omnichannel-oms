'use client'

import type { OrderStatus } from '@/types'

const STATUS_CONFIG: { status: OrderStatus; label: string; color: string; bg: string }[] = [
  { status: 'PENDING',       label: 'Chờ xác nhận', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  { status: 'CONFIRMED',     label: 'Đã xác nhận',  color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  { status: 'PACKING',       label: 'Đóng gói',     color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
  { status: 'READY_TO_SHIP', label: 'Sẵn giao',     color: 'text-cyan-700',    bg: 'bg-cyan-50 border-cyan-200' },
  { status: 'SHIPPED',       label: 'Đang giao',    color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200' },
  { status: 'DELIVERED',     label: 'Đã giao',      color: 'text-green-700',   bg: 'bg-green-50 border-green-200' },
  { status: 'CANCELLED',     label: 'Đã hủy',       color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
]

interface OrderStatusSummaryProps {
  counts: Record<string, number>
  activeFilter: string
  onFilter: (status: string) => void
}

export function OrderStatusSummary({ counts, activeFilter, onFilter }: OrderStatusSummaryProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_CONFIG.map(({ status, label, color, bg }) => {
        const count = counts[status] ?? 0
        if (count === 0) return null
        const isActive = activeFilter === status
        return (
          <button
            key={status}
            onClick={() => onFilter(isActive ? 'ALL' : status)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${bg} ${color} ${
              isActive ? 'ring-2 ring-offset-1 ring-current' : 'hover:opacity-80'
            }`}
          >
            {label}
            <span className="font-bold">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
