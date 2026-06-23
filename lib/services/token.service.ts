/**
 * TokenService: quản lý vòng đời access_token cho tất cả các kênh.
 *
 * Vấn đề thực tế:
 *   - Shopee/TikTok/Lazada token hết hạn sau 30 ngày
 *   - Seller đổi mật khẩu → token chết ngay lập tức
 *   - Cần auto-refresh trước khi hết hạn, nếu không được → đánh dấu DISCONNECTED
 */

import { createServiceClient } from '@/lib/supabase/server'

export class TokenExpiredError extends Error {
  constructor(public channelId: string, public channelName: string) {
    super(`Token expired for channel ${channelName}. Reconnection required.`)
    this.name = 'TokenExpiredError'
  }
}

export interface ChannelCredentials {
  channelId: string
  channelName: string
  apiKey: string        // access_token
  secretKey: string     // refresh_token
  webhookUrl?: string
  expiresAt?: string    // ISO timestamp
}

export class TokenService {
  /**
   * Lấy credentials của một kênh từ database.
   * Throw TokenExpiredError nếu kênh đã bị DISCONNECTED.
   */
  static async getCredentials(channelId: string): Promise<ChannelCredentials> {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('integrations')
      .select('api_key, secret_key, webhook_url, status, expires_at, channels(name, id)')
      .eq('channel_id', channelId)
      .single()

    if (error || !data) throw new Error(`No integration found for channel ${channelId}`)

    const channel = data.channels as unknown as { id: string; name: string } | null
    const channelName = channel?.name ?? channelId

    if (data.status === 'DISCONNECTED' || data.status === 'ERROR') {
      throw new TokenExpiredError(channelId, channelName)
    }

    return {
      channelId,
      channelName,
      apiKey: data.api_key,
      secretKey: data.secret_key,
      webhookUrl: data.webhook_url ?? undefined,
      expiresAt: (data as Record<string, unknown>).expires_at as string | undefined,
    }
  }

  /**
   * Cập nhật token mới sau khi refresh thành công.
   */
  static async saveRefreshedToken(
    channelId: string,
    accessToken: string,
    refreshToken: string,
    expiresInSeconds: number
  ): Promise<void> {
    const supabase = await createServiceClient()
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    await supabase
      .from('integrations')
      .update({
        api_key: accessToken,
        secret_key: refreshToken,
        expires_at: expiresAt,
        status: 'CONNECTED',
      })
      .eq('channel_id', channelId)
  }

  /**
   * Đánh dấu kênh cần kết nối lại (token không thể refresh được).
   * UI sẽ hiển thị badge "Cần kết nối lại" cho seller.
   */
  static async markDisconnected(channelId: string, reason: string): Promise<void> {
    const supabase = await createServiceClient()

    await supabase
      .from('integrations')
      .update({
        status: 'ERROR',
        last_error: reason,
      })
      .eq('channel_id', channelId)
  }

  /**
   * Wrapper tiện lợi: thử gọi một API call, nếu token expired thì
   * tự refresh rồi retry. Nếu refresh cũng fail → markDisconnected.
   *
   * Dùng như sau:
   *   const orders = await TokenService.withAutoRefresh(
   *     channelId,
   *     () => shopeeService.getOrderList(...),
   *     async () => {
   *       const newToken = await shopeeService.refreshToken(refreshToken, shopId)
   *       return newToken
   *     }
   *   )
   */
  static async withAutoRefresh<T>(
    channelId: string,
    apiCall: () => Promise<T>,
    refreshFn: () => Promise<{ access_token: string; refresh_token: string; expire_in: number }>,
  ): Promise<T> {
    try {
      return await apiCall()
    } catch (err) {
      const msg = (err as Error).message ?? ''
      // Các nền tảng trả error code khác nhau khi token hết hạn
      const isExpired =
        msg.includes('invalid_access_token') ||  // Shopee
        msg.includes('token_expired') ||          // TikTok
        msg.includes('Token expired') ||          // Lazada
        msg.includes('OAuthException') ||         // Facebook
        msg.includes('190')                       // Facebook error code

      if (!isExpired) throw err

      // Thử refresh
      try {
        const newToken = await refreshFn()
        await this.saveRefreshedToken(
          channelId,
          newToken.access_token,
          newToken.refresh_token,
          newToken.expire_in,
        )
        // Retry lần 2 với token mới
        return await apiCall()
      } catch (refreshErr) {
        // Refresh cũng fail → seller phải kết nối lại thủ công
        await this.markDisconnected(channelId, (refreshErr as Error).message)
        throw new TokenExpiredError(channelId, channelId)
      }
    }
  }
}
