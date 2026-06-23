/**
 * Cấu hình môi trường cho từng kênh bán hàng.
 *
 * QUY TRÌNH XIN DUYỆT:
 *   1. Tạo app trên Partner Portal của từng sàn
 *   2. Điền thông tin + URL vào form đăng ký
 *   3. Quay video demo màn hình (Shopee, Meta yêu cầu)
 *   4. Đợi duyệt (1–4 tuần)
 *   5. Sau khi duyệt → đổi sang production credentials
 *
 * SANDBOX vs PRODUCTION:
 *   Shopee:    NEXT_PUBLIC_APP_ENV=sandbox → dùng test-stable endpoint
 *   TikTok:    Dùng sandbox shop_id riêng từ Partner Center
 *   Lazada:    Thêm ?is_test=true vào mọi request
 *   Facebook:  Dùng test user + test catalog trong app dashboard
 */

const isSandbox = process.env.NEXT_PUBLIC_APP_ENV !== 'production'

export const CHANNEL_CONFIG = {
  shopee: {
    environment: isSandbox ? 'sandbox' as const : 'production' as const,
    partnerId:   parseInt(process.env.SHOPEE_PARTNER_ID ?? '0'),
    partnerKey:  process.env.SHOPEE_PARTNER_KEY ?? '',
    shopId:      parseInt(process.env.SHOPEE_SHOP_ID ?? '0'),
    accessToken: process.env.SHOPEE_ACCESS_TOKEN ?? '',
    // Sandbox: test-stable.shopeemobile.com | Production: partner.shopeemobile.com
  },

  tiktok: {
    appKey:      process.env.TIKTOK_APP_KEY ?? '',
    appSecret:   process.env.TIKTOK_APP_SECRET ?? '',
    accessToken: process.env.TIKTOK_ACCESS_TOKEN ?? '',
    shopId:      process.env.TIKTOK_SHOP_ID ?? '',
    shopCipher:  process.env.TIKTOK_SHOP_CIPHER ?? '',
    // Sandbox: dùng shop_id = sandbox shop từ Partner Center
  },

  lazada: {
    appKey:      process.env.LAZADA_APP_KEY ?? '',
    appSecret:   process.env.LAZADA_APP_SECRET ?? '',
    accessToken: process.env.LAZADA_ACCESS_TOKEN ?? '',
    region:      (process.env.LAZADA_REGION ?? 'vn') as 'vn' | 'sg' | 'th' | 'ph' | 'my' | 'id',
    isSandbox,
    // Sandbox: thêm is_test=true trong buildParams()
  },

  facebook: {
    appId:       process.env.FACEBOOK_APP_ID ?? '',
    appSecret:   process.env.FACEBOOK_APP_SECRET ?? '',
    accessToken: process.env.FACEBOOK_ACCESS_TOKEN ?? '',
    catalogId:   process.env.FACEBOOK_CATALOG_ID ?? '',
    pageId:      process.env.FACEBOOK_PAGE_ID ?? '',
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN ?? '',
    // Sandbox: tạo test user trong App Dashboard → Roles → Test Users
  },
} as const

// Kiểm tra xem kênh nào đã được cấu hình (có credentials thật)
export function isChannelConfigured(channel: keyof typeof CHANNEL_CONFIG): boolean {
  switch (channel) {
    case 'shopee':   return CHANNEL_CONFIG.shopee.partnerId > 0 && CHANNEL_CONFIG.shopee.partnerKey.length > 0
    case 'tiktok':   return CHANNEL_CONFIG.tiktok.appKey.length > 0
    case 'lazada':   return CHANNEL_CONFIG.lazada.appKey.length > 0
    case 'facebook': return CHANNEL_CONFIG.facebook.appId.length > 0
    default:         return false
  }
}

// Log môi trường khi khởi động (chỉ server-side)
if (typeof window === 'undefined') {
  const configured = Object.keys(CHANNEL_CONFIG)
    .filter(k => isChannelConfigured(k as keyof typeof CHANNEL_CONFIG))
  console.log(`[Channels] Mode: ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} | Configured: ${configured.join(', ') || 'none (mock mode)'}`)
}
