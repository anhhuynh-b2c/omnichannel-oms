'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Step {
  title: string
  desc: string
  code?: string
}

interface ChannelGuide {
  channel: string
  icon: string
  color: string
  docsUrl: string
  partnerUrl: string
  authType: string
  steps: Step[]
  webhookEvents: string[]
}

const GUIDES: ChannelGuide[] = [
  {
    channel: 'Shopee',
    icon: '🛍️',
    color: '#EE4D2D',
    docsUrl: 'https://open.shopee.com/documents/v2',
    partnerUrl: 'https://partner.shopeemobile.com',
    authType: 'HMAC-SHA256 + OAuth',
    steps: [
      { title: 'Đăng ký Partner Account', desc: 'Truy cập partner.shopeemobile.com → Tạo app → Nhận partner_id và partner_key' },
      { title: 'Cấu hình Redirect URL', desc: 'Set URL callback: https://your-domain.com/api/webhooks/shopee/auth' },
      { title: 'Lấy Access Token', desc: 'Redirect merchant đến Shopee auth URL → nhận auth_code → exchange lấy access_token', code: 'GET /api/v2/shop/auth_partner?partner_id=...&sign=...\nPOST /api/v2/auth/token/get\n{ code, shop_id, partner_id }' },
      { title: 'Kích hoạt Webhook', desc: 'Đăng ký webhook URL trong Partner Portal. Shopee gửi sự kiện khi đơn thay đổi trạng thái.' },
      { title: 'Map SKU', desc: 'Trong bảng channel_sku_mapping: map model_sku của Shopee về master_sku nội bộ.' },
    ],
    webhookEvents: ['ORDER_STATUS_UPDATE (code=3)', 'SHOP_UPDATE (code=5)', 'ITEM_STOCK_UPDATE (code=10)'],
  },
  {
    channel: 'TikTok Shop',
    icon: '🎵',
    color: '#000000',
    docsUrl: 'https://partner.tiktokshop.com/doc',
    partnerUrl: 'https://partner.tiktokshop.com',
    authType: 'HMAC-SHA256 + OAuth 2.0',
    steps: [
      { title: 'Tạo app TikTok Shop', desc: 'Đăng ký tại partner.tiktokshop.com → Create App → Nhận app_key và app_secret' },
      { title: 'Cấu hình OAuth', desc: 'Redirect seller đến: https://auth.tiktok-shops.com/oauth/authorize?app_key=...', code: 'GET https://auth.tiktok-shops.com/oauth/authorize\n?app_key={app_key}&state={random_state}' },
      { title: 'Exchange Token', desc: 'Sau khi seller authorize, exchange code lấy access_token', code: 'GET /api/authorization/202309/token\n?app_key=...&auth_code=...&sign=...' },
      { title: 'Ký Request (SHA256)', desc: 'Mỗi request phải ký: app_secret + path + sorted_params + body + app_secret', code: 'sign = HMAC-SHA256(app_secret,\n  app_secret + path + sorted_params + body + app_secret\n)' },
      { title: 'Đăng ký Webhook', desc: 'Trong Partner Portal → Webhooks → Add endpoint URL → Subscribe events' },
    ],
    webhookEvents: ['order.status_change', 'product.inventory_change', 'shop.settings_update'],
  },
  {
    channel: 'Lazada',
    icon: '🛒',
    color: '#0F146D',
    docsUrl: 'https://open.lazada.com/apps/doc/api',
    partnerUrl: 'https://open.lazada.com',
    authType: 'HMAC-SHA256',
    steps: [
      { title: 'Đăng ký Lazada Open Platform', desc: 'Vào open.lazada.com → Register → Tạo app → Nhận app_key và app_secret' },
      { title: 'Chọn Region', desc: 'Lazada có API endpoint khác nhau theo quốc gia:\n- VN: api.lazada.vn/rest\n- SG: api.lazada.sg/rest\n- TH: api.lazada.co.th/rest' },
      { title: 'OAuth Authorization', desc: 'Redirect seller đến Lazada auth, nhận code, exchange lấy access_token', code: 'GET https://auth.lazada.com/oauth/authorize\n?response_type=code&client_id={app_key}&redirect_uri=...\n\nPOST https://auth.lazada.com/rest\n?action=GetAccessToken&code=...' },
      { title: 'Ký mọi Request', desc: 'Ký bằng HMAC-SHA256: sign( action + sorted_params )', code: 'signature = HMAC-SHA256(app_secret,\n  action_path + sorted(key+value pairs)\n).toUpperCase()' },
      { title: 'Subscribe Push Notification', desc: 'Trong app settings → Webhook URL → Subscribe: order_created, order_item_status_changed' },
    ],
    webhookEvents: ['order_created', 'order_item_status_changed', 'product_stock_changed'],
  },
  {
    channel: 'Facebook / Instagram',
    icon: '📘',
    color: '#1877F2',
    docsUrl: 'https://developers.facebook.com/docs/commerce-platform',
    partnerUrl: 'https://developers.facebook.com',
    authType: 'OAuth 2.0 (Meta Graph API)',
    steps: [
      { title: 'Tạo Meta App', desc: 'Vào developers.facebook.com → Create App → Business type → Enable Commerce product' },
      { title: 'Yêu cầu Permissions', desc: 'Cần các quyền: catalog_management, commerce_account_read_orders, commerce_account_manage_orders, instagram_shopping_tag_products' },
      { title: 'OAuth Flow', desc: 'Redirect user đến Facebook Login dialog với required scopes', code: 'GET https://www.facebook.com/v18.0/dialog/oauth\n?client_id={app_id}&redirect_uri=...&scope=catalog_management,...' },
      { title: 'Lấy Page Access Token', desc: 'Short-lived token → exchange lấy Long-lived token (60 ngày)', code: 'GET /oauth/access_token\n?grant_type=fb_exchange_token\n&client_id=...&client_secret=...\n&fb_exchange_token={short_token}' },
      { title: 'Webhook Verification', desc: 'Facebook gửi GET request với hub.challenge. Trả về challenge để verify.', code: 'GET /api/webhooks/facebook\n?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...\n→ return hub.challenge' },
    ],
    webhookEvents: ['orders (order_status)', 'products (catalog_update)', 'commerce (checkout)'],
  },
]

export function SetupGuide() {
  const [activeChannel, setActiveChannel] = useState('Shopee')
  const guide = GUIDES.find(g => g.channel === activeChannel) ?? GUIDES[0]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>📋</span>
          Hướng dẫn kết nối từng nền tảng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeChannel} onValueChange={setActiveChannel}>
          <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0 justify-start overflow-x-auto">
            {GUIDES.map(g => (
              <TabsTrigger
                key={g.channel}
                value={g.channel}
                className={cn(
                  'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-sm gap-1.5 shrink-0',
                )}
              >
                <span>{g.icon}</span>
                <span className="hidden sm:inline">{g.channel}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {GUIDES.map(g => (
            <TabsContent key={g.channel} value={g.channel} className="p-5 space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{g.icon}</span>
                  <div>
                    <h3 className="font-semibold">{g.channel}</h3>
                    <p className="text-xs text-muted-foreground">Auth: {g.authType}</p>
                  </div>
                </div>
                <div className="flex gap-2 ml-auto">
                  <a
                    href={g.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                  >
                    📚 API Docs
                  </a>
                  <a
                    href={g.partnerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                  >
                    🔗 Partner Portal
                  </a>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Các bước tích hợp</p>
                {g.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: g.color }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{step.desc}</p>
                      {step.code && (
                        <pre className="mt-2 p-2.5 bg-slate-900 dark:bg-slate-800 text-green-400 text-xs rounded-md overflow-x-auto font-mono leading-relaxed">
                          {step.code}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Webhook Events */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Webhook Events cần subscribe</p>
                <div className="flex flex-wrap gap-2">
                  {g.webhookEvents.map(ev => (
                    <Badge key={ev} variant="outline" className="text-xs font-mono">
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Env vars */}
              <div className="bg-muted/50 rounded-lg p-3 text-xs">
                <p className="font-semibold mb-2 text-foreground">Biến môi trường (.env.local)</p>
                <pre className="text-muted-foreground font-mono leading-relaxed">
                  {g.channel === 'Shopee' && `SHOPEE_PARTNER_ID=\nSHOPEE_PARTNER_KEY=\nSHOPEE_SHOP_ID=\nSHOPEE_ACCESS_TOKEN=\nSHOPEE_REFRESH_TOKEN=`}
                  {g.channel === 'TikTok Shop' && `TIKTOK_APP_KEY=\nTIKTOK_APP_SECRET=\nTIKTOK_ACCESS_TOKEN=\nTIKTOK_SHOP_ID=\nTIKTOK_SHOP_CIPHER=`}
                  {g.channel === 'Lazada' && `LAZADA_APP_KEY=\nLAZADA_APP_SECRET=\nLAZADA_ACCESS_TOKEN=\nLAZADA_REGION=vn`}
                  {(g.channel === 'Facebook / Instagram') && `FACEBOOK_APP_ID=\nFACEBOOK_APP_SECRET=\nFACEBOOK_ACCESS_TOKEN=\nFACEBOOK_CATALOG_ID=\nFACEBOOK_PAGE_ID=\nFACEBOOK_VERIFY_TOKEN=`}
                </pre>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
