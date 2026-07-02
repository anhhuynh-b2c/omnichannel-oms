import type { SupabaseClient } from '@supabase/supabase-js'
import { CHANNEL_PREFIX } from '@/lib/utils/channel-prefix'

export { CHANNEL_PREFIX }

/**
 * Generate order number in format PREFIX-DDMMYYYY-001.
 * Uses DB count for the sequence to avoid collisions.
 */
export async function generateOrderNumber(
  supabase: SupabaseClient,
  channelName: string,
): Promise<string> {
  const now = new Date()
  const dd   = String(now.getDate()).padStart(2, '0')
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const prefix = `${CHANNEL_PREFIX[channelName] ?? 'ORD'}-${dd}${mm}${yyyy}-`

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .like('order_number', `${prefix}%`)

  const seq = String((count ?? 0) + 1).padStart(3, '0')
  return `${prefix}${seq}`
}
