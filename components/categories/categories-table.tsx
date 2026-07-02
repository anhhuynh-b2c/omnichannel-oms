'use client'

import { useState, useTransition } from 'react'
import { Edit, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createCategory, updateCategory, deleteCategory } from '@/lib/actions/category.actions'

interface Category {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

interface CategoriesTableProps {
  initialData: Category[]
}

interface FormState {
  name: string
  description: string
}

export function CategoriesTable({ initialData }: CategoriesTableProps) {
  const [data, setData] = useState(initialData)
  const [createOpen, setCreateOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', description: '' })
  const [isPending, startTransition] = useTransition()

  const openCreate = () => {
    setForm({ name: '', description: '' })
    setCreateOpen(true)
  }

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, description: cat.description ?? '' })
    setEditCategory(cat)
  }

  const handleCreate = () => {
    if (!form.name.trim()) return
    startTransition(async () => {
      try {
        await createCategory({ name: form.name.trim(), description: form.description.trim() || undefined })
        const newCat: Category = {
          id: crypto.randomUUID(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          sort_order: data.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setData(prev => [...prev, newCat])
        setCreateOpen(false)
        toast.success('Category created successfully')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleEdit = () => {
    if (!editCategory || !form.name.trim()) return
    startTransition(async () => {
      try {
        await updateCategory(editCategory.id, { name: form.name.trim(), description: form.description.trim() || undefined })
        setData(prev => prev.map(c => c.id === editCategory.id
          ? { ...c, name: form.name.trim(), description: form.description.trim() || null }
          : c
        ))
        setEditCategory(null)
        toast.success('Category updated successfully')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      try {
        await deleteCategory(deleteId)
        setData(prev => prev.filter(c => c.id !== deleteId))
        setDeleteId(null)
        toast.success('Category deleted')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} categories</p>
        <Button size="sm" className="h-9" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />New Category
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground"># Products</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No categories found</td>
              </tr>
            ) : (
              data.map((cat, i) => (
                <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">0</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(cat.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="create-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Kitchen Utensils"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending || !form.name.trim()}>
              {isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCategory} onOpenChange={v => !v && setEditCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategory(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isPending || !form.name.trim()}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category. This action cannot be undone.
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
