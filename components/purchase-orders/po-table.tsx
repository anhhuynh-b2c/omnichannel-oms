'use client'

import { useState, useTransition, useEffect } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Eye, Pencil, Printer, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { createPurchaseOrder, updatePOStatus, updatePurchaseOrder, bulkUpdatePOStatus } from '@/lib/actions/purchase-order.actions'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import type { PurchaseOrder, PurchaseOrderStatus, Supplier, CompanySettings } from '@/types'
import { Separator } from '@/components/ui/separator'
import { getAccountProfile } from '@/lib/actions/account.actions'

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
  products?: { id: string; name: string; master_sku: string; cost?: number | null }[]
  companySettings?: CompanySettings | null
}

const PO_NEXT_ACTIONS: Partial<Record<PurchaseOrderStatus, { label: string; next: PurchaseOrderStatus; variant?: 'default' | 'destructive' | 'outline' }[]>> = {
  DRAFT:    [{ label: 'Submit', next: 'PENDING' }],
  PENDING:  [{ label: 'Approve', next: 'APPROVED' }, { label: 'Cancel', next: 'CANCELLED', variant: 'destructive' }],
  APPROVED: [{ label: 'Mark Received', next: 'RECEIVED' }, { label: 'Cancel', next: 'CANCELLED', variant: 'destructive' }],
}

export function POTable({ initialData, total, suppliers, products = [], companySettings }: POTableProps) {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [data, setData] = useState(initialData)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewPO, setViewPO] = useState<PORow | null>(null)
  const [editPO, setEditPO] = useState<PORow | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [userName, setUserName] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getAccountProfile().then(p => setUserName(p.name)).catch(() => {})
  }, [])

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

  const handleEdit = async (values: POFormValues) => {
    if (!editPO) return
    startTransition(async () => {
      try {
        await updatePurchaseOrder(editPO.id, values)
        const supplier = suppliers.find(s => s.id === values.supplier_id)!
        setData(prev => prev.map(po => po.id === editPO.id ? {
          ...po,
          supplier_id: values.supplier_id,
          expected_date: values.expected_date,
          notes: values.notes,
          suppliers: supplier,
          purchase_order_items: values.items.map((item, i) => ({
            id: `edit-${i}`,
            quantity: item.quantity,
            cost: item.cost,
            products: { id: item.product_id, name: 'Product', master_sku: '' },
          })),
        } : po))
        setEditPO(null)
        toast.success('Purchase order updated')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleStatusChange = (poId: string, newStatus: PurchaseOrderStatus) => {
    startTransition(async () => {
      try {
        await updatePOStatus(poId, newStatus, newStatus === 'APPROVED' ? userName : undefined)
        setData(prev => prev.map(po => po.id === poId ? {
          ...po,
          status: newStatus,
          ...(newStatus === 'APPROVED' && userName ? { approved_by: userName } : {}),
        } : po))
        toast.success(`PO status updated to ${newStatus}`)
        if (newStatus === 'RECEIVED') toast.info('Inventory updated automatically')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleBulkAction = (status: PurchaseOrderStatus) => {
    startTransition(async () => {
      try {
        await bulkUpdatePOStatus(selectedIds, status)
        setData(prev => prev.map(po => selectedIds.includes(po.id) ? { ...po, status } : po))
        toast.success(`${selectedIds.length} POs updated to ${status}`)
        setSelectedIds([])
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handlePrint = (poId: string) => {
    window.open(`/purchase-orders/${poId}/print`, '_blank')
  }

  const selectedPOs = filtered.filter(po => selectedIds.includes(po.id))
  const allSameStatus = selectedPOs.length > 0 && selectedPOs.every(po => po.status === selectedPOs[0].status)
  const bulkStatus = allSameStatus ? selectedPOs[0].status : null

  const columns: ColumnDef<PORow>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={v => {
            table.toggleAllPageRowsSelected(!!v)
            setSelectedIds(v ? filtered.map(r => r.id) : [])
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={v => {
            setSelectedIds(prev => v ? [...prev, row.original.id] : prev.filter(id => id !== row.original.id))
          }}
          aria-label="Select row"
        />
      ),
      size: 40,
    },
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
      id: 'created_by',
      header: 'Nhân viên',
      cell: ({ row }) => (row.original as any).created_by_name
        ? <span className="text-xs text-muted-foreground">{(row.original as any).created_by_name}</span>
        : <span className="text-xs text-muted-foreground/40">—</span>,
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
            {row.original.status === 'DRAFT' && (
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setEditPO(row.original)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
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

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto">
            {bulkStatus === 'DRAFT' && (
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isPending}
                onClick={() => handleBulkAction('PENDING')}>
                Submit All
              </Button>
            )}
            {bulkStatus === 'PENDING' && (
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isPending}
                onClick={() => handleBulkAction('APPROVED')}>
                Approve All
              </Button>
            )}
            {(bulkStatus === 'DRAFT' || bulkStatus === 'PENDING' || bulkStatus === 'APPROVED') && (
              <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={isPending}
                onClick={() => handleBulkAction('CANCELLED')}>
                Cancel All
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={filtered} loading={isPending} />

      {/* Create PO Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <POForm
            suppliers={suppliers}
            products={products}
            companySettings={companySettings}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            loading={isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit PO Dialog */}
      <Dialog open={!!editPO} onOpenChange={v => !v && setEditPO(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order — PO-{editPO?.id.slice(-6).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {editPO && (
            <POForm
              suppliers={suppliers}
              products={products}
              companySettings={companySettings}
              onSubmit={handleEdit}
              onCancel={() => setEditPO(null)}
              loading={isPending}
              mode="edit"
              defaultValues={{
                supplier_id:     editPO.supplier_id,
                expected_date:   editPO.expected_date,
                notes:           editPO.notes ?? '',
                requisitioner:   editPO.requisitioner ?? '',
                shipped_via:     editPO.shipped_via ?? '',
                fob_point:       editPO.fob_point ?? '',
                payment_terms:   editPO.payment_terms ?? '',
                ship_to_name:    editPO.ship_to_name ?? '',
                ship_to_address: editPO.ship_to_address ?? '',
                vat_rate:        editPO.vat_rate ?? 0,
                shipping_fee:    editPO.shipping_fee ?? 0,
                items: editPO.purchase_order_items.map(i => ({
                  product_id: i.products.id,
                  quantity: i.quantity,
                  cost: i.cost,
                })),
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View PO Sheet */}
      <Sheet open={!!viewPO} onOpenChange={v => !v && setViewPO(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between pr-6">
              <SheetTitle>Purchase Order Details</SheetTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => viewPO && handlePrint(viewPO.id)}>
                <Printer className="w-3.5 h-3.5" />Print
              </Button>
            </div>
          </SheetHeader>
          {viewPO && (
            <>
              <div className="mt-6 space-y-4">
                {/* PO Number + Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">PO Number</p>
                    <p className="font-mono font-semibold">{viewPO.po_number ?? `PO-${viewPO.id.slice(-6).toUpperCase()}`}</p>
                  </div>
                  <POStatusBadge status={viewPO.status} />
                </div>

                <Separator />

                {/* Supplier + Dates */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <p className="font-medium">{viewPO.suppliers?.supplier_name}</p>
                    {viewPO.suppliers?.phone && <p className="text-xs text-muted-foreground">{viewPO.suppliers.phone}</p>}
                    {viewPO.suppliers?.email && <p className="text-xs text-muted-foreground">{viewPO.suppliers.email}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(viewPO.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Date</p>
                    <p className="font-medium">{formatDate(viewPO.expected_date)}</p>
                  </div>
                  {(viewPO as any).created_by_name && (
                    <div>
                      <p className="text-xs text-muted-foreground">Nhân viên lên đơn</p>
                      <p className="font-medium text-xs">{(viewPO as any).created_by_name}</p>
                    </div>
                  )}
                  {viewPO.approved_by && (
                    <div>
                      <p className="text-xs text-muted-foreground">Approved by</p>
                      <p className="font-medium text-xs">{viewPO.approved_by}</p>
                    </div>
                  )}
                </div>

                {/* Order Details */}
                {(viewPO.requisitioner || viewPO.shipped_via || viewPO.fob_point || viewPO.payment_terms) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Order Details</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {viewPO.requisitioner && (
                          <div>
                            <p className="text-xs text-muted-foreground">Requisitioner</p>
                            <p className="font-medium">{viewPO.requisitioner}</p>
                          </div>
                        )}
                        {viewPO.shipped_via && (
                          <div>
                            <p className="text-xs text-muted-foreground">Shipped Via</p>
                            <p className="font-medium">{viewPO.shipped_via}</p>
                          </div>
                        )}
                        {viewPO.fob_point && (
                          <div>
                            <p className="text-xs text-muted-foreground">F.O.B Point</p>
                            <p className="font-medium">{viewPO.fob_point}</p>
                          </div>
                        )}
                        {viewPO.payment_terms && (
                          <div>
                            <p className="text-xs text-muted-foreground">Payment Terms</p>
                            <p className="font-medium">{viewPO.payment_terms}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Ship To */}
                {(viewPO.ship_to_name || viewPO.ship_to_address) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ship To</p>
                      <div className="text-sm space-y-0.5">
                        {viewPO.ship_to_name    && <p className="font-medium">{viewPO.ship_to_name}</p>}
                        {viewPO.ship_to_address && <p className="text-muted-foreground">{viewPO.ship_to_address}</p>}
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                {viewPO.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{viewPO.notes}</p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Items */}
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

                  {/* Totals */}
                  <div className="pt-3 space-y-1.5 border-t mt-2">
                    {(() => {
                      const subtotal     = viewPO.purchase_order_items.reduce((s, i) => s + i.quantity * i.cost, 0)
                      const vatRate      = viewPO.vat_rate ?? 0
                      const vatAmt       = Math.round(subtotal * vatRate / 100)
                      const shippingFee  = viewPO.shipping_fee ?? 0
                      const total        = subtotal + vatAmt + shippingFee
                      return (
                        <>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          {vatRate > 0 && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>VAT ({vatRate}%)</span>
                              <span className="text-orange-600">+{formatCurrency(vatAmt)}</span>
                            </div>
                          )}
                          {shippingFee > 0 && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Phí vận chuyển</span>
                              <span>+{formatCurrency(shippingFee)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-bold pt-1 border-t">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  )
}
