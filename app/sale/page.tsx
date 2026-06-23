'use client'

import { useState, useEffect } from 'react'
import { Menu, Store } from 'lucide-react'
import { ProductPanel } from '@/components/sale/product-panel'
import { OrderPanel } from '@/components/sale/order-panel'
import { CheckoutPanel } from '@/components/sale/checkout-panel'

interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  qty: number
  stock: number
}

export default function SalePage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [channel, setChannel] = useState('Direct')
  const [customer, setCustomer] = useState({ phone: '', name: '', address: '' })
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  function handleAddToCart(item: CartItem) {
    setCart(prev => {
      const existing = prev.find(c => c.productId === item.productId)
      if (existing) {
        return prev.map(c =>
          c.productId === item.productId
            ? { ...c, qty: Math.min(c.qty + 1, c.stock) }
            : c
        )
      }
      return [...prev, item]
    })
  }

  function handleUpdateQty(productId: string, qty: number) {
    setCart(prev =>
      prev.map(c => (c.productId === productId ? { ...c, qty } : c))
    )
  }

  function handleUpdatePrice(productId: string, price: number) {
    setCart(prev =>
      prev.map(c => (c.productId === productId ? { ...c, price } : c))
    )
  }

  function handleRemove(productId: string) {
    setCart(prev => prev.filter(c => c.productId !== productId))
  }

  function handleCustomerChange(field: 'phone' | 'name' | 'address', value: string) {
    setCustomer(prev => ({ ...prev, [field]: value }))
  }

  function handleCheckoutComplete() {
    setCart([])
    setDiscount(0)
    setNote('')
    setCustomer({ phone: '', name: '', address: '' })
  }

  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Top navbar */}
      <header className="flex items-center justify-between h-12 px-4 bg-slate-900 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold">OMS</span>
          <span className="text-slate-400 text-xs ml-2">Bán hàng tại quầy</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400">{dateStr}</p>
            <p className="text-sm font-mono font-medium">{timeStr}</p>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: product catalog 280px */}
        <div className="w-[280px] shrink-0 overflow-hidden">
          <ProductPanel onAddToCart={handleAddToCart} />
        </div>

        {/* Center: order details flex-1 */}
        <div className="flex-1 overflow-hidden">
          <OrderPanel
            cart={cart}
            onUpdateQty={handleUpdateQty}
            onUpdatePrice={handleUpdatePrice}
            onRemove={handleRemove}
            discount={discount}
            onDiscountChange={setDiscount}
            note={note}
            onNoteChange={setNote}
            channel={channel}
            onChannelChange={setChannel}
            customer={customer}
            onCustomerChange={handleCustomerChange}
          />
        </div>

        {/* Right: checkout 320px */}
        <div className="w-[320px] shrink-0 overflow-hidden">
          <CheckoutPanel
            cart={cart}
            discount={discount}
            onCheckoutComplete={handleCheckoutComplete}
          />
        </div>
      </div>
    </div>
  )
}
