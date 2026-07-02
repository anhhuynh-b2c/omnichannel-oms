'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PRODUCT_CATEGORIES, PRODUCT_MATERIALS, PRODUCT_UNITS } from '@/constants'
import type { Product, ProductWithInventory } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  master_sku: z.string().min(2, 'SKU is required').regex(/^[A-Z0-9-]+$/, 'SKU must be uppercase alphanumeric with hyphens'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  cost: z.number().min(0, 'Cost must be positive'),
  image_url: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  material: z.string().optional(),
  weight_g: z.number().int().min(0).optional().nullable(),
  length_cm: z.number().min(0).optional().nullable(),
  width_cm: z.number().min(0).optional().nullable(),
  height_cm: z.number().min(0).optional().nullable(),
  unit: z.enum(['piece', 'set', 'pair', 'pack']),
  barcode: z.string().optional(),
  default_safety_stock: z.number().int().min(0),
  initial_stock: z.number().int().min(0),
  stock_quantity: z.number().int().min(0).optional(),
})

export type ProductFormValues = z.infer<typeof schema>

interface ProductFormProps {
  defaultValues?: Partial<ProductWithInventory>
  onSubmit: (data: ProductFormValues) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ProductForm({ defaultValues, onSubmit, onCancel, loading }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      master_sku: defaultValues?.master_sku ?? '',
      category: defaultValues?.category ?? '',
      description: defaultValues?.description ?? '',
      price: defaultValues?.price ?? 0,
      cost: defaultValues?.cost ?? 0,
      image_url: defaultValues?.image_url ?? '',
      status: defaultValues?.status ?? 'ACTIVE',
      material: defaultValues?.material ?? '',
      weight_g: defaultValues?.weight_g ?? null,
      length_cm: defaultValues?.length_cm ?? null,
      width_cm: defaultValues?.width_cm ?? null,
      height_cm: defaultValues?.height_cm ?? null,
      unit: defaultValues?.unit ?? 'piece',
      barcode: defaultValues?.barcode ?? '',
      default_safety_stock: defaultValues?.default_safety_stock ?? 5,
      initial_stock: 0,
      stock_quantity: defaultValues?.inventory?.stock_quantity ?? 0,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
        {/* ── Basic Info ── */}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Product Name</FormLabel>
              <FormControl><Input placeholder="e.g. Teak Round Cutting Board 30cm" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="master_sku" render={({ field }) => (
            <FormItem>
              <FormLabel>Master SKU</FormLabel>
              <FormControl>
                <Input
                  placeholder="TEAK-CB-30-001"
                  {...field}
                  onChange={e => field.onChange(e.target.value.toUpperCase())}
                  disabled={!!defaultValues?.id}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* ── Pricing ── */}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel>Selling Price (VND)</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={1000}
                  {...field}
                  onChange={e => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="cost" render={({ field }) => (
            <FormItem>
              <FormLabel>Cost Price (VND)</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={1000}
                  {...field}
                  onChange={e => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* ── Physical Attributes ── */}
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground">Physical Attributes</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="material" render={({ field }) => (
              <FormItem>
                <FormLabel>Material</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_MATERIALS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="unit" render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="col-span-2 grid grid-cols-4 gap-2 items-end">
              <FormField control={form.control} name="weight_g" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (g)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="850"
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="length_cm" render={({ field }) => (
                <FormItem>
                  <FormLabel>L (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.1} placeholder="30"
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="width_cm" render={({ field }) => (
                <FormItem>
                  <FormLabel>W (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.1} placeholder="20"
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="height_cm" render={({ field }) => (
                <FormItem>
                  <FormLabel>H (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.1} placeholder="2"
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
        </div>

        {/* ── Warehouse ── */}
        <div>
          <p className="text-sm font-medium mb-3 text-muted-foreground">Warehouse</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="barcode" render={({ field }) => (
              <FormItem>
                <FormLabel>Barcode / EAN (optional)</FormLabel>
                <FormControl><Input placeholder="e.g. 8935001234567" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="default_safety_stock" render={({ field }) => (
              <FormItem>
                <FormLabel>Default Safety Stock</FormLabel>
                <FormControl>
                  <Input type="number" min={0}
                    {...field}
                    onChange={e => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {!defaultValues?.id ? (
              <FormField control={form.control} name="initial_stock" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Stock</FormLabel>
                  <FormControl>
                    <Input type="number" min={0}
                      {...field}
                      onChange={e => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <FormField control={form.control} name="stock_quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min={0}
                      {...field}
                      onChange={e => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </div>
        </div>

        {/* ── Other ── */}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="image_url" render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (optional)</FormLabel>
              <div className="flex gap-3 items-start">
                <FormControl className="flex-1">
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {field.value ? (
                    <img src={field.value} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <span className="text-lg">📦</span>
                  )}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Product description..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-2 shrink-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (defaultValues?.id ? 'Save Changes' : 'Create Product')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
