'use client'

import { useState, useTransition } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Search, Filter, ArrowUpDown, Wrench, History, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataTable } from '@/components/shared/data-table'
import { InventoryStatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { adjustInventory, getInventoryMovements } from '@/lib/actions/inventory.actions'
import { createPurchaseOrder } from '@/lib/actions/purchase-order.actions'
import { formatNumber, formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Supplier } from '@/types'

interface InventoryRow {
  id: string
  product_id: string
  stock_quantity: number
  reorder_point: number
  safety_stock: number
  inventory_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  suggested_purchase: number
  products: {
    id: string
    name: string
    master_sku: string
    category: string
    cost?: number
  } | null
}

interface InventoryTableProps {
  initialData: InventoryRow[]
  total: number
  suppliers: Supplier[]
}

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  SALE:         { label: 'Bán hàng',      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
  PURCHASE:     { label: 'Nhập hàng',     color: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
  ADJUSTMENT:   { label: 'Điều chỉnh',    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30' },
  RETURN:       { label: 'Trả hàng',      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' },
  CANCELLATION: { label: 'Huỷ đơn',       color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Adjust Dialog ──────────────────────────────────────────────────────────────
function AdjustDialog({
  row, open, onClose, onSuccess,
}: {
  row: InventoryRow; open: boolean; onClose: () => void; onSuccess: (newQty: number) => void
}) {
  const [qty, setQty] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    const change = parseInt(qty, 10)
    if (isNaN(change)) return toast.error('Enter a valid number')
    startTransition(async () => {
      try {
        await adjustInventory(row.product_id, change)
        onSuccess(row.stock_quantity + change)
        onClose()
        toast.success(`Inventory adjusted by ${change > 0 ? '+' : ''}${change}`)
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Adjust Inventory</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{row.products?.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.products?.master_sku}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Current', value: row.stock_quantity },
              { label: 'Safety', value: row.safety_stock },
              { label: 'Reorder', value: row.reorder_point },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted rounded-lg p-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Quantity Change (use negative to deduct)
            </label>
            <Input
              type="number"
              placeholder="e.g. +50 or -10"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>
          {qty && !isNaN(parseInt(qty)) && (
            <p className="text-sm text-muted-foreground">
              New stock:{' '}
              <span className="font-bold text-foreground">{row.stock_quantity + parseInt(qty)}</span>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving...' : 'Apply Adjustment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── History Sheet ──────────────────────────────────────────────────────────────
function HistorySheet({
  row, open, onClose,
}: {
  row: InventoryRow; open: boolean; onClose: () => void
}) {
  const [movements, setMovements] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (movements !== null) return
    setLoading(true)
    try {
      const data = await getInventoryMovements(row.product_id)
      setMovements(data)
    } catch {
      setMovements([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { onClose(); setMovements(null) } else load() }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Stock History</SheetTitle>
        </SheetHeader>
        <div className="mt-2 mb-4">
          <p className="text-sm font-medium">{row.products?.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.products?.master_sku}</p>
        </div>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && movements?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No movement history yet</p>
        )}

        {!loading && movements && movements.length > 0 && (
          <div className="space-y-1">
            {movements.map((m: any) => {
              const meta = MOVEMENT_LABELS[m.movement_type] ?? { label: m.movement_type, color: 'text-muted-foreground bg-muted' }
              const isPositive = m.qty_change > 0
              return (
                <div key={m.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</span>
                  </div>
                  <span className={cn('text-sm font-bold tabular-nums', isPositive ? 'text-green-600' : 'text-red-600')}>
                    {isPositive ? '+' : ''}{formatNumber(m.qty_change)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Suggested PO Dialog ────────────────────────────────────────────────────────
function SuggestedPODialog({
  row, suppliers, open, onClose,
}: {
  row: InventoryRow; suppliers: Supplier[]; open: boolean; onClose: () => void
}) {
  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [qty, setQty] = useState(String(row.suggested_purchase || row.reorder_point * 2))
  const [isPending, startTransition] = useTransition()

  const unitCost = row.products?.cost ?? 0

  const handleCreate = () => {
    if (!supplierId) return toast.error('Please select a supplier')
    if (!expectedDate) return toast.error('Please select an expected date')
    const quantity = parseInt(qty, 10)
    if (isNaN(quantity) || quantity <= 0) return toast.error('Invalid quantity')

    startTransition(async () => {
      try {
        await createPurchaseOrder({
          supplier_id: supplierId,
          expected_date: expectedDate,
          items: [{ product_id: row.product_id, quantity, cost: unitCost }],
        })
        onClose()
        toast.success('Purchase order created as Draft')
        toast.info('Go to Purchase Orders to submit it')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const totalCost = (parseInt(qty) || 0) * unitCost

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <p className="text-sm font-medium">{row.products?.name}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{row.products?.master_sku}</p>
            <p className="text-xs text-orange-600 mt-1.5">
              Current stock: <b>{row.stock_quantity}</b> — Reorder point: <b>{row.reorder_point}</b>
            </p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Supplier</label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select supplier..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.length === 0
                  ? <SelectItem value="_none" disabled>No suppliers available</SelectItem>
                  : suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Expected Delivery Date</label>
            <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="h-9" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Order Quantity</label>
            <Input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} className="h-9" />
          </div>

          {totalCost > 0 && (
            <p className="text-sm text-muted-foreground">
              Estimated total:{' '}
              <span className="font-semibold text-foreground">{formatCurrency(totalCost)}</span>
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Draft PO'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Table ─────────────────────────────────────────────────────────────────
export function InventoryTable({ initialData, total, suppliers }: InventoryTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [data, setData] = useState(initialData)
  const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null)
  const [historyRow, setHistoryRow] = useState<InventoryRow | null>(null)
  const [suggestRow, setSuggestRow] = useState<InventoryRow | null>(null)

  const filtered = data.filter(row => {
    const p = row.products
    const matchSearch = !search ||
      p?.name.toLowerCase().includes(search.toLowerCase()) ||
      p?.master_sku.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || row.inventory_status === statusFilter
    return matchSearch && matchStatus
  })

  const columns: ColumnDef<InventoryRow>[] = [
    {
      id: 'product',
      header: 'Product',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.products?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.products?.category}</p>
        </div>
      ),
    },
    {
      id: 'sku',
      header: 'SKU',
      cell: ({ row }) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.original.products?.master_sku ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'stock_quantity',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold text-xs uppercase tracking-wide hover:bg-transparent"
          onClick={() => column.toggleSorting()}>
          Current Stock <ArrowUpDown className="ml-1 w-3 h-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const qty = row.original.stock_quantity
        const isLow = qty <= row.original.reorder_point
        return (
          <span className={cn('font-bold text-sm', isLow ? 'text-red-600' : 'text-foreground')}>
            {formatNumber(qty)}
          </span>
        )
      },
    },
    {
      accessorKey: 'reorder_point',
      header: 'Reorder Point',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatNumber(row.original.reorder_point)}</span>,
    },
    {
      accessorKey: 'safety_stock',
      header: 'Safety Stock',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatNumber(row.original.safety_stock)}</span>,
    },
    {
      accessorKey: 'inventory_status',
      header: 'Status',
      cell: ({ row }) => <InventoryStatusBadge status={row.original.inventory_status} />,
    },
    {
      id: 'suggestion',
      header: 'Suggested PO',
      cell: ({ row }) => {
        const qty = row.original.suggested_purchase
        if (!qty) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <button
            onClick={() => setSuggestRow(row.original)}
            className="group flex items-center gap-1"
            title="Create Purchase Order"
          >
            <Badge variant="outline" className="text-orange-600 border-orange-300 dark:border-orange-700 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-colors cursor-pointer">
              +{formatNumber(qty)} units
            </Badge>
          </button>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            title="Stock History"
            onClick={() => setHistoryRow(row.original)}
          >
            <History className="w-3.5 h-3.5" />
          </Button>
          {row.original.suggested_purchase > 0 && (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              title="Create Purchase Order"
              onClick={() => setSuggestRow(row.original)}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1"
            onClick={() => setAdjustRow(row.original)}
          >
            <Wrench className="w-3 h-3" />Adjust
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or SKU..."
            className="pl-8 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="IN_STOCK">In Stock</SelectItem>
            <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Total: {total} products</span>
        <span className="text-orange-600 font-medium">
          ⚠ {data.filter(r => r.inventory_status === 'LOW_STOCK').length} low stock
        </span>
        <span className="text-red-600 font-medium">
          ✕ {data.filter(r => r.inventory_status === 'OUT_OF_STOCK').length} out of stock
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowClassName={row =>
          row.inventory_status === 'OUT_OF_STOCK'
            ? 'bg-red-50/60 dark:bg-red-950/10'
            : row.inventory_status === 'LOW_STOCK'
            ? 'bg-orange-50/40 dark:bg-orange-950/10'
            : ''
        }
      />

      {adjustRow && (
        <AdjustDialog
          row={adjustRow}
          open={!!adjustRow}
          onClose={() => setAdjustRow(null)}
          onSuccess={newQty => {
            setData(prev => prev.map(r =>
              r.id === adjustRow.id
                ? {
                    ...r,
                    stock_quantity: newQty,
                    inventory_status: newQty === 0 ? 'OUT_OF_STOCK' : newQty <= r.reorder_point ? 'LOW_STOCK' : 'IN_STOCK',
                    suggested_purchase: newQty < r.safety_stock ? r.safety_stock - newQty : 0,
                  }
                : r
            ))
          }}
        />
      )}

      {historyRow && (
        <HistorySheet
          row={historyRow}
          open={!!historyRow}
          onClose={() => setHistoryRow(null)}
        />
      )}

      {suggestRow && (
        <SuggestedPODialog
          row={suggestRow}
          suppliers={suppliers}
          open={!!suggestRow}
          onClose={() => setSuggestRow(null)}
        />
      )}
    </div>
  )
}
