import { type NextRequest, NextResponse } from 'next/server'
import { LazadaService, LAZADA_STATUS_MAP } from '@/services/integrations/lazada.service'
import { OrderService } from '@/lib/services/order.service'
import type { OrderStatus } from '@/types'

const getService = () => new LazadaService({
  appKey: process.env.LAZADA_APP_KEY!,
  appSecret: process.env.LAZADA_APP_SECRET!,
  accessToken: process.env.LAZADA_ACCESS_TOKEN!,
  region: (process.env.LAZADA_REGION ?? 'vn') as 'vn' | 'sg' | 'th' | 'ph' | 'my' | 'id',
})

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-lazada-signature') ?? ''
  const timestamp = request.headers.get('x-lazada-timestamp') ?? ''

  const svc = getService()
  // Lazada signs: timestamp + "\n" + /webhook + "\n" + body
  const message = `${timestamp}\n/webhook\n${rawBody}`
  if (!svc.verifyWebhook(message, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as { topic: string; data?: { trade_order_id?: string; trade_order_status?: string } }

  if (event.topic === 'trade' && event.data?.trade_order_id && event.data?.trade_order_status) {
    const internalStatus = LAZADA_STATUS_MAP[event.data.trade_order_status]
    if (internalStatus) {
      await OrderService.updateStatus(`LZD-${event.data.trade_order_id}` as unknown as string, internalStatus as OrderStatus)
    }
  }

  return NextResponse.json({ code: 0 })
}
