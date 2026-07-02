'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { saveCompanySettings } from '@/lib/actions/company-settings.actions'
import type { CompanySettings } from '@/types'

type FormState = Omit<CompanySettings, 'id' | 'updated_at'>

interface Props {
  initialData: CompanySettings | null
}

export function CompanySettingsForm({ initialData }: Props) {
  const [form, setForm] = useState<FormState>({
    company_name: initialData?.company_name ?? '',
    slogan:        initialData?.slogan ?? '',
    tax_id:        initialData?.tax_id ?? '',
    email:         initialData?.email ?? '',
    phone:         initialData?.phone ?? '',
    address:       initialData?.address ?? '',
    city:          initialData?.city ?? '',
    website:       initialData?.website ?? '',
    logo_url:      initialData?.logo_url ?? '',
    currency:      initialData?.currency ?? 'VND',
    timezone:      initialData?.timezone ?? 'Asia/Ho_Chi_Minh',
  })
  const [isPending, startTransition] = useTransition()

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = () => {
    startTransition(async () => {
      try {
        await saveCompanySettings(form)
        toast.success('Company settings saved')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identity</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label>Company Name <span className="text-destructive">*</span></Label>
            <Input value={form.company_name} onChange={set('company_name')} placeholder="My Retail Brand" />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label>Slogan / Tagline</Label>
            <Input value={form.slogan ?? ''} onChange={set('slogan')} placeholder="Quality Products & Services" />
          </div>
          <div className="space-y-1.5">
            <Label>Tax ID / MST</Label>
            <Input value={form.tax_id ?? ''} onChange={set('tax_id')} placeholder="0123456789" />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website ?? ''} onChange={set('website')} placeholder="https://myretail.vn" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="info@myretail.vn" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone ?? ''} onChange={set('phone')} placeholder="+84 28 1234 5678" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Address — dùng làm SHIP TO trong PO */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Address</p>
        <p className="text-xs text-muted-foreground mb-3">Địa chỉ này sẽ được dùng làm "Ship To" trong phiếu mua hàng (PO).</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Street Address</Label>
            <Textarea
              value={form.address ?? ''}
              onChange={set('address')}
              placeholder="123 Nguyen Hue, Quan 1"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label>City / Province</Label>
            <Input value={form.city ?? ''} onChange={set('city')} placeholder="TP. Ho Chi Minh" />
          </div>
        </div>
      </div>

      <Separator />

      {/* System */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">System</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input value={form.currency} onChange={set('currency')} placeholder="VND" />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={set('timezone')} placeholder="Asia/Ho_Chi_Minh" />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending || !form.company_name.trim()}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
