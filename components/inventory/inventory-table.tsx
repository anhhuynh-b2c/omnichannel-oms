'use client'

import { useState, useTransition } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Search, Filter, ArrowUpDown, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/data-table'
import { InventoryStatusBadge } from '@/components/shared/status-badge'
import { adjustInventory } from '@/lib/actions/inventory.actions'
import { formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
  } | null
}

interface InventoryTableProps {
  initialData: InventoryRow[]
  total: number
}

function AdjustDialog({
  row,
  open,
  onClose,
  onSuccess,
}: {
  row: InventoryRow
  open: boolean
  onClose: () => void
  onSuccess: (newQty: number) => void
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
        <DialogHeader>
          <DialogTitle>Adjust Inventory</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{row.products?.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.products?.master_sku}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg font-bold">{row.stock_quantity}</p>
            </div>
            <div className="bg-muted rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Safety</p>
              <p className="text-lg font-bold">{row.safety_stock}</p>
            </div>
            <div className="bg-muted rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Reorder</p>
              <p className="text-lg font-bold">{row.reorder_point}</p>
            </div>
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
              New stock: <span className="font-bold text-foreground">
                {row.stock_quantity + parseInt(qty)}
              </span>
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

export function InventoryTable({ initialData, total }: InventoryTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [data, setData] = useState(initialData)
  const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null)

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
          <Badge variant="outline" className="text-orange-600 border-orange-300 dark:border-orange-700">
            +{formatNumber(qty)} units
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="outline" size="sm" className="h-7 text-xs gap-1"
          onClick={() => setAdjustRow(row.original)}
        >
          <Wrench className="w-3 h-3" />Adjust
        </Button>
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
    </div>
  )
}
