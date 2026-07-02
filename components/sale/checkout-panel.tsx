'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/format'
import { Package, Banknote, CreditCard, Building2, Smartphone, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  qty: number
  stock: number
}

interface CheckoutPanelProps {
  cart: CartItem[]
  discount: number
  platformFee: number
  note: string
  channel: string
  customer: { phone: string; name: string; address: string; email?: string; city?: string; district?: string; customer_group?: string }
  staffName: string
  onCheckoutComplete: () => void
}

const CARRIERS = [
  { value: 'GHN', label: 'GHN' },
  { value: 'GHTK', label: 'GHTK' },
  { value: 'VTP', label: 'Viettel Post' },
  { value: 'SELF', label: 'Tự giao' },
]

const DIRECT_PAYMENTS = [
  { value: 'CASH',     label: 'Tiền mặt',    icon: Banknote },
  { value: 'TRANSFER', label: 'Chuyển khoản', icon: Building2 },
  { value: 'CARD',     label: 'Thẻ',          icon: CreditCard },
  { value: 'COD',      label: 'COD',          icon: Smartphone },
]

const PLATFORM_PAYMENTS: Record<string, { value: string; label: string; icon: typeof Banknote }[]> = {
  'Shopee': [
    { value: 'SHOPEE_PAY',   label: 'ShopeePay',     icon: ShoppingBag },
    { value: 'SHOPEE_COD',   label: 'COD Shopee',    icon: Smartphone },
    { value: 'TRANSFER',     label: 'Chuyển khoản',  icon: Building2 },
    { value: 'CARD',         label: 'Thẻ / Ví',      icon: CreditCard },
  ],
  'TikTok Shop': [
    { value: 'TIKTOK_PAY',   label: 'TikTok Pay',    icon: ShoppingBag },
    { value: 'TIKTOK_COD',   label: 'COD TikTok',    icon: Smartphone },
    { value: 'TRANSFER',     label: 'Chuyển khoản',  icon: Building2 },
  ],
  'Lazada': [
    { value: 'LAZADA_PAY',   label: 'LazPay',        icon: ShoppingBag },
    { value: 'LAZADA_COD',   label: 'COD Lazada',    icon: Smartphone },
    { value: 'CARD',         label: 'Thẻ / Ví',      icon: CreditCard },
  ],
  'Facebook': [
    { value: 'TRANSFER', label: 'Chuyển khoản', icon: Building2 },
    { value: 'CASH',     label: 'Tiền mặt',     icon: Banknote },
    { value: 'COD',      label: 'COD',           icon: Smartphone },
  ],
  'Zalo': [
    { value: 'TRANSFER', label: 'Chuyển khoản', icon: Building2 },
    { value: 'CASH',     label: 'Tiền mặt',     icon: Banknote },
    { value: 'COD',      label: 'COD',           icon: Smartphone },
  ],
}

export function CheckoutPanel({ cart, discount, platformFee, note, channel, customer, staffName, onCheckoutComplete }: CheckoutPanelProps) {
  const [carrier, setCarrier] = useState('GHN')
  const [weight, setWeight] = useState(500)
  const [shippingFee, setShippingFee] = useState(30000)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [vatRate, setVatRate] = useState(0)
  const [loading, setLoading] = useState(false)

  const paymentOptions = PLATFORM_PAYMENTS[channel] ?? DIRECT_PAYMENTS

  // Reset to first option when channel changes
  useEffect(() => {
    setPaymentMethod(paymentOptions[0]?.value ?? 'CASH')
  }, [channel]) // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal  = cart.reduce((s, item) => s + item.price * item.qty, 0)
  const vatAmount = Math.round(subtotal * vatRate / 100)
  const grandTotal = Math.max(0, subtotal - discount - platformFee + vatAmount + shippingFee)

  async function handleCheckout() {
    if (cart.length === 0) {
      toast.error('Chưa có sản phẩm trong giỏ hàng')
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, customer, items: cart, discount, platformFee, shippingFee, vatRate, paymentMethod, notes: note, staffName }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Thanh toán thất bại')
        return
      }

      toast.success(`Tạo đơn ${data.orderNumber} thành công!`)
      onCheckoutComplete()
    } catch {
      toast.error('Lỗi kết nối — vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">Thanh toán</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Payment method */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hình thức thanh toán</p>
            {PLATFORM_PAYMENTS[channel] && (
              <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                {channel}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {paymentOptions.map(m => {
              const Icon = m.icon
              const active = paymentMethod === m.value
              return (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-blue-500' : 'text-gray-400')} />
                  <span className="truncate">{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Shipping */}
        <div className="space-y-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vận chuyển</p>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Đơn vị vận chuyển</label>
            <select
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
              className="w-full h-8 text-sm border border-gray-200 rounded-md px-2 focus:outline-none focus:border-blue-400 bg-white"
            >
              {CARRIERS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Khối lượng (g)</label>
              <Input type="number" className="h-8 text-sm" value={weight}
                onChange={e => setWeight(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phí vận chuyển</label>
              <Input type="number" className="h-8 text-sm" value={shippingFee}
                onChange={e => setShippingFee(parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        {/* VAT */}
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Thuế VAT</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 5, 8, 10].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setVatRate(r)}
                className={cn(
                  'h-8 rounded-md text-xs font-medium border transition-colors',
                  vatRate === r
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                )}
              >
                {r === 0 ? 'Không VAT' : `${r}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tổng kết</p>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tạm tính</span><span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Giảm giá</span><span className="text-red-500">-{formatCurrency(discount)}</span>
            </div>
          )}
          {platformFee > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Phí sàn</span><span className="text-red-500">-{formatCurrency(platformFee)}</span>
            </div>
          )}
          {vatRate > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>VAT ({vatRate}%)</span><span className="text-orange-500">+{formatCurrency(vatAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Phí vận chuyển</span><span>{formatCurrency(shippingFee)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-800">Tổng thanh toán</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {cart.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <Package className="w-3.5 h-3.5" />
              <span>{cart.length} sản phẩm · {cart.reduce((s, i) => s + i.qty, 0)} đơn vị</span>
            </div>
            {cart.slice(0, 3).map(item => (
              <div key={item.productId} className="flex justify-between text-xs text-gray-600">
                <span className="truncate flex-1 mr-2">{item.name} x{item.qty}</span>
                <span className="shrink-0">{formatCurrency(item.price * item.qty)}</span>
              </div>
            ))}
            {cart.length > 3 && <p className="text-xs text-gray-400">+{cart.length - 3} sản phẩm khác</p>}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 shrink-0">
        <Button
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
          className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
        >
          {loading ? 'Đang xử lý...' : 'THANH TOÁN'}
        </Button>
      </div>
    </div>
  )
}
