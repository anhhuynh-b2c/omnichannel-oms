'use client'

import { useState, useTransition } from 'react'
import { Edit, Trash2, Plus, Building2, Phone, Mail, MapPin } from 'lucide-react'
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
import { createSupplier, updateSupplier, deleteSupplier } from '@/lib/actions/supplier.actions'

interface SupplierRow {
  id: string
  supplier_name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
  purchase_orders?: { id: string }[]
}

interface FormState {
  supplier_name: string
  phone: string
  email: string
  address: string
}

const EMPTY_FORM: FormState = { supplier_name: '', phone: '', email: '', address: '' }

export function SuppliersTable({ initialData }: { initialData: SupplierRow[] }) {
  const [data, setData] = useState(initialData)
  const [createOpen, setCreateOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<SupplierRow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const openCreate = () => { setForm(EMPTY_FORM); setCreateOpen(true) }
  const openEdit = (s: SupplierRow) => {
    setForm({ supplier_name: s.supplier_name, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '' })
    setEditSupplier(s)
  }

  const handleCreate = () => {
    if (!form.supplier_name.trim()) return
    startTransition(async () => {
      try {
        await createSupplier({
          supplier_name: form.supplier_name.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
        })
        setData(prev => [...prev, {
          id: crypto.randomUUID(),
          supplier_name: form.supplier_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          created_at: new Date().toISOString(),
          purchase_orders: [],
        }])
        setCreateOpen(false)
        toast.success('Supplier created')
      } catch (e) { toast.error((e as Error).message) }
    })
  }

  const handleEdit = () => {
    if (!editSupplier || !form.supplier_name.trim()) return
    startTransition(async () => {
      try {
        await updateSupplier(editSupplier.id, {
          supplier_name: form.supplier_name.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
        })
        setData(prev => prev.map(s => s.id === editSupplier.id ? {
          ...s,
          supplier_name: form.supplier_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
        } : s))
        setEditSupplier(null)
        toast.success('Supplier updated')
      } catch (e) { toast.error((e as Error).message) }
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      try {
        await deleteSupplier(deleteId)
        setData(prev => prev.filter(s => s.id !== deleteId))
        setDeleteId(null)
        toast.success('Supplier deleted')
      } catch (e) { toast.error((e as Error).message) }
    })
  }

  const deleteTarget = data.find(s => s.id === deleteId)
  const poCount = deleteTarget?.purchase_orders?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} suppliers</p>
        <Button size="sm" className="h-9" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />New Supplier
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Address</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">POs</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No suppliers yet</p>
                </td>
              </tr>
            ) : data.map(s => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.supplier_name}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <div className="space-y-0.5">
                    {s.phone && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Phone className="w-3 h-3" />{s.phone}
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Mail className="w-3 h-3" />{s.email}
                      </div>
                    )}
                    {!s.phone && !s.email && <span className="text-xs">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {s.address ? (
                    <div className="flex items-start gap-1.5 text-xs">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{s.address}</span>
                    </div>
                  ) : <span className="text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {s.purchase_orders?.length ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(s.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
          <SupplierFormFields form={form} set={set} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending || !form.supplier_name.trim()}>
              {isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editSupplier} onOpenChange={v => !v && setEditSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
          <SupplierFormFields form={form} set={set} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSupplier(null)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isPending || !form.supplier_name.trim()}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              {poCount > 0
                ? `This supplier has ${poCount} purchase order(s). Deleting it may fail if there are linked records.`
                : 'This will permanently delete the supplier. This action cannot be undone.'}
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

function SupplierFormFields({
  form,
  set,
}: {
  form: FormState
  set: (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Name <span className="text-destructive">*</span></Label>
        <Input value={form.supplier_name} onChange={set('supplier_name')} placeholder="e.g. ABC Trading Co." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={set('phone')} placeholder="0901 234 567" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={set('email')} placeholder="supplier@example.com" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Address</Label>
        <Textarea value={form.address} onChange={set('address')} placeholder="Street, District, City..." rows={2} className="resize-none" />
      </div>
    </div>
  )
}
