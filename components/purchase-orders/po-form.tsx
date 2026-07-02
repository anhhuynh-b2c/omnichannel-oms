'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { Supplier, CompanySettings } from '@/types'
import { formatCurrency } from '@/lib/utils/format'

const VAT_RATES = [
  { value: '0',  label: '0% — Miễn thuế' },
  { value: '5',  label: '5%' },
  { value: '8',  label: '8%' },
  { value: '10', label: '10%' },
]

const schema = z.object({
  supplier_id:      z.string().min(1, 'Supplier is required'),
  expected_date:    z.string().min(1, 'Expected date is required'),
  requisitioner:    z.string().optional(),
  shipped_via:      z.string().optional(),
  fob_point:        z.string().optional(),
  payment_terms:    z.string().optional(),
  ship_to_name:     z.string().optional(),
  ship_to_address:  z.string().optional(),
  vat_rate:         z.number().min(0).max(100).default(0),
  shipping_fee:     z.number().min(0).default(0),
  notes:            z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().min(1, 'Product is required'),
    quantity:   z.number().int().min(1, 'Quantity must be at least 1'),
    cost:       z.number().min(0),
  })).min(1, 'Add at least one item'),
})

export type POFormValues = z.infer<typeof schema>

interface ProductOption {
  id: string
  name: string
  master_sku: string
  cost?: number | null
}

interface POFormProps {
  suppliers:      Supplier[]
  products?:      ProductOption[]
  companySettings?: CompanySettings | null
  onSubmit:       (data: POFormValues) => Promise<void>
  onCancel:       () => void
  loading?:       boolean
  defaultValues?: Partial<POFormValues>
  mode?:          'create' | 'edit'
}

export function POForm({
  suppliers, products = [], companySettings, onSubmit, onCancel, loading, defaultValues, mode = 'create',
}: POFormProps) {
  const shipToName    = companySettings?.company_name ?? ''
  const shipToAddress = [companySettings?.address, companySettings?.city].filter(Boolean).join(', ')

  const form = useForm<POFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      supplier_id:     defaultValues?.supplier_id     ?? '',
      expected_date:   defaultValues?.expected_date   ?? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      requisitioner:   defaultValues?.requisitioner   ?? '',
      shipped_via:     defaultValues?.shipped_via     ?? '',
      fob_point:       defaultValues?.fob_point       ?? '',
      payment_terms:   defaultValues?.payment_terms   ?? '',
      vat_rate:        defaultValues?.vat_rate        ?? 0,
      shipping_fee:    defaultValues?.shipping_fee    ?? 0,
      ship_to_name:    defaultValues?.ship_to_name    ?? shipToName,
      ship_to_address: defaultValues?.ship_to_address ?? shipToAddress,
      notes:           defaultValues?.notes           ?? '',
      items:           defaultValues?.items           ?? [{ product_id: '', quantity: 1, cost: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const watchItems    = form.watch('items')
  const watchShipping = form.watch('shipping_fee') ?? 0
  const totalCost = watchItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.cost || 0), 0)

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) form.setValue(`items.${index}.cost`, product.cost ?? 0)
  }

  const F = ({ name, label, placeholder, type = 'text', span }: {
    name: keyof POFormValues
    label: string
    placeholder?: string
    type?: string
    span?: boolean
  }) => (
    <FormField control={form.control} name={name as any} render={({ field }) => (
      <FormItem className={span ? 'col-span-2' : ''}>
        <FormLabel>{label}</FormLabel>
        <FormControl><Input type={type} placeholder={placeholder} {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Supplier & Date ── */}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="supplier_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <F name="expected_date" label="Expected Delivery Date" type="date" />
        </div>

        <Separator />

        {/* ── PO Meta ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Order Details</p>
          <div className="grid grid-cols-2 gap-4">
            <F name="requisitioner"  label="Requisitioner"    placeholder="Người yêu cầu mua hàng" />
            <F name="shipped_via"    label="Shipped Via"       placeholder="e.g. Air Freight, Road, Sea" />
            <F name="fob_point"      label="F.O.B Point"       placeholder="e.g. Origin, Destination" />
            <F name="payment_terms"  label="Payment Terms"     placeholder="e.g. Net 30, COD, 50% Advance" />
          </div>
        </div>

        <Separator />

        {/* ── Ship To ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ship To</p>
          <p className="text-xs text-muted-foreground mb-3">Mặc định lấy từ thông tin công ty trong Cài đặt.</p>
          <div className="grid grid-cols-2 gap-4">
            <F name="ship_to_name"    label="Recipient / Company Name" placeholder="Company name" />
            <FormField control={form.control} name="ship_to_address" render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="Full delivery address..." className="resize-none h-16 text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <Separator />

        {/* ── Items ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Order Items</p>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={() => append({ product_id: '', quantity: 1, cost: 0 })}>
              <Plus className="w-3 h-3" />Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  <FormField control={form.control} name={`items.${index}.product_id`} render={({ field: f }) => (
                    <FormItem>
                      {index === 0 && <FormLabel className="text-xs">Product</FormLabel>}
                      <Select onValueChange={v => { f.onChange(v); handleProductChange(index, v) }} value={f.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="text-xs">{p.name} <span className="text-muted-foreground">({p.master_sku})</span></span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="col-span-3">
                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => (
                    <FormItem>
                      {index === 0 && <FormLabel className="text-xs">Quantity</FormLabel>}
                      <FormControl>
                        <Input type="number" min={1} className="h-8 text-xs" {...f} onChange={e => f.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="col-span-3">
                  <FormField control={form.control} name={`items.${index}.cost`} render={({ field: f }) => (
                    <FormItem>
                      {index === 0 && <FormLabel className="text-xs">Unit Cost</FormLabel>}
                      <FormControl>
                        <Input type="number" min={0} step={1000} className="h-8 text-xs" {...f} onChange={e => f.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className={`col-span-1 flex items-center justify-center ${index === 0 ? 'mt-6' : ''}`}>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => remove(index)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalCost > 0 && (
            <div className="mt-3 pt-3 border-t space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(totalCost)}</span>
              </div>
              {(form.watch('vat_rate') ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>VAT ({form.watch('vat_rate')}%)</span>
                  <span>{formatCurrency(totalCost * (form.watch('vat_rate') ?? 0) / 100)}</span>
                </div>
              )}
              {watchShipping > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Phí vận chuyển</span>
                  <span>{formatCurrency(watchShipping)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t">
                <span>Total</span>
                <span>{formatCurrency(totalCost * (1 + (form.watch('vat_rate') ?? 0) / 100) + watchShipping)}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* ── VAT, Shipping & Notes ── */}
        <div className="grid grid-cols-2 gap-4 items-start">
          <FormField control={form.control} name="shipping_fee" render={({ field }) => (
            <FormItem>
              <FormLabel>Phí vận chuyển</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={1000} placeholder="0"
                  {...field} onChange={e => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="vat_rate" render={({ field }) => (
            <FormItem>
              <FormLabel>VAT Rate</FormLabel>
              <Select
                value={String(field.value ?? 0)}
                onValueChange={v => field.onChange(Number(v))}
              >
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select VAT rate" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VAT_RATES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Add notes..." className="resize-none h-10 text-sm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? (mode === 'edit' ? 'Saving...' : 'Creating...')
              : (mode === 'edit' ? 'Save Changes' : 'Create Purchase Order')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
