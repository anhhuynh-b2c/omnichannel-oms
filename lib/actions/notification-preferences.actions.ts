'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type NotificationKey =
  | 'low_stock_alerts'
  | 'out_of_stock_alerts'
  | 'new_order_received'
  | 'order_status_changes'
  | 'purchase_order_approved'
  | 'purchase_order_received'
  | 'channel_sync_errors'
  | 'daily_summary_report'

export type NotificationPrefs = Record<NotificationKey, boolean>

const DEFAULTS: NotificationPrefs = {
  low_stock_alerts:         true,
  out_of_stock_alerts:      true,
  new_order_received:       true,
  order_status_changes:     false,
  purchase_order_approved:  true,
  purchase_order_received:  true,
  channel_sync_errors:      true,
  daily_summary_report:     false,
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...DEFAULTS }

  const { data } = await supabase
    .from('notification_preferences')
    .select('key, enabled')
    .eq('user_id', user.id)

  const prefs = { ...DEFAULTS }
  for (const row of data ?? []) {
    if (row.key in prefs) {
      prefs[row.key as NotificationKey] = row.enabled
    }
  }
  return prefs
}

export async function saveNotificationPrefs(prefs: NotificationPrefs) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const rows = (Object.keys(prefs) as NotificationKey[]).map(key => ({
    user_id:    user.id,
    key,
    enabled:    prefs[key],
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(rows, { onConflict: 'user_id,key' })

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
