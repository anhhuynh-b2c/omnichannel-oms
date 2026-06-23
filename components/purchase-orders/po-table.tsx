'use client'

import { useState, useTransition } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { DataTable } from '@/components/shared/data-table'
import { POStatusBadge } from '@/components/shared/status-badge'
import { POForm, type POFormValues } from './po-form'
import { createPurchaseOrder, updatePOStatus } from '@/lib/actions/purchase-order.actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from '@/types'
import { Separator } from '@/components/ui/separator'

interface POItem {
  id: string
  quantity: number
  cost: number
  products: { id: string; name: string; master_sku: string }
}

interface PORow extends PurchaseOrder {
  suppliers: Supplier
  purchase_order_items: POItem[]
  total_cost?: number
}

interface POTableProps {
  initialData: PORow[]
  total: number
  suppliers: Supplier[]
}

const PO_NEXT_ACTIONS: Partial<Record<PurchaseOrderStatus, { label: string; next: PurchaseOrderStatus; variant?: 'default' | 'destructive' | 'outline' }[]>> = {
  DRAFT:    [{ label: 'Submit', next: 'PENDING' }],
  PENDING:  [{ label: 'Approve', next: 'APPROVED' }, { label: 'Cancel', next: 'CANCELLED', variant: 'destructive' }],
  APPROVED: [{ label: 'Mark Received', next: 'RECEIVED' }, { label: 'Cancel', next: 'CANCELLED', variant: 'destructive' }],
}

export function POTable({ initialData, total, suppliers }: POTableProps) {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [data, setData] = useState(initialData)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewPO, setViewPO] = useState<PORow | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = data.filter(po =>
    statusFilter === 'ALL' || po.status === statusFilter
  )

  const handleCreate = async (values: POFormValues) => {
    startTransition(async () => {
      try {
        const po = await createPurchaseOrder(values)
        const supplier = suppliers.find(s => s.id === values.supplier_id)!
        const newRow: PORow = {
          ...po,
          suppliers: supplier,
          purchase_order_items: values.items.map((item, i) => ({
            id: `new-${i}`,
            quantity: item.quantity,
            cost: item.cost,
            products: { id: item.product_id, name: 'Product', master_sku: '' },
          })),
        }
        setData(prev => [newRow, ...prev])
        setCreateOpen(false)
        toast.success('Purchase order created')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleStatusChange = (poId: string, newStatus: PurchaseOrderStatus) => {
    startTransition(async () => {
      try {
        await updatePOStatus(poId, newStatus)
        setData(prev => prev.map(po => po.id === poId ? { ...po, status: newStatus } : po))
        toast.success(`PO status updated to ${newStatus}`)
        if (newStatus === 'RECEIVED') toast.info('Inventory updated automatically')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const columns: ColumnDef<PORow>[] = [
    {
      id: 'po_number',
      header: 'PO Number',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          PO-{row.original.id.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.suppliers?.supplier_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.suppliers?.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'expected_date',
      header: 'Expected Date',
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.expected_date)}</span>,
    },
    {
      id: 'items_count',
      header: 'Items',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.purchase_order_items?.length ?? 0} items
        </span>
      ),
    },
    {
      id: 'total',
      header: 'Total Cost',
      cell: ({ row }) => {
        const total = row.original.purchase_order_items?.reduce(
          (s, i) => s + i.quantity * i.cost, 0
        ) ?? 0
        return <span className="font-semibold text-sm">{formatCurrency(total)}</span>
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <POStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const actions = PO_NEXT_ACTIONS[row.original.status] ?? []
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setViewPO(row.original)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            {actions.map(a => (
              <Button
                key={a.next}
                size="sm"
                variant={a.variant ?? 'outline'}
                className="h-7 text-xs"
                disabled={isPending}
                onClick={() => handleStatusChange(row.original.id, a.next)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {(['DRAFT','PENDING','APPROVED','RECEIVED','CANCELLED'] as PurchaseOrderStatus[]).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-9" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />New Purchase Order
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} of {total} purchase orders
      </div>

      <DataTable columns={columns} data={filtered} loading={isPending} />

      {/* Create PO Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <POForm
            suppliers={suppliers}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            loading={isPending}
          />
        </DialogContent>
      </Dialog>

      {/* View PO Sheet */}
      <Sheet open={!!viewPO} onOpenChange={v => !v && setViewPO(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Purchase Order Details</SheetTitle>
          </SheetHeader>
          {viewPO && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">PO Number</p>
                  <p className="font-mono font-semibold">PO-{viewPO.id.slice(-6).toUpperCase()}</p>
                </div>
                <POStatusBadge status={viewPO.status} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-medium">{viewPO.suppliers?.supplier_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected Date</p>
                  <p className="font-medium">{formatDate(viewPO.expected_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(viewPO.created_at)}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-semibold mb-3">Items</p>
                <div className="space-y-2">
                  {viewPO.purchase_order_items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div>
                        <p className="font-medium">{item.products.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.products.master_sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.quantity} × {formatCurrency(item.cost)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.quantity * item.cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 flex justify-end">
                  <p className="font-semibold">
                    Total: {formatCurrency(viewPO.purchase_order_items.reduce((s, i) => s + i.quantity * i.cost, 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
