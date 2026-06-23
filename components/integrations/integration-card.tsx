'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plug, PlugZap, AlertCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ChannelName } from '@/types'
import { CHANNEL_COLORS } from '@/constants'

type Status = 'CONNECTED' | 'DISCONNECTED' | 'ERROR'

interface IntegrationCardProps {
  id: string
  name: ChannelName
  icon: string
  status: Status
}

const schema = z.object({
  api_key: z.string().min(1, 'API Key is required'),
  secret_key: z.string().min(1, 'Secret Key is required'),
  webhook_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: typeof Plug }> = {
  CONNECTED:    { label: 'Connected',    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', icon: PlugZap },
  DISCONNECTED: { label: 'Disconnected', color: 'text-gray-500 bg-gray-50 dark:bg-gray-900/30',         icon: Plug },
  ERROR:        { label: 'Error',        color: 'text-red-600 bg-red-50 dark:bg-red-950/30',            icon: AlertCircle },
}

export function IntegrationCard({ id, name, icon, status: initialStatus }: IntegrationCardProps) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const cfg = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon
  const channelColor = CHANNEL_COLORS[name]

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { api_key: '', secret_key: '', webhook_url: '' },
  })

  const handleConnect = async (values: FormValues) => {
    setLoading(true)
    // Mock: simulate API call
    await new Promise(r => setTimeout(r, 1200))
    setStatus('CONNECTED')
    setOpen(false)
    setLoading(false)
    toast.success(`${name} connected successfully`)
  }

  const handleDisconnect = () => {
    setStatus('DISCONNECTED')
    toast.info(`${name} disconnected`)
  }

  return (
    <>
      <Card className={cn(
        'hover:shadow-md transition-all border-2',
        status === 'CONNECTED' ? 'border-emerald-200 dark:border-emerald-800' : 'border-transparent'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: `${channelColor}15`, border: `1px solid ${channelColor}30` }}
              >
                {icon}
              </div>
              <div>
                <CardTitle className="text-base">{name}</CardTitle>
                <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1', cfg.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {status === 'CONNECTED' && (
              <div className="bg-muted rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                <p>✓ API credentials configured</p>
                <p>✓ Webhook endpoint active</p>
                <p>✓ SKU mapping enabled</p>
              </div>
            )}

            <div className="flex gap-2">
              {status === 'CONNECTED' ? (
                <>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />Manage
                  </Button>
                  <Button
                    variant="outline" size="sm" className="flex-1 h-8 text-xs text-destructive hover:text-destructive"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  size="sm" className="w-full h-8 text-xs gap-1.5"
                  style={{ backgroundColor: channelColor }}
                  onClick={() => setOpen(true)}
                >
                  <Plug className="w-3.5 h-3.5" />Connect {name}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{icon}</span> Connect {name}
            </DialogTitle>
            <DialogDescription>
              Enter your {name} API credentials. These are stored securely and used for order sync.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleConnect)} className="space-y-4">
              <FormField control={form.control} name="api_key" render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your API key" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="secret_key" render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Key</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your secret key" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="webhook_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-domain.com/webhooks/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Note</p>
                <p>This is a demo UI. Real API integration requires backend webhook handlers and OAuth flow implementation per channel.</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} style={{ backgroundColor: channelColor }}>
                  {loading ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
