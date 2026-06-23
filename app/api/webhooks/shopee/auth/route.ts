import { type NextRequest, NextResponse } from 'next/server'
import { ShopeeService } from '@/services/integrations/shopee.service'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shopId = searchParams.get('shop_id')

  if (!code || !shopId) {
    return NextResponse.redirect(new URL('/integrations?error=shopee_auth_failed', request.url))
  }

  const svc = new ShopeeService({
    partnerId: parseInt(process.env.SHOPEE_PARTNER_ID!),
    partnerKey: process.env.SHOPEE_PARTNER_KEY!,
    shopId: parseInt(shopId),
    accessToken: '',
    environment: 'production',
  })

  const tokens = await svc.getAccessToken(code, parseInt(shopId))

  // Persist tokens in integrations table
  const supabase = await createServiceClient()
  await supabase
    .from('integrations')
    .upsert({
      channel_id: shopId,
      api_key: tokens.access_token,
      secret_key: tokens.refresh_token,
      status: 'CONNECTED',
    }, { onConflict: 'channel_id' })

  return NextResponse.redirect(new URL('/integrations?success=shopee_connected', request.url))
}
