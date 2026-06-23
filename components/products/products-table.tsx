'use client'

import { useState, useTransition } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Edit, Trash2, Plus, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { ProductForm, type ProductFormValues } from './product-form'
import { createProduct, updateProduct, deleteProduct } from '@/lib/actions/product.actions'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { PRODUCT_CATEGORIES } from '@/constants'
import type { Product } from '@/types'
import { cn } from '@/lib/utils'

interface ProductWithInventory extends Product {
  inventory?: {
    stock_quantity: number
    reorder_point: number
    safety_stock: number
    inventory_status: string
  } | null
}

interface ProductsTableProps {
  initialData: ProductWithInventory[]
  total: number
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  ARCHIVED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

export function ProductsTable({ initialData, total }: ProductsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [data, setData] = useState(initialData)
  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductWithInventory | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = data.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.master_sku.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter
    return matchSearch && matchStatus && matchCat
  })

  const columns: ColumnDef<ProductWithInventory>[] = [
    {
      accessorKey: 'image_url',
      header: 'Image',
      cell: ({ row }) => (
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {row.original.image_url ? (
            <img src={row.original.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">📦</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Product Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.category}</p>
        </div>
      ),
    },
    {
      accessorKey: 'master_sku',
      header: 'Master SKU',
      cell: ({ row }) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{row.original.master_sku}</span>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => <span className="text-sm font-medium">{formatCurrency(row.original.price)}</span>,
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatCurrency(row.original.cost)}</span>,
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const inv = row.original.inventory
        if (!inv) return <span className="text-muted-foreground text-xs">—</span>
        const isLow = inv.stock_quantity <= inv.reorder_point
        return (
          <span className={cn('font-medium text-sm', isLow ? 'text-red-600' : 'text-foreground')}>
            {formatNumber(inv.stock_quantity)}
          </span>
        )
      },
    },
    {
      id: 'safety_stock',
      header: 'Safety Stock',
      cell: ({ row }) => {
        const inv = row.original.inventory
        if (!inv) return <span className="text-muted-foreground text-xs">—</span>
        return <span className="text-sm text-muted-foreground">{formatNumber(inv.safety_stock)}</span>
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={cn(
          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
          STATUS_COLORS[row.original.status]
        )}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setEditProduct(row.original)}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteId(row.original.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const handleCreate = async (values: ProductFormValues) => {
    startTransition(async () => {
      try {
        const product = await createProduct(values)
        setData(prev => [{ ...product, inventory: null }, ...prev])
        setCreateOpen(false)
        toast.success('Product created successfully')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleEdit = async (values: ProductFormValues) => {
    if (!editProduct) return
    startTransition(async () => {
      try {
        await updateProduct(editProduct.id, values)
        setData(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...values } : p))
        setEditProduct(null)
        toast.success('Product updated successfully')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      try {
        await deleteProduct(deleteId)
        setData(prev => prev.filter(p => p.id !== deleteId))
        setDeleteId(null)
        toast.success('Product deleted')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            className="pl-8 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-32">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {PRODUCT_CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-9" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Product
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {total} products
      </div>

      <DataTable columns={columns} data={filtered} loading={isPending} />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <ProductForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={v => !v && setEditProduct(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <ProductForm
              defaultValues={editProduct}
              onSubmit={handleEdit}
              onCancel={() => setEditProduct(null)}
              loading={isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product and its inventory record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
