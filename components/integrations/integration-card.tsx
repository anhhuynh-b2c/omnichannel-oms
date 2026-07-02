'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plug, PlugZap, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ChannelName } from '@/types'
import { CHANNEL_COLORS } from '@/constants'
import { ChannelIcon } from '@/components/shared/channel-icon'

type Status = 'CONNECTED' | 'DISCONNECTED' | 'ERROR'

interface IntegrationCardProps {
  id: string
  name: ChannelName
  icon: string
  status: Status
}

// ─── Per-channel field config ──────────────────────────────────────────────────

type FieldType = 'text' | 'password' | 'select' | 'readonly'

interface FieldDef {
  name: string
  label: string
  placeholder?: string
  type: FieldType
  options?: { value: string; label: string }[]
  description?: string
  required?: boolean
}

interface ChannelConfig {
  fields: FieldDef[]
  webhookPath: string   // readonly — user copies to partner portal
  description: string
}

const CHANNEL_CONFIG: Partial<Record<ChannelName, ChannelConfig>> = {
  Shopee: {
    description: 'Nhập Partner credentials từ Shopee Open Platform.',
    webhookPath: '/api/webhooks/shopee',
    fields: [
      { name: 'partner_id',    label: 'Partner ID',    placeholder: '123456',              type: 'text',     required: true },
      { name: 'partner_key',   label: 'Partner Key',   placeholder: 'Nhập partner key',    type: 'password', required: true },
      { name: 'shop_id',       label: 'Shop ID',       placeholder: 'ID shop của bạn',     type: 'text',     required: true },
      { name: 'access_token',  label: 'Access Token',  placeholder: 'Nhập access token',   type: 'password', required: true, description: 'Lấy qua OAuth flow tại Partner Portal' },
    ],
  },
  'TikTok Shop': {
    description: 'Nhập App credentials từ TikTok Shop Partner Center.',
    webhookPath: '/api/webhooks/tiktok',
    fields: [
      { name: 'app_key',      label: 'App Key',      placeholder: 'Nhập app key',       type: 'text',     required: true },
      { name: 'app_secret',   label: 'App Secret',   placeholder: 'Nhập app secret',    type: 'password', required: true },
      { name: 'shop_id',      label: 'Shop ID',      placeholder: 'ID shop TikTok',     type: 'text',     required: true },
      { name: 'shop_cipher',  label: 'Shop Cipher',  placeholder: 'Nhập shop cipher',   type: 'password', required: true, description: 'Nhận được sau khi merchant authorize' },
    ],
  },
  Lazada: {
    description: 'Nhập App credentials từ Lazada Open Platform.',
    webhookPath: '/api/webhooks/lazada',
    fields: [
      { name: 'app_key',      label: 'App Key',      placeholder: 'Nhập app key',    type: 'text',     required: true },
      { name: 'app_secret',   label: 'App Secret',   placeholder: 'Nhập app secret', type: 'password', required: true },
      { name: 'access_token', label: 'Access Token', placeholder: 'Nhập token',      type: 'password', required: true, description: 'Lấy qua OAuth tại open.lazada.com' },
      {
        name: 'region', label: 'Region', type: 'select', required: true,
        options: [
          { value: 'vn', label: '🇻🇳 Việt Nam (api.lazada.vn)' },
          { value: 'sg', label: '🇸🇬 Singapore (api.lazada.sg)' },
          { value: 'th', label: '🇹🇭 Thailand (api.lazada.co.th)' },
          { value: 'my', label: '🇲🇾 Malaysia (api.lazada.com.my)' },
          { value: 'ph', label: '🇵🇭 Philippines (api.lazada.com.ph)' },
          { value: 'id', label: '🇮🇩 Indonesia (api.lazada.co.id)' },
        ],
      },
    ],
  },
  Facebook: {
    description: 'Nhập Meta App credentials từ Facebook Developers.',
    webhookPath: '/api/webhooks/facebook',
    fields: [
      { name: 'app_id',        label: 'App ID',          placeholder: 'Meta App ID',          type: 'text',     required: true },
      { name: 'app_secret',    label: 'App Secret',      placeholder: 'Meta App Secret',       type: 'password', required: true },
      { name: 'page_id',       label: 'Page ID',         placeholder: 'Facebook Page ID',      type: 'text',     required: true },
      { name: 'access_token',  label: 'Page Access Token', placeholder: 'Long-lived token',    type: 'password', required: true, description: 'Long-lived token (60 ngày), cần refresh định kỳ' },
      { name: 'catalog_id',    label: 'Catalog ID',      placeholder: 'Commerce Catalog ID',   type: 'text',     required: false },
      { name: 'verify_token',  label: 'Verify Token',    placeholder: 'Tự đặt chuỗi bất kỳ',  type: 'text',     required: true, description: 'Dùng để xác thực webhook từ Facebook' },
    ],
  },
  Instagram: {
    description: 'Instagram Shopping dùng chung Meta App với Facebook.',
    webhookPath: '/api/webhooks/facebook',
    fields: [
      { name: 'app_id',       label: 'App ID',            placeholder: 'Meta App ID',        type: 'text',     required: true },
      { name: 'app_secret',   label: 'App Secret',        placeholder: 'Meta App Secret',    type: 'password', required: true },
      { name: 'ig_user_id',   label: 'Instagram User ID', placeholder: 'ID tài khoản IG',   type: 'text',     required: true },
      { name: 'access_token', label: 'Access Token',      placeholder: 'Long-lived token',   type: 'password', required: true, description: 'Long-lived token từ Facebook Graph API' },
    ],
  },
  Website: {
    description: 'Kết nối website/CMS của bạn qua webhook.',
    webhookPath: '/api/webhooks/website',
    fields: [
      { name: 'webhook_secret', label: 'Webhook Secret', placeholder: 'Chuỗi bí mật để xác thực request', type: 'password', required: true, description: 'Tự tạo và cấu hình vào CMS (WooCommerce/Shopify)' },
    ],
  },
  Zalo: {
    description: 'Nhập thông tin từ Zalo Official Account và Zalo Developer.',
    webhookPath: '/api/webhooks/zalo',
    fields: [
      { name: 'app_id',     label: 'App ID',     placeholder: 'Zalo App ID',       type: 'text',     required: true },
      { name: 'app_secret', label: 'App Secret', placeholder: 'Zalo App Secret',   type: 'password', required: true },
      { name: 'oa_token',   label: 'OA Access Token', placeholder: 'Official Account token', type: 'password', required: true, description: 'Token của Official Account, hết hạn sau 90 ngày' },
    ],
  },
}

const DEFAULT_CONFIG: ChannelConfig = {
  description: 'Nhập API credentials để kết nối kênh bán hàng.',
  webhookPath: '/api/webhooks/channel',
  fields: [
    { name: 'api_key',    label: 'API Key',    placeholder: 'Nhập API key',    type: 'text',     required: true },
    { name: 'api_secret', label: 'API Secret', placeholder: 'Nhập API secret', type: 'password', required: true },
  ],
}

// ─── Dynamic Zod schema ────────────────────────────────────────────────────────

function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of fields) {
    shape[f.name] = f.required
      ? z.string().min(1, `${f.label} là bắt buộc`)
      : z.string().optional()
  }
  return z.object(shape)
}

// ─── Copy button for readonly webhook URL ─────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: typeof Plug }> = {
  CONNECTED:    { label: 'Connected',    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', icon: PlugZap },
  DISCONNECTED: { label: 'Disconnected', color: 'text-gray-500 bg-gray-50 dark:bg-gray-900/30',         icon: Plug },
  ERROR:        { label: 'Error',        color: 'text-red-600 bg-red-50 dark:bg-red-950/30',            icon: AlertCircle },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegrationCard({ id, name, icon, status: initialStatus }: IntegrationCardProps) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const cfg = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon
  const channelColor = CHANNEL_COLORS[name] ?? '#6366f1'
  const channelCfg = CHANNEL_CONFIG[name] ?? DEFAULT_CONFIG

  const schema = buildSchema(channelCfg.fields)
  const defaultValues = Object.fromEntries(channelCfg.fields.map(f => [f.name, '']))

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${channelCfg.webhookPath}`
    : `https://your-domain.com${channelCfg.webhookPath}`

  const handleConnect = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setStatus('CONNECTED')
    setOpen(false)
    setLoading(false)
    toast.success(`${name} đã kết nối thành công`)
  }

  const handleDisconnect = () => {
    setStatus('DISCONNECTED')
    toast.info(`${name} đã ngắt kết nối`)
  }

  return (
    <>
      <Card className={cn(
        'hover:shadow-md transition-all border-2',
        status === 'CONNECTED' ? 'border-emerald-200 dark:border-emerald-800' : 'border-transparent'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm"
              style={{ backgroundColor: `${channelColor}15`, border: `1px solid ${channelColor}30` }}
            >
              <ChannelIcon icon={icon} size={28} />
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1', cfg.color)}>
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {status === 'CONNECTED' && (
              <div className="bg-muted rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                <p>✓ Credentials đã cấu hình</p>
                <p>✓ Webhook endpoint hoạt động</p>
                <p>✓ SKU mapping đã bật</p>
              </div>
            )}
            <div className="flex gap-2">
              {status === 'CONNECTED' ? (
                <>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />Quản lý
                  </Button>
                  <Button
                    variant="outline" size="sm" className="flex-1 h-8 text-xs text-destructive hover:text-destructive"
                    onClick={handleDisconnect}
                  >
                    Ngắt kết nối
                  </Button>
                </>
              ) : (
                <Button
                  size="sm" className="w-full h-8 text-xs gap-1.5"
                  style={{ backgroundColor: channelColor }}
                  onClick={() => setOpen(true)}
                >
                  <Plug className="w-3.5 h-3.5" />Kết nối {name}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelIcon icon={icon} size={20} /> Kết nối {name}
            </DialogTitle>
            <DialogDescription>{channelCfg.description}</DialogDescription>
          </DialogHeader>

          {/* Webhook URL — readonly, user copies to partner portal */}
          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">Webhook URL của bạn</p>
            <p className="text-muted-foreground mb-2">Copy URL này và dán vào Partner Portal của {name}</p>
            <div className="flex items-center gap-1 bg-background border rounded px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
              <span className="flex-1 truncate">{webhookUrl}</span>
              <CopyButton text={webhookUrl} />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleConnect)} className="space-y-3">
              {channelCfg.fields.map(fieldDef => (
                <FormField
                  key={fieldDef.name}
                  control={form.control}
                  name={fieldDef.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {fieldDef.label}
                        {fieldDef.required && <span className="text-destructive ml-0.5">*</span>}
                      </FormLabel>
                      <FormControl>
                        {fieldDef.type === 'select' ? (
                          <Select onValueChange={field.onChange} defaultValue={field.value as string | undefined}>
                            <SelectTrigger>
                              <SelectValue placeholder={`Chọn ${fieldDef.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldDef.options?.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={fieldDef.type === 'password' ? 'password' : 'text'}
                            placeholder={fieldDef.placeholder}
                            {...field}
                            value={field.value as string ?? ''}
                          />
                        )}
                      </FormControl>
                      {fieldDef.description && (
                        <FormDescription className="text-xs">{fieldDef.description}</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Huỷ
                </Button>
                <Button type="submit" disabled={loading} style={{ backgroundColor: channelColor }}>
                  {loading ? 'Đang kết nối...' : 'Kết nối'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
