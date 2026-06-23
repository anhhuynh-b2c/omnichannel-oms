import { type NextRequest, NextResponse } from 'next/server'
import { FacebookService, FACEBOOK_STATUS_MAP } from '@/services/integrations/facebook.service'
import { OrderService } from '@/lib/services/order.service'
import type { OrderStatus } from '@/types'

const getService = () => new FacebookService({
  appId: process.env.FACEBOOK_APP_ID!,
  appSecret: process.env.FACEBOOK_APP_SECRET!,
  accessToken: process.env.FACEBOOK_ACCESS_TOKEN!,
  catalogId: process.env.FACEBOOK_CATALOG_ID!,
  pageId: process.env.FACEBOOK_PAGE_ID!,
})

// GET: Facebook verification challenge
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const svc = getService()
  const response = svc.handleChallenge(mode ?? '', token ?? '', challenge ?? '', process.env.FACEBOOK_VERIFY_TOKEN ?? '')
  if (response) return new Response(response)
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST: Incoming events
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256') ?? ''

  const svc = getService()
  if (!svc.verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { object, entry } = JSON.parse(rawBody) as {
    object: string
    entry: Array<{ changes: Array<{ field: string; value: { order_id?: string; order_status?: { state?: string } } }> }>
  }

  if (object === 'commerce_order') {
    for (const e of entry) {
      for (const change of e.changes) {
        if (change.field === 'orders' && change.value.order_id && change.value.order_status?.state) {
          const state = change.value.order_status.state
          const internalStatus = FACEBOOK_STATUS_MAP[state]
          if (internalStatus) {
            await OrderService.updateStatus(change.value.order_id as unknown as string, internalStatus as OrderStatus)
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
