import { type NextRequest, NextResponse } from 'next/server'
import { TikTokService, TIKTOK_STATUS_MAP } from '@/services/integrations/tiktok.service'
import { OrderService } from '@/lib/services/order.service'
import type { OrderStatus } from '@/types'

const getService = () => new TikTokService({
  appKey: process.env.TIKTOK_APP_KEY!,
  appSecret: process.env.TIKTOK_APP_SECRET!,
  accessToken: process.env.TIKTOK_ACCESS_TOKEN!,
  shopId: process.env.TIKTOK_SHOP_ID!,
  shopCipher: process.env.TIKTOK_SHOP_CIPHER!,
})

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const timestamp = request.headers.get('timestamp') ?? ''
  const nonce = request.headers.get('nonce') ?? ''
  const signature = request.headers.get('x-tiktok-signature') ?? ''

  const svc = getService()
  if (!svc.verifyWebhook(rawBody, timestamp, nonce, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as { type: string; data?: { order_id?: string; order_status?: string } }

  if (event.type === 'order.status_change' && event.data?.order_id && event.data?.order_status) {
    const internalStatus = TIKTOK_STATUS_MAP[event.data.order_status]
    if (internalStatus) {
      await OrderService.updateStatus(`TT-${event.data.order_id}` as unknown as string, internalStatus as OrderStatus)
    }
  }

  return NextResponse.json({ code: 0 })
}
