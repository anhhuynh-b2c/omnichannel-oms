'use client'

import { useState, useTransition } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Search, Filter, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { OrderStatusBadge } from '@/components/shared/status-badge'
import { ChannelBadge } from '@/components/shared/channel-badge'
import { updateOrderStatus } from '@/lib/actions/order.actions'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Order, OrderStatus, Channel, Customer } from '@/types'

type OrderRow = Order & { channels: Channel; customers: Customer }

interface OrdersTableProps {
  initialData: OrderRow[]
  total: number
  channels: Channel[]
}

const STATUS_TRANSITIONS: Record<OrderStatus, { label: string; next: OrderStatus }[]> = {
  PENDING:       [{ label: 'Confirm', next: 'CONFIRMED' }, { label: 'Cancel', next: 'CANCELLED' }],
  CONFIRMED:     [{ label: 'Pack', next: 'PACKING' }, { label: 'Cancel', next: 'CANCELLED' }],
  PACKING:       [{ label: 'Ready to Ship', next: 'READY_TO_SHIP' }],
  READY_TO_SHIP: [{ label: 'Ship', next: 'SHIPPED' }],
  SHIPPED:       [{ label: 'Delivered', next: 'DELIVERED' }],
  DELIVERED:     [],
  CANCELLED:     [],
  RETURNED:      [{ label: 'Refund', next: 'REFUNDED' }],
  REFUNDED:      [],
}

export function OrdersTable({ initialData, total, channels }: OrdersTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  const filtered = data.filter(o => {
    const matchSearch = !search || o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customers?.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
    const matchChannel = channelFilter === 'ALL' || o.channel_id === channelFilter
    return matchSearch && matchStatus && matchChannel
  })

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, newStatus)
        setData(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        toast.success(`Order updated to ${newStatus.replace(/_/g, ' ')}`)
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: 'order_number',
      header: 'Order #',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.order_number}</span>
      ),
    },
    {
      id: 'channel',
      header: 'Channel',
      cell: ({ row }) => (
        <ChannelBadge name={row.original.channels?.name ?? '—'} />
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.customers?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.customers?.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'total_amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold text-sm">{formatCurrency(row.original.total_amount)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'order_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.order_date)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const transitions = STATUS_TRANSITIONS[row.original.status] ?? []
        if (!transitions.length) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={isPending}>
                Actions <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {transitions.map(t => (
                <DropdownMenuItem
                  key={t.next}
                  onClick={() => handleStatusChange(row.original.id, t.next)}
                  className={t.next === 'CANCELLED' ? 'text-destructive' : ''}
                >
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order # or customer..."
            className="pl-8 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {(['PENDING','CONFIRMED','PACKING','READY_TO_SHIP','SHIPPED','DELIVERED','CANCELLED','RETURNED','REFUNDED'] as OrderStatus[]).map(s => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Channels</SelectItem>
              {channels.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {total} orders
      </div>

      <DataTable columns={columns} data={filtered} loading={isPending} />
    </div>
  )
}
