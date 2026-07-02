'use client'

import { useState, useTransition } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Search, Filter, Calendar, X, CheckSquare, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { ChannelBadge } from '@/components/shared/channel-badge'
import { ChannelIcon } from '@/components/shared/channel-icon'
import { OrderStatusSummary } from './order-status-summary'
import { OrderDetailDrawer } from './order-detail-drawer'
import { ImportDialog } from './import-dialog'
import { updateOrderStatus, bulkUpdateOrderStatus } from '@/lib/actions/order.actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { ORDER_STATUS_COLORS } from '@/constants'
import type { Order, OrderStatus, Channel, Customer } from '@/types'

type OrderRow = Order & { channels: Channel; customers: Customer }

interface OrdersTableProps {
  initialData: OrderRow[]
  total: number
  channels: Channel[]
  statusCounts: Record<string, number>
}

const ALL_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PACKING', 'READY_TO_SHIP',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED',
]

const STATUS_VI: Record<OrderStatus, string> = {
  PENDING:       'Chờ xác nhận',
  CONFIRMED:     'Đã xác nhận',
  PACKING:       'Đóng gói',
  READY_TO_SHIP: 'Sẵn sàng giao',
  SHIPPED:       'Đang giao',
  DELIVERED:     'Đã giao',
  CANCELLED:     'Đã hủy',
  RETURNED:      'Trả hàng',
  REFUNDED:      'Đã hoàn tiền',
}

export function OrdersTable({ initialData, total, channels, statusCounts }: OrdersTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState(initialData)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [importOpen, setImportOpen] = useState(false)

  const filtered = data.filter(o => {
    const matchSearch = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customers?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    const matchChannel = channelFilter === 'ALL' || o.channel_id === channelFilter
    const orderDate = new Date(o.order_date)
    const matchFrom = !dateFrom || orderDate >= new Date(dateFrom)
    const matchTo = !dateTo || orderDate <= new Date(dateTo + 'T23:59:59')
    return matchSearch && matchStatus && matchChannel && matchFrom && matchTo
  })

  const allSelected = filtered.length > 0 && filtered.every(o => selectedIds.has(o.id))
  const someSelected = filtered.some(o => selectedIds.has(o.id))
  const selectedCount = filtered.filter(o => selectedIds.has(o.id)).length

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(o => next.delete(o.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(o => next.add(o.id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, newStatus)
        setData(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        toast.success('Đã cập nhật trạng thái')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleBulkAction = (newStatus: OrderStatus) => {
    const ids = filtered.filter(o => selectedIds.has(o.id)).map(o => o.id)
    if (!ids.length) return
    startTransition(async () => {
      try {
        await bulkUpdateOrderStatus(ids, newStatus)
        setData(prev => prev.map(o => ids.includes(o.id) ? { ...o, status: newStatus } : o))
        setSelectedIds(new Set())
        toast.success(`Đã cập nhật ${ids.length} đơn hàng`)
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const hasDateFilter = dateFrom || dateTo

  const columns: ColumnDef<OrderRow>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleAll}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleOne(row.original.id)}
          onClick={e => e.stopPropagation()}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      size: 40,
    },
    {
      accessorKey: 'order_number',
      header: 'Đơn hàng',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.order_number}</span>
      ),
    },
    {
      id: 'channel',
      header: 'Kênh',
      cell: ({ row }) => <ChannelBadge name={row.original.channels?.name ?? '—'} />,
    },
    {
      id: 'customer',
      header: 'Khách hàng',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.customers?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.customers?.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'total_amount',
      header: 'Tổng tiền',
      cell: ({ row }) => (
        <span className="font-semibold text-sm">{formatCurrency(row.original.total_amount)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const current = row.original.status
        return (
          <Select
            value={current}
            onValueChange={val => {
              handleStatusChange(row.original.id, val as OrderStatus)
            }}
          >
            <SelectTrigger
              className={`h-7 w-38 text-xs font-medium border-0 px-2 rounded-full ${ORDER_STATUS_COLORS[current]}`}
              onClick={e => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent onClick={e => e.stopPropagation()}>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-xs">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[s]}`}>
                    {STATUS_VI[s]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: 'order_date',
      header: 'Ngày',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.order_date)}</span>
      ),
    },
    {
      id: 'created_by',
      header: 'Nhân viên',
      cell: ({ row }) => row.original.created_by_name
        ? <span className="text-xs text-muted-foreground">{row.original.created_by_name}</span>
        : <span className="text-xs text-muted-foreground/40">—</span>,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Status summary cards */}
      <OrderStatusSummary
        counts={statusCounts}
        activeFilter={statusFilter}
        onFilter={setStatusFilter}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setImportOpen(true)}>
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Import Shopee
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã đơn hoặc khách hàng..."
            className="pl-8 h-9 w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-44">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{STATUS_VI[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Tất cả kênh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả kênh</SelectItem>
              {channels.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="inline-flex items-center gap-1.5">
                    <ChannelIcon icon={(c as any).icon} size={14} /> {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center h-9 rounded-md border bg-background px-2 gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <input
              type="date"
              className="bg-transparent outline-none w-28 text-foreground"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <span>–</span>
            <input
              type="date"
              className="bg-transparent outline-none w-28 text-foreground"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
            {hasDateFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => { setDateFrom(''); setDateTo('') }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Đã chọn {selectedCount} đơn</span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleBulkAction('CONFIRMED')}
              disabled={isPending}
            >
              Xác nhận tất cả
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => handleBulkAction('CANCELLED')}
              disabled={isPending}
            >
              Hủy tất cả
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Hiển thị {filtered.length} / {total} đơn hàng
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isPending}
        onRowClick={row => setActiveDrawer(row.id)}
      />

      <OrderDetailDrawer
        orderId={activeDrawer}
        onClose={() => setActiveDrawer(null)}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          // Reload page to show new orders
          window.location.reload()
        }}
      />
    </div>
  )
}
