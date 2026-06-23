import { type NextRequest, NextResponse } from 'next/server'
import { ShopeeService } from '@/services/integrations/shopee.service'
import { OrderService } from '@/lib/services/order.service'
import { SHOPEE_STATUS_MAP } from '@/services/integrations/shopee.service'
import type { OrderStatus } from '@/types'

const getService = () => new ShopeeService({
  partnerId: parseInt(process.env.SHOPEE_PARTNER_ID!),
  partnerKey: process.env.SHOPEE_PARTNER_KEY!,
  shopId: parseInt(process.env.SHOPEE_SHOP_ID!),
  accessToken: process.env.SHOPEE_ACCESS_TOKEN!,
  environment: 'production',
})

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('authorization') ?? ''

  const svc = getService()
  if (!svc.verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as { code: number; data?: { ordersn?: string; status?: string } }

  // code=3: order status update
  if (event.code === 3 && event.data?.ordersn && event.data?.status) {
    const internalStatus = SHOPEE_STATUS_MAP[event.data.status]
    if (internalStatus) {
      // Find order by order_number and update status
      // The order was imported with prefix SPE- via transformOrder()
      await OrderService.updateStatus(`SPE-${event.data.ordersn}` as unknown as string, internalStatus as OrderStatus)
    }
  }

  return NextResponse.json({ ok: true })
}
