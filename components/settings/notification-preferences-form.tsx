'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { saveNotificationPrefs, type NotificationPrefs, type NotificationKey } from '@/lib/actions/notification-preferences.actions'

const ITEMS: { key: NotificationKey; label: string; desc: string }[] = [
  { key: 'low_stock_alerts',        label: 'Low Stock Alerts',        desc: 'Notify when stock falls below reorder point' },
  { key: 'out_of_stock_alerts',     label: 'Out of Stock Alerts',     desc: 'Notify when products reach zero inventory' },
  { key: 'new_order_received',      label: 'New Order Received',      desc: 'Alert when a new order comes in' },
  { key: 'order_status_changes',    label: 'Order Status Changes',    desc: 'Notify on each order status transition' },
  { key: 'purchase_order_approved', label: 'Purchase Order Approved', desc: 'Alert when a PO is approved' },
  { key: 'purchase_order_received', label: 'Purchase Order Received', desc: 'Confirm when PO is marked as received' },
  { key: 'channel_sync_errors',     label: 'Channel Sync Errors',     desc: 'Alert when marketplace sync fails' },
  { key: 'daily_summary_report',    label: 'Daily Summary Report',    desc: 'Send daily digest at 8:00 AM' },
]

export function NotificationPreferencesForm({ initialPrefs }: { initialPrefs: NotificationPrefs }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs)
  const [isPending, startTransition] = useTransition()

  const toggle = (key: NotificationKey) =>
    setPrefs(p => ({ ...p, [key]: !p[key] }))

  const handleSave = () => {
    startTransition(async () => {
      try {
        await saveNotificationPrefs(prefs)
        toast.success('Notification preferences saved')
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-1">
      {ITEMS.map(item => (
        <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
          <div>
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
          <Switch
            checked={prefs[item.key]}
            onCheckedChange={() => toggle(item.key)}
          />
        </div>
      ))}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
