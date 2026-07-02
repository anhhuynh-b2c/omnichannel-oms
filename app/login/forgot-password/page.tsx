'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Store, Loader2, ArrowLeft, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
    })

    setLoading(false)
    if (error) {
      setError('Không thể gửi email. Vui lòng thử lại.')
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">OmniOMS</h1>
          <p className="text-slate-400 text-sm mt-1">Quản lý bán hàng đa kênh</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          {sent ? (
            <div className="text-center space-y-3 py-2">
              <div className="flex justify-center">
                <MailCheck className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-white font-semibold text-lg">Kiểm tra email của bạn</h2>
              <p className="text-slate-400 text-sm">
                Chúng tôi đã gửi link đặt lại mật khẩu đến <strong className="text-slate-200">{email}</strong>.
                Link có hiệu lực trong 1 giờ.
              </p>
              <p className="text-slate-500 text-xs">Không thấy email? Kiểm tra thư mục spam.</p>
            </div>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">Quên mật khẩu?</h2>
              <p className="text-slate-400 text-sm mb-5">
                Nhập email tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full h-10 px-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="flex justify-center mt-5">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}
