'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/format'
import { Package } from 'lucide-react'

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
  note: string
  channel: string
  customer: { phone: string; name: string; address: string }
  onCheckoutComplete: () => void
}

const CARRIERS = [
  { value: 'GHN', label: 'GHN' },
  { value: 'GHTK', label: 'GHTK' },
  { value: 'VTP', label: 'Viettel Post' },
  { value: 'SELF', label: 'Tự giao' },
]

export function CheckoutPanel({ cart, discount, note, channel, customer, onCheckoutComplete }: CheckoutPanelProps) {
  const [carrier, setCarrier] = useState('GHN')
  const [weight, setWeight] = useState(500)
  const [shippingFee, setShippingFee] = useState(30000)
  const [codAmount, setCodAmount] = useState(0)
  const [isCod, setIsCod] = useState(false)
  const [loading, setLoading] = useState(false)

  const subtotal = cart.reduce((s, item) => s + item.price * item.qty, 0)
  const grandTotal = Math.max(0, subtotal - discount + shippingFee)

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
        body: JSON.stringify({ channel, customer, items: cart, discount, shippingFee, notes: note }),
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
        {/* Shipping */}
        <div className="space-y-3">
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

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 cursor-pointer select-none" htmlFor="cod-toggle">
              Thu hộ COD
            </label>
            <button
              id="cod-toggle"
              onClick={() => setIsCod(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isCod ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isCod ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {isCod && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Số tiền COD</label>
              <Input type="number" className="h-8 text-sm" value={codAmount}
                onChange={e => setCodAmount(parseInt(e.target.value) || 0)} placeholder="0" />
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tổng kết</p>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tạm tính</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Giảm giá</span><span className="text-red-500">-{formatCurrency(discount)}</span>
          </div>
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
