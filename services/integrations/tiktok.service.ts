/**
 * TIKTOK SHOP OPEN PLATFORM INTEGRATION
 * Docs: https://partner.tiktokshop.com/doc
 *
 * AUTH FLOW (OAuth 2.0):
 *   1. Register at https://partner.tiktokshop.com → get app_key + app_secret
 *   2. Redirect seller to: https://auth.tiktok-shops.com/oauth/authorize?app_key=...
 *   3. Seller authorizes → redirect to your callback with ?code=...&shop_id=...
 *   4. Exchange code for access_token via POST /api/authorization/202309/token
 *   5. Include access-token header in all subsequent API calls
 *
 * SETUP STEPS:
 *   1. Create app at https://partner.tiktokshop.com/app
 *   2. Set redirect URI: https://your-domain.com/api/webhooks/tiktok/auth
 *   3. Request scopes: ORDER_READ, PRODUCT_READ, PRODUCT_WRITE, SHOP_READ
 *   4. Register webhooks for order.status_change, product.inventory_change
 */

import crypto from 'crypto'

export interface TikTokConfig {
  appKey: string
  appSecret: string
  accessToken: string
  shopId: string
  shopCipher: string
}

export interface TikTokOrderLine {
  id: string
  product_id: string
  sku_id: string
  seller_sku: string        // channel_sku → map to master_sku
  product_name: string
  quantity: number
  sale_price: string        // string decimal
  original_price: string
}

export interface TikTokOrder {
  id: string
  status: 'UNPAID' | 'ON_HOLD' | 'AWAITING_SHIPMENT' | 'AWAITING_COLLECTION' | 'IN_TRANSIT' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
  create_time: number
  update_time: number
  buyer_uid: string
  buyer_message: string
  payment_info: {
    currency: string
    total_amount: string
    sub_total: string
    shipping_fee: string
  }
  line_items: TikTokOrderLine[]
  recipient_address: {
    full_name: string
    phone_number: string
    full_address: string
    region_code: string
  }
}

export const TIKTOK_STATUS_MAP: Record<string, string> = {
  UNPAID:              'PENDING',
  ON_HOLD:             'PENDING',
  AWAITING_SHIPMENT:   'CONFIRMED',
  AWAITING_COLLECTION: 'READY_TO_SHIP',
  IN_TRANSIT:          'SHIPPED',
  DELIVERED:           'DELIVERED',
  COMPLETED:           'DELIVERED',
  CANCELLED:           'CANCELLED',
}

const BASE_URL = 'https://open-api.tiktokglobalshop.com'
const AUTH_BASE = 'https://auth.tiktok-shops.com'

export class TikTokService {
  private config: TikTokConfig

  constructor(config: TikTokConfig) {
    this.config = config
  }

  // ─── Signature ────────────────────────────────────────────────────────────

  private sign(params: Record<string, string>, path: string, body = ''): string {
    // Sort params alphabetically, exclude sign + access_token
    const sorted = Object.entries(params)
      .filter(([k]) => k !== 'sign' && k !== 'access_token')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}${v}`)
      .join('')

    const input = this.config.appSecret + path + sorted + body + this.config.appSecret
    return crypto.createHmac('sha256', this.config.appSecret).update(input).digest('hex')
  }

  private buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-tts-access-token': this.config.accessToken,
    }
  }

  private buildParams(extra: Record<string, string> = {}): Record<string, string> {
    return {
      app_key: this.config.appKey,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      shop_id: this.config.shopId,
      shop_cipher: this.config.shopCipher,
      ...extra,
    }
  }

  // ─── OAuth ────────────────────────────────────────────────────────────────

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      app_key: this.config.appKey,
      state,
    })
    return `${AUTH_BASE}/oauth/authorize?${params}`
  }

  async getAccessToken(code: string): Promise<{
    access_token: string
    refresh_token: string
    access_token_expire_in: number
    seller_name: string
    seller_base_region: string
    shops: Array<{ shop_id: string; shop_name: string; shop_cipher: string }>
  }> {
    const params = this.buildParams({ auth_code: code, grant_type: 'authorized_code' })
    const paramsStr = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}${v}`).join('')
    const sign = crypto.createHmac('sha256', this.config.appSecret)
      .update(this.config.appSecret + '/api/authorization/202309/token' + paramsStr + this.config.appSecret)
      .digest('hex')

    const res = await fetch(`${BASE_URL}/api/authorization/202309/token?${new URLSearchParams({ ...params, sign })}`, {
      method: 'GET',
    })
    const data = await res.json()
    if (data.code !== 0) throw new Error(`TikTok OAuth: ${data.message}`)
    return data.data
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(params: {
    createTimeFrom: number  // unix timestamp
    createTimeTo: number
    pageSize?: number
    pageToken?: string
    orderStatus?: string
  }): Promise<{ orders: TikTokOrder[]; next_page_token: string; total_count: number }> {
    const qp = this.buildParams({
      create_time_ge: params.createTimeFrom.toString(),
      create_time_lt: params.createTimeTo.toString(),
      page_size: (params.pageSize ?? 20).toString(),
      ...(params.pageToken ? { page_token: params.pageToken } : {}),
      ...(params.orderStatus ? { order_status: params.orderStatus } : {}),
    })
    const path = '/api/orders/search/202309'
    const sign = this.sign(qp, path)

    const res = await fetch(`${BASE_URL}${path}?${new URLSearchParams({ ...qp, sign })}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (data.code !== 0) throw new Error(`TikTok getOrders: ${data.message}`)
    return data.data
  }

  async getOrderDetail(orderIds: string[]): Promise<TikTokOrder[]> {
    const qp = this.buildParams()
    const path = '/api/orders/detail/query/202309'
    const body = JSON.stringify({ order_id_list: orderIds })
    const sign = this.sign(qp, path, body)

    const res = await fetch(`${BASE_URL}${path}?${new URLSearchParams({ ...qp, sign })}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body,
    })
    const data = await res.json()
    if (data.code !== 0) throw new Error(`TikTok getOrderDetail: ${data.message}`)
    return data.data.order_list
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  async updateInventory(skuId: string, quantity: number): Promise<void> {
    const qp = this.buildParams()
    const path = '/api/products/stocks/202309'
    const body = JSON.stringify({
      skus: [{ id: skuId, seller_sku: skuId, stock_infos: [{ warehouse_type: 3, available_stock: quantity }] }],
    })
    const sign = this.sign(qp, path, body)

    const res = await fetch(`${BASE_URL}${path}?${new URLSearchParams({ ...qp, sign })}`, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body,
    })
    const data = await res.json()
    if (data.code !== 0) throw new Error(`TikTok updateInventory: ${data.message}`)
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  /**
   * TikTok sends HMAC-SHA256 in header: x-tiktok-signature
   * Verify: HMAC-SHA256(app_secret, timestamp + nonce + body)
   */
  verifyWebhook(body: string, timestamp: string, nonce: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.config.appSecret)
      .update(`${timestamp}${nonce}${body}`)
      .digest('hex')
    return expected === signature
  }

  // ─── Transform ────────────────────────────────────────────────────────────

  transformOrder(order: TikTokOrder, channelId: string, skuMap: Map<string, string>) {
    return {
      channel_id: channelId,
      order_number: `TT-${order.id}`,
      total_amount: parseFloat(order.payment_info.total_amount),
      status: TIKTOK_STATUS_MAP[order.status] ?? 'PENDING',
      order_date: new Date(order.create_time * 1000).toISOString(),
      customer_name: order.recipient_address?.full_name,
      customer_phone: order.recipient_address?.phone_number,
      customer_address: order.recipient_address?.full_address,
      items: order.line_items.map(item => ({
        channel_sku: item.seller_sku,
        master_product_id: skuMap.get(item.seller_sku),
        quantity: item.quantity,
        price: parseFloat(item.sale_price),
        subtotal: parseFloat(item.sale_price) * item.quantity,
      })),
    }
  }
}

/**
 * WEBHOOK HANDLER: app/api/webhooks/tiktok/route.ts
 *
 * export async function POST(request: Request) {
 *   const body = await request.text()
 *   const timestamp = request.headers.get('timestamp') ?? ''
 *   const nonce = request.headers.get('nonce') ?? ''
 *   const signature = request.headers.get('x-tiktok-signature') ?? ''
 *
 *   const svc = new TikTokService({ ...config })
 *   if (!svc.verifyWebhook(body, timestamp, nonce, signature)) {
 *     return Response.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *
 *   const event = JSON.parse(body)
 *   if (event.type === 'order.status_change') {
 *     const { order_id, order_status } = event.data
 *     await OrderService.updateStatus(orderId, TIKTOK_STATUS_MAP[order_status])
 *   }
 *   return Response.json({ code: 0 })
 * }
 */
