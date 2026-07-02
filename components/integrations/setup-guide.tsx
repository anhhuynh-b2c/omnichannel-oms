'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ChannelIcon } from '@/components/shared/channel-icon'

interface Step {
  title: string
  desc: string
  code?: string
}

interface SyncOption {
  key: string
  label: string
  desc: string
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
  syncOptions: SyncOption[]
  envVars: string
}

const GUIDES: ChannelGuide[] = [
  {
    channel: 'Shopee',
    icon: '/channels/shopee.svg',
    color: '#EE4D2D',
    docsUrl: 'https://open.shopee.com/documents/v2',
    partnerUrl: 'https://partner.shopeemobile.com',
    authType: 'HMAC-SHA256 + OAuth',
    syncOptions: [
      { key: 'orders', label: 'Đồng bộ đơn hàng', desc: 'Tự động kéo đơn mới từ Shopee về OMS theo real-time webhook hoặc polling 5 phút' },
      { key: 'inventory', label: 'Đồng bộ tồn kho', desc: 'Cập nhật số lượng tồn kho ngược lên Shopee sau mỗi giao dịch bán hàng' },
      { key: 'products', label: 'Đồng bộ sản phẩm', desc: 'Map SKU Shopee (model_sku) về master_sku nội bộ, đồng bộ giá và mô tả' },
      { key: 'tracking', label: 'Cập nhật vận chuyển', desc: 'Đẩy tracking number và trạng thái vận chuyển lên Shopee tự động' },
    ],
    steps: [
      { title: 'Đăng ký Partner Account', desc: 'Truy cập partner.shopeemobile.com → Tạo app → Nhận partner_id và partner_key' },
      { title: 'Cấu hình Redirect URL', desc: 'Set URL callback: https://your-domain.com/api/webhooks/shopee/auth' },
      {
        title: 'Lấy Access Token',
        desc: 'Redirect merchant đến Shopee auth URL → nhận auth_code → exchange lấy access_token',
        code: 'GET /api/v2/shop/auth_partner?partner_id=...&sign=...\nPOST /api/v2/auth/token/get\n{ code, shop_id, partner_id }',
      },
      { title: 'Kích hoạt Webhook', desc: 'Đăng ký webhook URL trong Partner Portal. Shopee gửi sự kiện khi đơn thay đổi trạng thái.' },
      { title: 'Map SKU', desc: 'Trong bảng channel_sku_mapping: map model_sku của Shopee về master_sku nội bộ.' },
    ],
    webhookEvents: ['ORDER_STATUS_UPDATE (code=3)', 'SHOP_UPDATE (code=5)', 'ITEM_STOCK_UPDATE (code=10)'],
    envVars: 'SHOPEE_PARTNER_ID=\nSHOPEE_PARTNER_KEY=\nSHOPEE_SHOP_ID=\nSHOPEE_ACCESS_TOKEN=\nSHOPEE_REFRESH_TOKEN=',
  },
  {
    channel: 'TikTok Shop',
    icon: '/channels/tiktok.svg',
    color: '#000000',
    docsUrl: 'https://partner.tiktokshop.com/doc',
    partnerUrl: 'https://partner.tiktokshop.com',
    authType: 'HMAC-SHA256 + OAuth 2.0',
    syncOptions: [
      { key: 'orders', label: 'Đồng bộ đơn hàng', desc: 'Nhận đơn TikTok Shop qua webhook order.status_change, map về trạng thái OMS' },
      { key: 'inventory', label: 'Đồng bộ tồn kho', desc: 'Update stock về TikTok sau bán hàng qua API /product/202309/inventory/update' },
      { key: 'products', label: 'Đồng bộ sản phẩm', desc: 'Đồng bộ sản phẩm và giá lên TikTok Shop theo batch hoặc real-time' },
      { key: 'fulfillment', label: 'Xử lý fulfillment', desc: 'Cập nhật trạng thái giao hàng, tracking number sau khi đóng gói' },
    ],
    steps: [
      { title: 'Tạo app TikTok Shop', desc: 'Đăng ký tại partner.tiktokshop.com → Create App → Nhận app_key và app_secret' },
      {
        title: 'Cấu hình OAuth',
        desc: 'Redirect seller đến TikTok auth để cấp quyền cho app',
        code: 'GET https://auth.tiktok-shops.com/oauth/authorize\n?app_key={app_key}&state={random_state}',
      },
      {
        title: 'Exchange Token',
        desc: 'Sau khi seller authorize, exchange code lấy access_token',
        code: 'GET /api/authorization/202309/token\n?app_key=...&auth_code=...&sign=...',
      },
      {
        title: 'Ký Request (SHA256)',
        desc: 'Mỗi request phải ký: app_secret + path + sorted_params + body + app_secret',
        code: 'sign = HMAC-SHA256(app_secret,\n  app_secret + path + sorted_params + body + app_secret\n)',
      },
      { title: 'Đăng ký Webhook', desc: 'Trong Partner Portal → Webhooks → Add endpoint URL → Subscribe events' },
    ],
    webhookEvents: ['order.status_change', 'product.inventory_change', 'shop.settings_update'],
    envVars: 'TIKTOK_APP_KEY=\nTIKTOK_APP_SECRET=\nTIKTOK_ACCESS_TOKEN=\nTIKTOK_SHOP_ID=\nTIKTOK_SHOP_CIPHER=',
  },
  {
    channel: 'Lazada',
    icon: '/channels/lazada.svg',
    color: '#0F146D',
    docsUrl: 'https://open.lazada.com/apps/doc/api',
    partnerUrl: 'https://open.lazada.com',
    authType: 'HMAC-SHA256',
    syncOptions: [
      { key: 'orders', label: 'Đồng bộ đơn hàng', desc: 'Nhận đơn qua webhook order_created, pull thêm bằng GetOrders API mỗi 10 phút' },
      { key: 'inventory', label: 'Đồng bộ tồn kho', desc: 'Cập nhật stock qua SetInventory API sau mỗi thay đổi trong OMS' },
      { key: 'products', label: 'Đồng bộ sản phẩm', desc: 'Đồng bộ sản phẩm và SKU qua CreateProduct / UpdateProduct API' },
      { key: 'multiregion', label: 'Multi-region', desc: 'Lazada có endpoint riêng cho từng quốc gia (VN/SG/TH), cấu hình từng shop riêng biệt' },
    ],
    steps: [
      { title: 'Đăng ký Lazada Open Platform', desc: 'Vào open.lazada.com → Register → Tạo app → Nhận app_key và app_secret' },
      { title: 'Chọn Region', desc: 'Lazada có API endpoint khác nhau theo quốc gia:\n- VN: api.lazada.vn/rest\n- SG: api.lazada.sg/rest\n- TH: api.lazada.co.th/rest' },
      {
        title: 'OAuth Authorization',
        desc: 'Redirect seller đến Lazada auth, nhận code, exchange lấy access_token',
        code: 'GET https://auth.lazada.com/oauth/authorize\n?response_type=code&client_id={app_key}&redirect_uri=...\n\nPOST https://auth.lazada.com/rest\n?action=GetAccessToken&code=...',
      },
      {
        title: 'Ký mọi Request',
        desc: 'Ký bằng HMAC-SHA256: sign( action + sorted_params )',
        code: 'signature = HMAC-SHA256(app_secret,\n  action_path + sorted(key+value pairs)\n).toUpperCase()',
      },
      { title: 'Subscribe Push Notification', desc: 'Trong app settings → Webhook URL → Subscribe: order_created, order_item_status_changed' },
    ],
    webhookEvents: ['order_created', 'order_item_status_changed', 'product_stock_changed'],
    envVars: 'LAZADA_APP_KEY=\nLAZADA_APP_SECRET=\nLAZADA_ACCESS_TOKEN=\nLAZADA_REGION=vn',
  },
  {
    channel: 'Facebook / Instagram',
    icon: '/channels/facebook.svg',
    color: '#1877F2',
    docsUrl: 'https://developers.facebook.com/docs/commerce-platform',
    partnerUrl: 'https://developers.facebook.com',
    authType: 'OAuth 2.0 (Meta Graph API)',
    syncOptions: [
      { key: 'orders', label: 'Đồng bộ đơn hàng', desc: 'Nhận đơn Facebook Shop / Instagram Checkout qua webhook orders, xử lý qua Graph API' },
      { key: 'catalog', label: 'Đồng bộ catalog', desc: 'Tự động cập nhật product catalog và giá lên Facebook/Instagram theo lịch hoặc real-time' },
      { key: 'inventory', label: 'Đồng bộ tồn kho', desc: 'Cập nhật số lượng trong catalog khi bán hàng để tránh overselling' },
      { key: 'messaging', label: 'Messenger / DM', desc: 'Tích hợp Messenger API để nhận và xử lý đơn đặt qua chat (optional)' },
    ],
    steps: [
      { title: 'Tạo Meta App', desc: 'Vào developers.facebook.com → Create App → Business type → Enable Commerce product' },
      { title: 'Yêu cầu Permissions', desc: 'Cần các quyền: catalog_management, commerce_account_read_orders, commerce_account_manage_orders, instagram_shopping_tag_products' },
      {
        title: 'OAuth Flow',
        desc: 'Redirect user đến Facebook Login dialog với required scopes',
        code: 'GET https://www.facebook.com/v18.0/dialog/oauth\n?client_id={app_id}&redirect_uri=...&scope=catalog_management,...',
      },
      {
        title: 'Lấy Page Access Token',
        desc: 'Short-lived token → exchange lấy Long-lived token (60 ngày)',
        code: 'GET /oauth/access_token\n?grant_type=fb_exchange_token\n&client_id=...&client_secret=...\n&fb_exchange_token={short_token}',
      },
      {
        title: 'Webhook Verification',
        desc: 'Facebook gửi GET request với hub.challenge. Trả về challenge để verify.',
        code: 'GET /api/webhooks/facebook\n?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...\n→ return hub.challenge',
      },
    ],
    webhookEvents: ['orders (order_status)', 'products (catalog_update)', 'commerce (checkout)'],
    envVars: 'FACEBOOK_APP_ID=\nFACEBOOK_APP_SECRET=\nFACEBOOK_ACCESS_TOKEN=\nFACEBOOK_CATALOG_ID=\nFACEBOOK_PAGE_ID=\nFACEBOOK_VERIFY_TOKEN=',
  },
]

function AccordionItem({ guide, isOpen, onToggle }: { guide: ChannelGuide; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 bg-card hover:bg-muted/40 transition-colors text-left"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${guide.color}18`, border: `1px solid ${guide.color}30` }}
        >
          <ChannelIcon icon={guide.icon} size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{guide.channel}</p>
          <p className="text-xs text-muted-foreground">Auth: {guide.authType}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={guide.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> API Docs
          </a>
          <a
            href={guide.partnerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Partner Portal
          </a>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t bg-muted/20 px-5 py-5 space-y-6">
          {/* Sync Options */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tùy chọn đồng bộ</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {guide.syncOptions.map(opt => (
                <div key={opt.key} className="bg-card border rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold" style={{ color: guide.color }}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Các bước tích hợp</p>
            <div className="space-y-3">
              {guide.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: guide.color }}
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
          </div>

          {/* Webhook Events + Env Vars side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Webhook Events cần subscribe</p>
              <div className="flex flex-wrap gap-2">
                {guide.webhookEvents.map(ev => (
                  <Badge key={ev} variant="outline" className="text-xs font-mono">
                    {ev}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs font-semibold mb-2">Biến môi trường (.env.local)</p>
              <pre className="text-xs text-muted-foreground font-mono leading-relaxed">{guide.envVars}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SetupGuide() {
  const [openChannel, setOpenChannel] = useState<string | null>(null)

  const toggle = (channel: string) => {
    setOpenChannel(prev => (prev === channel ? null : channel))
  }

  return (
    <div>
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        📋 Hướng dẫn kết nối từng nền tảng
      </p>
      <div className="space-y-2">
        {GUIDES.map(g => (
          <AccordionItem
            key={g.channel}
            guide={g}
            isOpen={openChannel === g.channel}
            onToggle={() => toggle(g.channel)}
          />
        ))}
      </div>
    </div>
  )
}
