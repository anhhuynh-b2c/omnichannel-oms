/**
 * LAZADA OPEN PLATFORM INTEGRATION
 * Docs: https://open.lazada.com/apps/doc/api
 *
 * AUTH FLOW:
 *   1. Register at https://open.lazada.com → get app_key + app_secret
 *   2. Direct seller to: https://auth.lazada.com/oauth/authorize?app_key=...&redirect_uri=...
 *   3. Exchange code: POST https://auth.lazada.com/rest?action=GetAccessToken
 *   4. Use access_token + sign all requests with MD5/SHA256
 *
 * ENDPOINTS VARY BY REGION:
 *   Vietnam:   https://api.lazada.vn/rest
 *   Singapore: https://api.lazada.sg/rest
 *   Thailand:  https://api.lazada.co.th/rest
 *
 * SETUP STEPS:
 *   1. Create app at https://open.lazada.com/apps/doc/register
 *   2. Set callback URL: https://your-domain.com/api/webhooks/lazada/auth
 *   3. Subscribe to: order_created, order_item_status_changed, product_stock_changed
 *   4. Configure webhook push URL: https://your-domain.com/api/webhooks/lazada
 */

import crypto from 'crypto'

export interface LazadaConfig {
  appKey: string
  appSecret: string
  accessToken: string
  region: 'vn' | 'sg' | 'th' | 'ph' | 'my' | 'id'
}

export interface LazadaOrderItem {
  order_item_id: number
  order_id: number
  name: string
  sku: string          // channel_sku
  seller_sku: string
  shop_id: string
  item_price: string
  paid_price: string
  unit_price: string
  quantity: number
  item_status: string
  purchase_order_id: string
}

export interface LazadaOrder {
  order_id: number
  created_at: string
  updated_at: string
  status: 'unpaid' | 'pending' | 'canceled' | 'ready_to_ship' | 'delivered' | 'returned' | 'shipped' | 'failed' | 'shipped_back'
  payment_method: string
  price: string         // total
  gift_option: boolean
  customer_first_name: string
  customer_last_name: string
  address_billing: {
    phone: string
    address1: string
    city: string
    postcode: string
    country: string
    name: string
  }
  order_items?: LazadaOrderItem[]
}

export const LAZADA_STATUS_MAP: Record<string, string> = {
  unpaid:        'PENDING',
  pending:       'CONFIRMED',
  ready_to_ship: 'READY_TO_SHIP',
  shipped:       'SHIPPED',
  delivered:     'DELIVERED',
  canceled:      'CANCELLED',
  returned:      'RETURNED',
  failed:        'CANCELLED',
}

const REGIONAL_URLS: Record<string, string> = {
  vn: 'https://api.lazada.vn/rest',
  sg: 'https://api.lazada.sg/rest',
  th: 'https://api.lazada.co.th/rest',
  ph: 'https://api.lazada.com.ph/rest',
  my: 'https://api.lazada.com.my/rest',
  id: 'https://api.lazada.co.id/rest',
}

const AUTH_URL = 'https://auth.lazada.com/oauth/authorize'
const TOKEN_URL = 'https://auth.lazada.com/rest'

export class LazadaService {
  private config: LazadaConfig
  private apiUrl: string

  constructor(config: LazadaConfig) {
    this.config = config
    this.apiUrl = REGIONAL_URLS[config.region]
  }

  // ─── Signature ────────────────────────────────────────────────────────────

  private sign(path: string, params: Record<string, string>): string {
    const sorted = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}${v}`)
      .join('')

    const input = `${path}${sorted}`
    return crypto
      .createHmac('sha256', this.config.appSecret)
      .update(input)
      .digest('hex')
      .toUpperCase()
  }

  private buildParams(action: string, extra: Record<string, string> = {}): Record<string, string> {
    const timestamp = Date.now().toString()
    const params: Record<string, string> = {
      app_key: this.config.appKey,
      timestamp,
      sign_method: 'sha256',
      access_token: this.config.accessToken,
      ...extra,
    }
    params.sign = this.sign(action, params)
    return params
  }

  // ─── OAuth ────────────────────────────────────────────────────────────────

  getAuthUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      force_auth: 'false',
      redirect_uri: redirectUri,
      client_id: this.config.appKey,
      ...(state ? { state } : {}),
    })
    return `${AUTH_URL}?${params}`
  }

  async getAccessToken(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    country: string
    account: string
  }> {
    const params = this.buildParams('/auth/token/create', { code })
    const res = await fetch(`${TOKEN_URL}?${new URLSearchParams({ action: 'GetAccessToken', ...params })}`)
    const data = await res.json()
    if (data.code !== '0') throw new Error(`Lazada OAuth: ${data.message}`)
    return data
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(params: {
    createdAfter: string   // ISO 8601: 2024-01-01T00:00:00+07:00
    createdBefore?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ orders: LazadaOrder[]; count_total: number }> {
    const qp = this.buildParams('/orders/get', {
      created_after: params.createdAfter,
      ...(params.createdBefore ? { created_before: params.createdBefore } : {}),
      ...(params.status ? { status: params.status } : {}),
      limit: (params.limit ?? 50).toString(),
      offset: (params.offset ?? 0).toString(),
    })

    const res = await fetch(`${this.apiUrl}?${new URLSearchParams({ action: 'GetOrders', ...qp })}`)
    const data = await res.json()
    if (data.code !== '0') throw new Error(`Lazada getOrders: ${data.message}`)
    return data.data
  }

  async getOrderItems(orderId: number): Promise<LazadaOrderItem[]> {
    const qp = this.buildParams('/order/items/get', { order_id: orderId.toString() })
    const res = await fetch(`${this.apiUrl}?${new URLSearchParams({ action: 'GetOrderItems', ...qp })}`)
    const data = await res.json()
    if (data.code !== '0') throw new Error(`Lazada getOrderItems: ${data.message}`)
    return data.data
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  async updatePrice(skuId: number, price: number, specialPrice?: number): Promise<void> {
    const qp = this.buildParams('/product/price/update', {
      payload: JSON.stringify([{
        SkuId: skuId,
        SalePrice: price.toString(),
        ...(specialPrice ? { SpecialPrice: specialPrice.toString() } : {}),
      }]),
    })
    const res = await fetch(`${this.apiUrl}?${new URLSearchParams({ action: 'SetNewPrice', ...qp })}`)
    const data = await res.json()
    if (data.code !== '0') throw new Error(`Lazada updatePrice: ${data.message}`)
  }

  async updateStock(skuId: number, quantity: number): Promise<void> {
    const payload = JSON.stringify([{ SkuId: skuId, Quantity: quantity }])
    const qp = this.buildParams('/product/stock/sellable/update', { payload })
    const res = await fetch(`${this.apiUrl}?${new URLSearchParams({ action: 'SetNewQuantity', ...qp })}`)
    const data = await res.json()
    if (data.code !== '0') throw new Error(`Lazada updateStock: ${data.message}`)
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  /**
   * Lazada signs with: HMAC-SHA256(app_secret, message)
   * message = timestamp + "\n" + path + "\n" + sorted_params
   */
  verifyWebhook(message: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.config.appSecret)
      .update(message)
      .digest('hex')
      .toUpperCase()
    return expected === signature
  }

  // ─── Transform ────────────────────────────────────────────────────────────

  transformOrder(order: LazadaOrder, channelId: string, skuMap: Map<string, string>) {
    const customerName = [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ')
    return {
      channel_id: channelId,
      order_number: `LZD-${order.order_id}`,
      total_amount: parseFloat(order.price),
      status: LAZADA_STATUS_MAP[order.status] ?? 'PENDING',
      order_date: order.created_at,
      customer_name: customerName || order.address_billing?.name,
      customer_phone: order.address_billing?.phone,
      customer_address: [order.address_billing?.address1, order.address_billing?.city, order.address_billing?.country].filter(Boolean).join(', '),
      items: (order.order_items ?? []).map(item => ({
        channel_sku: item.seller_sku || item.sku,
        master_product_id: skuMap.get(item.seller_sku) ?? skuMap.get(item.sku),
        quantity: item.quantity,
        price: parseFloat(item.paid_price),
        subtotal: parseFloat(item.paid_price) * item.quantity,
      })),
    }
  }
}
