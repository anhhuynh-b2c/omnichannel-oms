'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InventoryStatusBadge } from '@/components/shared/status-badge'
import {
  getBomForProduct,
  upsertBomEntry,
  deleteBomEntry,
  type BomEntry,
  type PackagingMaterial,
} from '@/lib/actions/fulfillment.actions'

interface ProductBomSectionProps {
  productId: string
  materials: PackagingMaterial[]
}

function AddRuleDialog({
  productId,
  materials,
  onClose,
  onAdded,
}: {
  productId: string
  materials: PackagingMaterial[]
  onClose: () => void
  onAdded: (entry: BomEntry) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    material_id: '',
    qty_per_unit: '1',
    min_order_qty: '1',
    max_order_qty: '',
    notes: '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const selectedMat = materials.find(m => m.id === form.material_id)

  const handleSubmit = () => {
    if (!form.material_id) return toast.error('Chọn vật tư')
    if (!form.qty_per_unit || Number(form.qty_per_unit) < 1) return toast.error('Số lượng phải >= 1')
    startTransition(async () => {
      try {
        await upsertBomEntry({
          product_id: productId,
          material_id: form.material_id,
          qty_per_unit: Number(form.qty_per_unit),
          min_order_qty: Number(form.min_order_qty) || 1,
          max_order_qty: form.max_order_qty ? Number(form.max_order_qty) : null,
          notes: form.notes || undefined,
        })
        const bom = await getBomForProduct(productId)
        toast.success('Đã thêm quy tắc đóng gói')
        const added = bom.find(e => e.material_id === form.material_id && e.min_order_qty === (Number(form.min_order_qty) || 1))
        if (added) onAdded(added)
        onClose()
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Vật tư đóng gói</Label>
        <Select value={form.material_id} onValueChange={v => set('material_id', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn vật tư..." />
          </SelectTrigger>
          <SelectContent>
            {materials.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Chưa có vật tư nào. Thêm ở mục Fulfillment.
              </div>
            ) : materials.map(m => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  {m.name}
                  <span className="text-xs text-muted-foreground font-mono">({m.sku})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedMat && (
          <p className="text-xs text-muted-foreground">
            Tồn kho: <span className="font-medium">{selectedMat.stock_quantity} {selectedMat.unit}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>SL / sản phẩm</Label>
          <Input type="number" min={1} value={form.qty_per_unit} onChange={e => set('qty_per_unit', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Đơn có từ (SL SP)</Label>
          <Input type="number" min={1} value={form.min_order_qty} onChange={e => set('min_order_qty', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Đến (để trống = ∞)</Label>
          <Input type="number" value={form.max_order_qty} onChange={e => set('max_order_qty', e.target.value)} placeholder="∞" />
        </div>
      </div>

      <p className="text-xs bg-muted rounded p-2 text-muted-foreground leading-relaxed">
        <strong>Ví dụ thớt to:</strong> SL/SP = 1 · từ 1 · đến trống → mỗi đơn (bất kể số lượng) dùng 1 hộp này.<br />
        <strong>Ví dụ combo:</strong> SL/SP = 1 · từ 1 · đến 2 → chỉ áp dụng khi đơn có 1–2 sản phẩm.
      </p>

      <div className="space-y-1.5">
        <Label>Ghi chú <span className="text-muted-foreground">(tuỳ chọn)</span></Label>
        <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="VD: Hộp size L cho thớt 35cm+" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Huỷ</Button>
        <Button onClick={handleSubmit} disabled={isPending || !form.material_id}>
          {isPending ? 'Đang lưu...' : 'Thêm quy tắc'}
        </Button>
      </div>
    </div>
  )
}

export function ProductBomSection({ productId, materials }: ProductBomSectionProps) {
  const [bom, setBom] = useState<BomEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getBomForProduct(productId)
      .then(setBom)
      .catch(() => setBom([]))
      .finally(() => setLoading(false))
  }, [productId])

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteBomEntry(id)
        setBom(prev => prev.filter(e => e.id !== id))
        toast.success('Đã xoá quy tắc')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Đang tải...</p>
  }

  return (
    <div className="space-y-3">
      {bom.length === 0 ? (
        <div className="text-center py-6 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Chưa có công thức đóng gói nào</p>
          <p className="text-xs text-muted-foreground mt-1">Thêm quy tắc để hệ thống tự trừ vật tư khi đóng gói đơn</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Vật tư</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">SL / SP</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Khi đơn có</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Tồn kho</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {bom.map(entry => {
                const mat = entry.packaging_materials
                const lowStock = mat?.stock_status !== 'IN_STOCK'
                return (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {lowStock && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                        <div>
                          <p className="font-medium leading-tight">{mat?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{mat?.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold">
                      {entry.qty_per_unit} <span className="text-muted-foreground font-normal text-xs">{mat?.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                      {entry.min_order_qty === 1 && !entry.max_order_qty
                        ? 'Mọi đơn'
                        : `${entry.min_order_qty}–${entry.max_order_qty ?? '∞'} SP`}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <InventoryStatusBadge status={mat?.stock_status ?? 'IN_STOCK'} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        onClick={() => handleDelete(entry.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Thêm quy tắc đóng gói
      </Button>

      <Dialog open={addOpen} onOpenChange={v => !v && setAddOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm quy tắc đóng gói</DialogTitle>
          </DialogHeader>
          <AddRuleDialog
            productId={productId}
            materials={materials}
            onClose={() => setAddOpen(false)}
            onAdded={entry => setBom(prev => [...prev, entry])}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
