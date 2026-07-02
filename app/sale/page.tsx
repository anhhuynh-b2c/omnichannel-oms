'use client'

import { useState, useEffect, useCallback } from 'react'
import { Store, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProductPanel } from '@/components/sale/product-panel'
import { OrderPanel } from '@/components/sale/order-panel'
import { CheckoutPanel } from '@/components/sale/checkout-panel'
import { getAccountProfile } from '@/lib/actions/account.actions'

export interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  qty: number
  stock: number
}

export interface CustomerFields {
  phone: string
  name: string
  address: string
  email: string
  city: string
  district: string
  customer_group: string
}

export interface Invoice {
  id: string
  label: string
  cart: CartItem[]
  discount: number
  platformFee: number
  note: string
  channel: string
  customer: CustomerFields
}

const EMPTY_CUSTOMER: CustomerFields = {
  phone: '', name: '', address: '', email: '', city: '', district: '', customer_group: 'REGULAR',
}

function makeInvoice(n: number): Invoice {
  return {
    id: crypto.randomUUID(),
    label: `Hóa đơn ${n}`,
    cart: [],
    discount: 0,
    platformFee: 0,
    note: '',
    channel: 'Direct',
    customer: { ...EMPTY_CUSTOMER },
  }
}

export default function SalePage() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => [makeInvoice(1)])
  const [activeId, setActiveId] = useState<string>(() => '')
  const [staffName, setStaffName] = useState<string>('')
  const [now, setNow] = useState(new Date())

  // Set activeId once invoices is initialized
  useEffect(() => {
    if (invoices.length > 0 && !activeId) {
      setActiveId(invoices[0].id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch current user name
  useEffect(() => {
    getAccountProfile().then(p => setStaffName(p.name || 'Nhân viên')).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const active = invoices.find(inv => inv.id === activeId) ?? invoices[0]

  function updateActive(patch: Partial<Invoice>) {
    setInvoices(prev => prev.map(inv => inv.id === active.id ? { ...inv, ...patch } : inv))
  }

  // Invoice tab management
  function addInvoice() {
    const n = invoices.length + 1
    const inv = makeInvoice(n)
    setInvoices(prev => [...prev, inv])
    setActiveId(inv.id)
  }

  function closeInvoice(id: string) {
    if (invoices.length === 1) return // keep at least one
    const idx = invoices.findIndex(inv => inv.id === id)
    const next = invoices[idx === 0 ? 1 : idx - 1]
    setInvoices(prev => prev.filter(inv => inv.id !== id))
    if (id === activeId) setActiveId(next.id)
  }

  // Cart operations
  const handleAddToCart = useCallback((item: CartItem) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== activeId) return inv
      const existing = inv.cart.find(c => c.productId === item.productId)
      return {
        ...inv,
        cart: existing
          ? inv.cart.map(c => c.productId === item.productId
              ? { ...c, qty: Math.min(c.qty + 1, c.stock) } : c)
          : [...inv.cart, item],
      }
    }))
  }, [activeId])

  function handleUpdateQty(productId: string, qty: number) {
    updateActive({ cart: active.cart.map(c => c.productId === productId ? { ...c, qty } : c) })
  }
  function handleUpdatePrice(productId: string, price: number) {
    updateActive({ cart: active.cart.map(c => c.productId === productId ? { ...c, price } : c) })
  }
  function handleRemove(productId: string) {
    updateActive({ cart: active.cart.filter(c => c.productId !== productId) })
  }
  function handleCustomerChange(field: keyof CustomerFields, value: string) {
    updateActive({ customer: { ...active.customer, [field]: value } })
  }
  function handleCheckoutComplete() {
    updateActive({ cart: [], discount: 0, platformFee: 0, note: '', customer: { ...EMPTY_CUSTOMER } })
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
          <Link href="/" className="text-slate-400 hover:text-white transition-colors p-1 rounded">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-bold">OMS</span>
          <span className="text-slate-400 text-xs ml-2">Bán hàng tại quầy</span>
        </div>
        <div className="flex items-center gap-4">
          {staffName && (
            <span className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded">
              👤 {staffName}
            </span>
          )}
          <div className="text-right" suppressHydrationWarning>
            <p className="text-xs text-slate-400" suppressHydrationWarning>{dateStr}</p>
            <p className="text-sm font-mono font-medium" suppressHydrationWarning>{timeStr}</p>
          </div>
        </div>
      </header>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[280px] shrink-0 overflow-hidden">
          <ProductPanel onAddToCart={handleAddToCart} />
        </div>

        <div className="flex-1 overflow-hidden">
          {active && (
            <OrderPanel
              invoices={invoices}
              activeId={active.id}
              onSelectInvoice={setActiveId}
              onAddInvoice={addInvoice}
              onCloseInvoice={closeInvoice}
              cart={active.cart}
              onUpdateQty={handleUpdateQty}
              onUpdatePrice={handleUpdatePrice}
              onRemove={handleRemove}
              discount={active.discount}
              onDiscountChange={v => updateActive({ discount: v })}
              platformFee={active.platformFee}
              onPlatformFeeChange={v => updateActive({ platformFee: v })}
              note={active.note}
              onNoteChange={v => updateActive({ note: v })}
              channel={active.channel}
              onChannelChange={v => updateActive({ channel: v })}
              customer={active.customer}
              onCustomerChange={handleCustomerChange}
              staffName={staffName}
            />
          )}
        </div>

        <div className="w-[320px] shrink-0 overflow-hidden">
          {active && (
            <CheckoutPanel
              cart={active.cart}
              discount={active.discount}
              platformFee={active.platformFee}
              note={active.note}
              channel={active.channel}
              customer={active.customer}
              staffName={staffName}
              onCheckoutComplete={handleCheckoutComplete}
            />
          )}
        </div>
      </div>
    </div>
  )
}
