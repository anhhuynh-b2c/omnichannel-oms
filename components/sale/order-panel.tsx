'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Trash2, ChevronDown, UserSearch } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/format'
import { CHANNEL_ICONS, CHANNEL_COLORS } from '@/constants'
import type { ChannelName } from '@/types'
import { cn } from '@/lib/utils'

interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  qty: number
  stock: number
}

interface OrderPanelProps {
  cart: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onUpdatePrice: (productId: string, price: number) => void
  onRemove: (productId: string) => void
  discount: number
  onDiscountChange: (v: number) => void
  note: string
  onNoteChange: (v: string) => void
  channel: string
  onChannelChange: (v: string) => void
  customer: { phone: string; name: string; address: string }
  onCustomerChange: (field: 'phone' | 'name' | 'address', value: string) => void
}

const CHANNELS: { value: string; label: string; icon: string; color: string }[] = [
  { value: 'Direct',      label: 'Bán trực tiếp', icon: '🤝', color: '#10B981' },
  { value: 'Shopee',      label: 'Shopee',         icon: CHANNEL_ICONS['Shopee'],       color: CHANNEL_COLORS['Shopee'] },
  { value: 'TikTok Shop', label: 'TikTok Shop',    icon: CHANNEL_ICONS['TikTok Shop'],  color: CHANNEL_COLORS['TikTok Shop'] },
  { value: 'Lazada',      label: 'Lazada',          icon: CHANNEL_ICONS['Lazada'],       color: CHANNEL_COLORS['Lazada'] },
  { value: 'Facebook',    label: 'Facebook',        icon: CHANNEL_ICONS['Facebook'],     color: CHANNEL_COLORS['Facebook'] },
  { value: 'Instagram',   label: 'Instagram',       icon: CHANNEL_ICONS['Instagram'],    color: CHANNEL_COLORS['Instagram'] },
  { value: 'Zalo',        label: 'Zalo',            icon: CHANNEL_ICONS['Zalo'],         color: CHANNEL_COLORS['Zalo'] },
  { value: 'Website',     label: 'Website',         icon: CHANNEL_ICONS['Website'],      color: CHANNEL_COLORS['Website'] },
]

export function OrderPanel({
  cart, onUpdateQty, onUpdatePrice, onRemove,
  discount, onDiscountChange, note, onNoteChange,
  channel, onChannelChange, customer, onCustomerChange,
}: OrderPanelProps) {
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const grandTotal = Math.max(0, subtotal - discount)
  const activeChannel = CHANNELS.find(c => c.value === channel) ?? CHANNELS[0]

  // Close channel menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowChannelMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Tab bar */}
      <div className="flex items-center bg-white border-b border-gray-200 px-3 shrink-0">
        <div className="flex items-center">
          {/* Active invoice tab */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-b-0 border-blue-200 px-3 py-2 rounded-t-lg mt-px -mb-px z-10">
            <span>Hóa đơn 1</span>
            <button className="hover:text-red-500 transition-colors ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
          {/* New invoice */}
          <button className="flex items-center gap-1 text-gray-400 hover:text-blue-600 text-xs px-2 py-2 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Channel selector */}
        <div className="ml-auto relative" ref={menuRef}>
          <button
            onClick={() => setShowChannelMenu(v => !v)}
            className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <span>{activeChannel.icon}</span>
            <span className="font-medium">{activeChannel.label}</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {showChannelMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-48 py-1 overflow-hidden">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide px-3 py-1.5 font-semibold">Kênh bán</p>
              {CHANNELS.map(c => (
                <button
                  key={c.value}
                  onClick={() => { onChannelChange(c.value); setShowChannelMenu(false) }}
                  className={cn(
                    'w-full flex items-center gap-2.5 text-left text-sm px-3 py-2 transition-colors',
                    channel === c.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span className="text-base leading-none">{c.icon}</span>
                  <span>{c.label}</span>
                  {channel === c.value && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Customer */}
        <div className="bg-white mx-2 mt-2 mb-0 rounded-lg border border-gray-200 p-3">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <UserSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="w-full pl-8 h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                placeholder="Số điện thoại (F4)"
                value={customer.phone}
                onChange={e => onCustomerChange('phone', e.target.value)}
              />
            </div>
            <button className="text-xs text-blue-600 hover:underline px-2 shrink-0">Tìm</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-3 bg-white"
              placeholder="Tên người nhận"
              value={customer.name}
              onChange={e => onCustomerChange('name', e.target.value)}
            />
            <input
              className="h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-3 bg-white"
              placeholder="Địa chỉ giao hàng"
              value={customer.address}
              onChange={e => onCustomerChange('address', e.target.value)}
            />
          </div>
        </div>

        {/* Cart */}
        <div className="mx-2 mt-2">
          {cart.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-gray-300 py-10 text-center">
              <p className="text-sm text-gray-400">Chưa có sản phẩm</p>
              <p className="text-xs text-gray-300 mt-1">Chọn từ bảng bên trái</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Sản phẩm</th>
                    <th className="text-center px-2 py-2 font-medium text-gray-500 w-16">SL</th>
                    <th className="text-right px-2 py-2 font-medium text-gray-500 w-28">Đơn giá</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 w-24">Thành tiền</th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map(item => (
                    <tr key={item.productId} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-800 leading-tight">{item.name}</p>
                        <p className="text-gray-400 font-mono">{item.sku}</p>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.qty}
                          onChange={e => onUpdateQty(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 text-center h-7 border border-gray-200 rounded focus:outline-none focus:border-blue-400 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.price}
                          onChange={e => onUpdatePrice(item.productId, parseInt(e.target.value) || 0)}
                          className="w-24 text-right h-7 border border-gray-200 rounded focus:outline-none focus:border-blue-400 px-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-700">
                        {formatCurrency(item.price * item.qty)}
                      </td>
                      <td className="pr-1.5">
                        <button
                          onClick={() => onRemove(item.productId)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mx-2 mt-2 mb-3 bg-white rounded-lg border border-gray-200 p-3 space-y-2">
          <input
            className="w-full h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-3 bg-white"
            placeholder="Ghi chú đơn hàng..."
            value={note}
            onChange={e => onNoteChange(e.target.value)}
          />

          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Tổng tiền hàng</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Giảm giá</span>
            <input
              type="number"
              min={0}
              value={discount}
              onChange={e => onDiscountChange(parseInt(e.target.value) || 0)}
              className="w-28 text-right h-7 border border-gray-200 rounded focus:outline-none focus:border-blue-400 px-2 text-sm"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="font-bold text-gray-800">Khách cần trả</span>
            <span className="text-lg font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
