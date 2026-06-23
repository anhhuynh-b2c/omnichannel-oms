/**
 * FACEBOOK / INSTAGRAM SHOP INTEGRATION
 * Docs: https://developers.facebook.com/docs/commerce-platform
 *
 * Facebook Shop and Instagram Shop share the same Commerce API (Meta Graph API).
 *
 * AUTH FLOW (Facebook Login / OAuth 2.0):
 *   1. Register app at https://developers.facebook.com
 *   2. Enable "Facebook Login" + "Commerce" products
 *   3. Redirect user to Facebook Login dialog with required permissions
 *   4. Exchange code for Page Access Token
 *   5. Use catalog_id for product/inventory operations
 *   6. Use page_id for order operations (if Commerce enabled on the Page)
 *
 * REQUIRED PERMISSIONS (scopes):
 *   - catalog_management
 *   - business_management
 *   - commerce_account_manage_orders
 *   - commerce_account_read_orders
 *   - commerce_account_read_reports
 *   - instagram_shopping_tag_products (for Instagram Shop)
 *
 * SETUP STEPS:
 *   1. https://developers.facebook.com/apps → Create App → Business type
 *   2. Add Commerce product in your app dashboard
 *   3. Set Valid OAuth Redirect URIs: https://your-domain.com/api/webhooks/facebook/auth
 *   4. Set Webhooks callback URL: https://your-domain.com/api/webhooks/facebook
 *   5. Subscribe to: orders, products (in Webhooks settings)
 */

import crypto from 'crypto'

export interface FacebookConfig {
  appId: string
  appSecret: string
  accessToken: string      // Page Access Token
  catalogId: string        // Product Catalog ID
  pageId: string           // Facebook Page ID
}

export interface FacebookOrderItem {
  id: string
  retailer_id: string    // = channel_sku
  quantity: number
  price_per_unit: {
    amount: string
    currency: string
  }
  product_id: string
  product_name: string
}

export interface FacebookOrder {
  id: string
  order_status: {
    state: 'CREATED' | 'PROCESSING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  }
  created: string          // ISO 8601
  last_updated: string
  buyer_details: {
    name: string
    email: string
    email_remarketing_allowance: { allowance_status: string }
  }
  shipping_address: {
    name: string
    street1: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  channel: 'facebook' | 'instagram'
  total_amount: { amount: string; currency: string }
  items: FacebookOrderItem[]
}

export const FACEBOOK_STATUS_MAP: Record<string, string> = {
  CREATED:    'PENDING',
  PROCESSING: 'CONFIRMED',
  IN_TRANSIT: 'SHIPPED',
  COMPLETED:  'DELIVERED',
  CANCELLED:  'CANCELLED',
  REFUNDED:   'REFUNDED',
}

const GRAPH_URL = 'https://graph.facebook.com/v18.0'

export class FacebookService {
  private config: FacebookConfig

  constructor(config: FacebookConfig) {
    this.config = config
  }

  // ─── OAuth ────────────────────────────────────────────────────────────────

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: redirectUri,
      scope: [
        'catalog_management',
        'business_management',
        'commerce_account_manage_orders',
        'commerce_account_read_orders',
        'instagram_shopping_tag_products',
      ].join(','),
      response_type: 'code',
      state,
    })
    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`
  }

  async getAccessToken(code: string, redirectUri: string): Promise<{
    access_token: string
    token_type: string
    expires_in: number
  }> {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      redirect_uri: redirectUri,
      code,
    })
    const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params}`)
    const data = await res.json()
    if (data.error) throw new Error(`Facebook OAuth: ${data.error.message}`)
    return data
  }

  async getLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      fb_exchange_token: shortToken,
    })
    const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params}`)
    const data = await res.json()
    if (data.error) throw new Error(`Facebook token exchange: ${data.error.message}`)
    return data
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(params: {
    state?: string
    updatedAfter?: string   // ISO 8601
    limit?: number
    after?: string          // pagination cursor
  }): Promise<{ data: FacebookOrder[]; paging?: { cursors: { after: string }; next?: string } }> {
    const qp = new URLSearchParams({
      access_token: this.config.accessToken,
      fields: 'id,order_status,created,last_updated,buyer_details,shipping_address,channel,total_amount,items{id,retailer_id,quantity,price_per_unit,product_id,product_name}',
      limit: (params.limit ?? 50).toString(),
      ...(params.state ? { state: params.state } : {}),
      ...(params.updatedAfter ? { updated_after: params.updatedAfter } : {}),
      ...(params.after ? { after: params.after } : {}),
    })

    const res = await fetch(`${GRAPH_URL}/${this.config.pageId}/commerce_orders?${qp}`)
    const data = await res.json()
    if (data.error) throw new Error(`Facebook getOrders: ${data.error.message}`)
    return data
  }

  async acknowledgeOrder(orderId: string, idempotencyKey: string): Promise<void> {
    const res = await fetch(`${GRAPH_URL}/${orderId}/acknowledge_order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: this.config.accessToken,
        idempotency_key: idempotencyKey,
        merchant_order_reference: orderId,
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(`Facebook acknowledgeOrder: ${data.error.message}`)
  }

  async shipOrder(orderId: string, trackingInfo: {
    trackingNumber: string
    carrier: string
    shippingTime: string
    itemIds: string[]
    fulfillmentId?: string
  }): Promise<void> {
    const res = await fetch(`${GRAPH_URL}/${orderId}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: this.config.accessToken,
        tracking_info: {
          tracking_number: trackingInfo.trackingNumber,
          carrier: trackingInfo.carrier,
          shipping_time: trackingInfo.shippingTime,
        },
        items: trackingInfo.itemIds.map(id => ({ retailer_id: id })),
        ...(trackingInfo.fulfillmentId ? { fulfillment_address: {} } : {}),
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(`Facebook shipOrder: ${data.error.message}`)
  }

  // ─── Catalog / Inventory ──────────────────────────────────────────────────

  async updateProductItem(retailerId: string, update: {
    availability?: 'in stock' | 'out of stock' | 'preorder' | 'available for order'
    price?: number          // in cents (VND × 100)
    currency?: string
    name?: string
    description?: string
  }): Promise<void> {
    const res = await fetch(
      `${GRAPH_URL}/${this.config.catalogId}/items_batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: this.config.accessToken,
          requests: [{
            method: 'UPDATE',
            retailer_id: retailerId,
            data: {
              ...(update.availability ? { availability: update.availability } : {}),
              ...(update.price !== undefined ? { price: `${update.price} VND` } : {}),
              ...(update.name ? { name: update.name } : {}),
              ...(update.description ? { description: update.description } : {}),
            },
          }],
        }),
      }
    )
    const data = await res.json()
    if (data.error) throw new Error(`Facebook updateProduct: ${data.error.message}`)
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  /**
   * Facebook uses app_secret to verify HMAC-SHA256 in X-Hub-Signature-256 header.
   * signature format: "sha256=<hex>"
   */
  verifyWebhook(rawBody: string, signature: string): boolean {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', this.config.appSecret)
      .update(rawBody)
      .digest('hex')
    return expected === signature
  }

  /** Respond to Facebook's hub.challenge during webhook verification */
  handleChallenge(mode: string, token: string, challenge: string, verifyToken: string): string | null {
    if (mode === 'subscribe' && token === verifyToken) return challenge
    return null
  }

  // ─── Transform ────────────────────────────────────────────────────────────

  transformOrder(order: FacebookOrder, channelId: string, skuMap: Map<string, string>) {
    return {
      channel_id: channelId,
      order_number: `${order.channel === 'instagram' ? 'IG' : 'FB'}-${order.id}`,
      total_amount: parseFloat(order.total_amount.amount),
      status: FACEBOOK_STATUS_MAP[order.order_status.state] ?? 'PENDING',
      order_date: order.created,
      customer_name: order.buyer_details?.name,
      customer_email: order.buyer_details?.email,
      customer_address: [
        order.shipping_address?.street1,
        order.shipping_address?.city,
        order.shipping_address?.country,
      ].filter(Boolean).join(', '),
      items: order.items.map(item => ({
        channel_sku: item.retailer_id,
        master_product_id: skuMap.get(item.retailer_id),
        quantity: item.quantity,
        price: parseFloat(item.price_per_unit.amount),
        subtotal: parseFloat(item.price_per_unit.amount) * item.quantity,
      })),
    }
  }
}

/**
 * WEBHOOK HANDLER EXAMPLE
 * app/api/webhooks/facebook/route.ts
 *
 * // GET: Facebook verification challenge
 * export async function GET(request: Request) {
 *   const { searchParams } = new URL(request.url)
 *   const mode = searchParams.get('hub.mode')
 *   const token = searchParams.get('hub.verify_token')
 *   const challenge = searchParams.get('hub.challenge')
 *
 *   const svc = new FacebookService({ ...config })
 *   const response = svc.handleChallenge(mode!, token!, challenge!, process.env.FB_VERIFY_TOKEN!)
 *   if (response) return new Response(response)
 *   return Response.json({ error: 'Forbidden' }, { status: 403 })
 * }
 *
 * // POST: Incoming events
 * export async function POST(request: Request) {
 *   const rawBody = await request.text()
 *   const signature = request.headers.get('x-hub-signature-256') ?? ''
 *
 *   const svc = new FacebookService({ ...config })
 *   if (!svc.verifyWebhook(rawBody, signature)) {
 *     return Response.json({ error: 'Invalid signature' }, { status: 401 })
 *   }
 *
 *   const { object, entry } = JSON.parse(rawBody)
 *   if (object === 'commerce_order') {
 *     for (const e of entry) {
 *       for (const change of e.changes) {
 *         if (change.field === 'orders') {
 *           const { order_id, order_status } = change.value
 *           await OrderService.updateStatus(orderId, FACEBOOK_STATUS_MAP[order_status.state])
 *         }
 *       }
 *     }
 *   }
 *   return Response.json({ ok: true })
 * }
 */
