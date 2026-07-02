'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InventoryStatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import {
  getBomForProduct,
  upsertBomEntry,
  deleteBomEntry,
  type BomEntry,
  type PackagingMaterial,
} from '@/lib/actions/fulfillment.actions'

interface Product {
  id: string
  name: string
  master_sku: string
  category: string
}

interface BomManagerProps {
  products: Product[]
  materials: PackagingMaterial[]
}

function BomRuleForm({
  productId,
  materials,
  onClose,
  onSuccess,
}: {
  productId: string
  materials: PackagingMaterial[]
  onClose: () => void
  onSuccess: (entry: BomEntry) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    material_id: '',
    qty_per_unit: 1,
    min_order_qty: 1,
    max_order_qty: '',
    notes: '',
  })
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.material_id) return toast.error('Chọn vật tư')
    startTransition(async () => {
      try {
        await upsertBomEntry({
          product_id: productId,
          material_id: form.material_id,
          qty_per_unit: Number(form.qty_per_unit),
          min_order_qty: Number(form.min_order_qty),
          max_order_qty: form.max_order_qty ? Number(form.max_order_qty) : null,
          notes: form.notes || undefined,
        })
        const fresh = await getBomForProduct(productId)
        toast.success('Đã lưu công thức đóng gói')
        onSuccess(fresh[fresh.length - 1])
        onClose()
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Vật tư</Label>
        <Select value={form.material_id} onValueChange={v => set('material_id', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn vật tư..." />
          </SelectTrigger>
          <SelectContent>
            {materials.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} <span className="text-muted-foreground ml-1 text-xs">({m.sku})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>SL / đơn vị sản phẩm</Label>
          <Input type="number" min={1} value={form.qty_per_unit} onChange={e => set('qty_per_unit', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>SL đơn tối thiểu</Label>
          <Input type="number" min={1} value={form.min_order_qty} onChange={e => set('min_order_qty', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>SL đơn tối đa</Label>
          <Input type="number" value={form.max_order_qty} onChange={e => set('max_order_qty', e.target.value)} placeholder="Không giới hạn" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-muted rounded-md p-2">
        Ví dụ: SL/đơn vị = 1, tối thiểu = 1, tối đa = trống → mỗi sản phẩm trong đơn dùng 1 vật tư này.<br />
        Nếu tối đa = 2 → chỉ áp dụng khi đơn có 1–2 sản phẩm.
      </p>

      <div className="space-y-1.5">
        <Label>Ghi chú</Label>
        <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="VD: Chỉ áp dụng cho thớt to" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Huỷ</Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Đang lưu...' : 'Thêm quy tắc'}
        </Button>
      </div>
    </div>
  )
}

function ProductBomCard({
  product,
  materials,
  initialBom,
}: {
  product: Product
  materials: PackagingMaterial[]
  initialBom: BomEntry[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [bom, setBom] = useState(initialBom)
  const [addOpen, setAddOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

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

  const lowStockWarning = bom.some(e => e.packaging_materials?.stock_status !== 'IN_STOCK')

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{product.master_sku}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lowStockWarning && (
            <span className="flex items-center gap-1 text-xs text-yellow-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Vật tư sắp hết
            </span>
          )}
          <span className="text-xs text-muted-foreground">{bom.length} quy tắc</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-background">
          {bom.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Chưa có công thức đóng gói nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Vật tư</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">SL / đơn vị SP</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Áp dụng khi đơn có</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Tồn kho</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {bom.map(entry => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{entry.packaging_materials?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{entry.packaging_materials?.sku}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold">{entry.qty_per_unit} {entry.packaging_materials?.unit}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">
                      {entry.min_order_qty === 1 && !entry.max_order_qty
                        ? 'Mọi đơn'
                        : `${entry.min_order_qty}–${entry.max_order_qty ?? '∞'} sản phẩm`}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <InventoryStatusBadge status={entry.packaging_materials?.stock_status ?? 'IN_STOCK'} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-4 py-3 border-t border-border">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Thêm quy tắc
            </Button>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={v => !v && setAddOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm vật tư cho: {product.name}</DialogTitle>
          </DialogHeader>
          <BomRuleForm
            productId={product.id}
            materials={materials}
            onClose={() => setAddOpen(false)}
            onSuccess={entry => setBom(prev => [...prev, entry])}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function BomManager({ products, materials }: BomManagerProps) {
  const [search, setSearch] = useState('')

  const filtered = products.filter(
    p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.master_sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Tìm sản phẩm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <p className="text-sm text-muted-foreground ml-auto">{filtered.length} sản phẩm</p>
      </div>

      <div className="space-y-2">
        {filtered.map(product => (
          <ProductBomCard
            key={product.id}
            product={product}
            materials={materials}
            initialBom={[]}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Không tìm thấy sản phẩm nào</p>
        )}
      </div>
    </div>
  )
}
