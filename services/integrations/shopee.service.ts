/**
 * SHOPEE OPEN PLATFORM INTEGRATION
 * Docs: https://open.shopee.com/documents/v2
 *
 * AUTH FLOW:
 *   1. Generate partner_id + timestamp + partner_key → HMAC-SHA256 sign
 *   2. Redirect merchant to auth URL to get shop_id + auth_code
 *   3. Call /auth/token/get with auth_code → access_token + refresh_token
 *   4. All subsequent calls pass access_token + shop_id in query
 *
 * SETUP STEPS (in Shopee Partner Portal):
 *   1. Register at https://partner.shopeemobile.com
 *   2. Create app → get partner_id & partner_key
 *   3. Set redirect URL: https://your-domain.com/api/webhooks/shopee/auth
 *   4. Enable webhooks for ORDER_STATUS_UPDATE, SHOP_UPDATE
 *   5. Configure webhook URL: https://your-domain.com/api/webhooks/shopee
 */

import crypto from 'crypto'

export interface ShopeeConfig {
  partnerId: number
  partnerKey: string
  shopId: number
  accessToken: string
  environment: 'sandbox' | 'production'
}

export interface ShopeeOrderItem {
  order_item_id: number
  item_id: number
  item_name: string
  item_sku: string
  model_sku: string            // This is the channel_sku to map → master_sku
  model_quantity_purchased: number
  model_discounted_price: number
  model_original_price: number
}

export interface ShopeeOrder {
  order_sn: string
  order_status: 'UNPAID' | 'READY_TO_SHIP' | 'PROCESSED' | 'SHIPPED' | 'COMPLETED' | 'IN_CANCEL' | 'CANCELLED' | 'INVOICE_PENDING'
  buyer_user_id: number
  buyer_username: string
  total_amount: string
  currency: string
  create_time: number
  update_time: number
  item_list: ShopeeOrderItem[]
  recipient_address: {
    name: string
    phone: string
    full_address: string
  }
}

const BASE_URLS = {
  sandbox:    'https://partner.test-stable.shopeemobile.com',
  production: 'https://partner.shopeemobile.com',
}

// Maps Shopee order_status → internal OrderStatus
export const SHOPEE_STATUS_MAP: Record<string, string> = {
  UNPAID:           'PENDING',
  READY_TO_SHIP:    'CONFIRMED',
  PROCESSED:        'PACKING',
  SHIPPED:          'SHIPPED',
  COMPLETED:        'DELIVERED',
  IN_CANCEL:        'PENDING',
  CANCELLED:        'CANCELLED',
  INVOICE_PENDING:  'CONFIRMED',
}

export class ShopeeService {
  private config: ShopeeConfig
  private baseUrl: string

  constructor(config: ShopeeConfig) {
    this.config = config
    this.baseUrl = BASE_URLS[config.environment]
  }

  // ─── Signature Generation ─────────────────────────────────────────────────

  private sign(path: string, timestamp: number, accessToken?: string, shopId?: number): string {
    const base = [
      this.config.partnerId,
      path,
      timestamp,
      accessToken ?? '',
      shopId ?? '',
    ].join('')
    return crypto.createHmac('sha256', this.config.partnerKey).update(base).digest('hex')
  }

  private buildUrl(path: string, params: Record<string, string | number> = {}): string {
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = this.sign(path, timestamp, this.config.accessToken, this.config.shopId)
    const query = new URLSearchParams({
      partner_id: this.config.partnerId.toString(),
      timestamp: timestamp.toString(),
      access_token: this.config.accessToken,
      shop_id: this.config.shopId.toString(),
      sign,
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    })
    return `${this.baseUrl}${path}?${query}`
  }

  // ─── OAuth ────────────────────────────────────────────────────────────────

  getAuthUrl(redirectUrl: string): string {
    const timestamp = Math.floor(Date.now() / 1000)
    const path = '/api/v2/shop/auth_partner'
    const sign = this.sign(path, timestamp)
    return `${this.baseUrl}${path}?partner_id=${this.config.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`
  }

  async getAccessToken(code: string, shopId: number): Promise<{
    access_token: string
    refresh_token: string
    expire_in: number
  }> {
    const path = '/api/v2/auth/token/get'
    const url = this.buildUrl(path)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, shop_id: shopId, partner_id: this.config.partnerId }),
    })
    const data = await res.json()
    if (data.error) throw new Error(`Shopee OAuth error: ${data.message}`)
    return data
  }

  async refreshToken(refreshToken: string, shopId: number): Promise<{ access_token: string; refresh_token: string }> {
    const path = '/api/v2/auth/access_token/get'
    const url = this.buildUrl(path)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, shop_id: shopId, partner_id: this.config.partnerId }),
    })
    const data = await res.json()
    if (data.error) throw new Error(`Shopee token refresh error: ${data.message}`)
    return data
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrderList(params: {
    timeFrom: number   // unix timestamp
    timeTo: number
    pageSize?: number
    cursor?: string
    orderStatus?: string
  }): Promise<{ order_list: { order_sn: string }[]; next_cursor: string; more: boolean }> {
    const path = '/api/v2/order/get_order_list'
    const url = this.buildUrl(path, {
      time_range_field: 'create_time',
      time_from: params.timeFrom,
      time_to: params.timeTo,
      page_size: params.pageSize ?? 50,
      cursor: params.cursor ?? '',
      order_status: params.orderStatus ?? '',
      response_optional_fields: 'order_status',
    })
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new Error(`Shopee getOrderList: ${data.message}`)
    return data.response
  }

  async getOrderDetail(orderSns: string[]): Promise<ShopeeOrder[]> {
    const path = '/api/v2/order/get_order_detail'
    const url = this.buildUrl(path, {
      order_sn_list: orderSns.join(','),
      response_optional_fields: 'item_list,buyer_user_id,buyer_username,recipient_address',
    })
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new Error(`Shopee getOrderDetail: ${data.message}`)
    return data.response.order_list
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  async updateStock(modelId: number, itemId: number, normalStock: number): Promise<void> {
    const path = '/api/v2/product/update_stock'
    const url = this.buildUrl(path)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        stock_list: [{ model_id: modelId, seller_stock: [{ stock: normalStock }] }],
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(`Shopee updateStock: ${data.message}`)
  }

  // ─── Webhook Verification ─────────────────────────────────────────────────

  /**
   * Call from: POST /api/webhooks/shopee
   * Shopee sends: { code, timestamp, shop_id, data }
   * Verify HMAC: sha256( partner_id + partner_key + timestamp + shop_id + data_as_json )
   */
  verifyWebhook(payload: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.config.partnerKey)
      .update(payload)
      .digest('hex')
    return expected === signature
  }

  // ─── Transform to Internal Order ─────────────────────────────────────────

  transformOrder(shopeeOrder: ShopeeOrder, channelId: string, skuMap: Map<string, string>) {
    return {
      channel_id: channelId,
      order_number: `SP-${shopeeOrder.order_sn}`,
      total_amount: parseFloat(shopeeOrder.total_amount),
      status: SHOPEE_STATUS_MAP[shopeeOrder.order_status] ?? 'PENDING',
      order_date: new Date(shopeeOrder.create_time * 1000).toISOString(),
      customer_name: shopeeOrder.recipient_address?.name ?? shopeeOrder.buyer_username,
      customer_phone: shopeeOrder.recipient_address?.phone,
      customer_address: shopeeOrder.recipient_address?.full_address,
      items: shopeeOrder.item_list.map(item => {
        const masterProductId = skuMap.get(item.model_sku) ?? skuMap.get(item.item_sku)
        return {
          channel_sku: item.model_sku || item.item_sku,
          master_product_id: masterProductId,
          quantity: item.model_quantity_purchased,
          price: item.model_discounted_price,
          subtotal: item.model_discounted_price * item.model_quantity_purchased,
        }
      }),
    }
  }
}

/**
 * WEBHOOK HANDLER EXAMPLE
 * File: app/api/webhooks/shopee/route.ts
 *
 * export async function POST(request: Request) {
 *   const rawBody = await request.text()
 *   const signature = request.headers.get('Authorization') ?? ''
 *
 *   const shopee = new ShopeeService({ ...config })
 *   if (!shopee.verifyWebhook(rawBody, signature)) {
 *     return Response.json({ error: 'Invalid signature' }, { status: 401 })
 *   }
 *
 *   const payload = JSON.parse(rawBody)
 *   // payload.code === 3 → ORDER_STATUS_UPDATE
 *   if (payload.code === 3) {
 *     const { ordersn, status } = payload.data
 *     const internalStatus = SHOPEE_STATUS_MAP[status]
 *     await OrderService.updateStatus(orderId, internalStatus)
 *   }
 *   return Response.json({ ok: true })
 * }
 */
