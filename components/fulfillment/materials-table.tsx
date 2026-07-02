'use client'

import { useState, useTransition } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Pencil, ArrowUpDown, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/data-table'
import { InventoryStatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import {
  createMaterial,
  updateMaterial,
  adjustMaterialStock,
  type PackagingMaterial,
} from '@/lib/actions/fulfillment.actions'

interface MaterialsTableProps {
  initialData: PackagingMaterial[]
  total: number
}

const MATERIAL_UNITS = ['cái', 'tờ', 'túi', 'hộp', 'cuộn', 'bộ', 'gói']

function MaterialForm({
  initial,
  onClose,
  onSuccess,
}: {
  initial?: PackagingMaterial | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    sku: initial?.sku ?? '',
    unit: initial?.unit ?? 'cái',
    stock_quantity: initial?.stock_quantity ?? 0,
    reorder_point: initial?.reorder_point ?? 20,
    safety_stock: initial?.safety_stock ?? 50,
    notes: initial?.notes ?? '',
  })

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.name || !form.sku) return toast.error('Tên và SKU không được để trống')
    startTransition(async () => {
      try {
        if (initial) {
          await updateMaterial(initial.id, { name: form.name, sku: form.sku, unit: form.unit, reorder_point: form.reorder_point, safety_stock: form.safety_stock, notes: form.notes })
        } else {
          await createMaterial({ ...form, stock_quantity: Number(form.stock_quantity), reorder_point: Number(form.reorder_point), safety_stock: Number(form.safety_stock) })
        }
        toast.success(initial ? 'Đã cập nhật vật tư' : 'Đã thêm vật tư mới')
        onSuccess()
        onClose()
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tên vật tư</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Hộp carton S" />
        </div>
        <div className="space-y-1.5">
          <Label>SKU</Label>
          <Input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="BOX-S-001" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Đơn vị</Label>
          <Select value={form.unit} onValueChange={v => set('unit', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MATERIAL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!initial && (
          <div className="space-y-1.5">
            <Label>Tồn kho ban đầu</Label>
            <Input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Điểm tái nhập</Label>
          <Input type="number" value={form.reorder_point} onChange={e => set('reorder_point', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Tồn kho an toàn</Label>
          <Input type="number" value={form.safety_stock} onChange={e => set('safety_stock', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Ghi chú</Label>
        <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Tuỳ chọn" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Huỷ</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Đang lưu...' : initial ? 'Cập nhật' : 'Thêm vật tư'}
        </Button>
      </div>
    </div>
  )
}

function AdjustDialog({ material, onClose }: { material: PackagingMaterial; onClose: () => void }) {
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('ADJUSTMENT')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    const change = parseInt(qty, 10)
    if (isNaN(change) || change === 0) return toast.error('Nhập số lượng hợp lệ')
    startTransition(async () => {
      try {
        await adjustMaterialStock(material.id, change, reason, note)
        toast.success(`Đã điều chỉnh ${change > 0 ? '+' : ''}${change} ${material.unit}`)
        onClose()
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{material.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{material.sku}</p>
        <p className="text-sm mt-1">Tồn kho hiện tại: <span className="font-semibold">{material.stock_quantity} {material.unit}</span></p>
      </div>
      <div className="space-y-1.5">
        <Label>Số lượng điều chỉnh (+ nhập / - xuất)</Label>
        <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="+100 hoặc -50" />
      </div>
      <div className="space-y-1.5">
        <Label>Lý do</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ADJUSTMENT">Điều chỉnh</SelectItem>
            <SelectItem value="PURCHASE">Nhập kho</SelectItem>
            <SelectItem value="RETURN">Trả hàng</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Ghi chú</Label>
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Tuỳ chọn" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Huỷ</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Đang lưu...' : 'Xác nhận'}
        </Button>
      </div>
    </div>
  )
}

export function MaterialsTable({ initialData, total }: MaterialsTableProps) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PackagingMaterial | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<PackagingMaterial | null>(null)

  const filtered = data.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.sku.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || m.stock_status === statusFilter
    return matchSearch && matchStatus
  })

  const columns: ColumnDef<PackagingMaterial>[] = [
    {
      accessorKey: 'name',
      header: 'Tên vật tư',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.original.sku}</p>
        </div>
      ),
    },
    {
      accessorKey: 'unit',
      header: 'Đơn vị',
      cell: ({ row }) => <span className="text-sm">{row.original.unit}</span>,
    },
    {
      accessorKey: 'stock_quantity',
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-medium" onClick={() => column.toggleSorting()}>
          Tồn kho <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className={cn('font-semibold', row.original.stock_status === 'OUT_OF_STOCK' && 'text-red-600', row.original.stock_status === 'LOW_STOCK' && 'text-yellow-600')}>
          {row.original.stock_quantity.toLocaleString()} {row.original.unit}
        </span>
      ),
    },
    {
      accessorKey: 'reorder_point',
      header: 'Điểm tái nhập',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.reorder_point}</span>,
    },
    {
      accessorKey: 'stock_status',
      header: 'Trạng thái',
      cell: ({ row }) => <InventoryStatusBadge status={row.original.stock_status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(row.original)}>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditTarget(row.original); setFormOpen(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Tìm tên, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="IN_STOCK">Còn hàng</SelectItem>
            <SelectItem value="LOW_STOCK">Sắp hết</SelectItem>
            <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditTarget(null); setFormOpen(true) }} className="ml-auto">
          <Plus className="h-4 w-4 mr-1.5" />
          Thêm vật tư
        </Button>
      </div>

      <DataTable columns={columns} data={filtered} />

      <Dialog open={formOpen} onOpenChange={v => { if (!v) { setFormOpen(false); setEditTarget(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Sửa vật tư' : 'Thêm vật tư đóng gói'}</DialogTitle>
          </DialogHeader>
          <MaterialForm
            initial={editTarget}
            onClose={() => { setFormOpen(false); setEditTarget(null) }}
            onSuccess={() => {}}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustTarget} onOpenChange={v => !v && setAdjustTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Điều chỉnh tồn kho</DialogTitle></DialogHeader>
          {adjustTarget && <AdjustDialog material={adjustTarget} onClose={() => setAdjustTarget(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
