'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Trash2, ChevronDown, UserSearch, Loader2, ChevronUp, User } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { CHANNEL_ICONS, CHANNEL_COLORS } from '@/constants'
import type { ChannelName } from '@/types'
import { cn } from '@/lib/utils'
import { ChannelIcon } from '@/components/shared/channel-icon'
import type { Invoice, CartItem, CustomerFields } from '@/app/sale/page'

interface SearchedCustomer {
  id: string
  name: string
  phone: string
  address: string | null
  email: string | null
  city: string | null
  district: string | null
  customer_group: string
}

interface OrderPanelProps {
  invoices: Invoice[]
  activeId: string
  onSelectInvoice: (id: string) => void
  onAddInvoice: () => void
  onCloseInvoice: (id: string) => void
  cart: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onUpdatePrice: (productId: string, price: number) => void
  onRemove: (productId: string) => void
  discount: number
  onDiscountChange: (v: number) => void
  platformFee: number
  onPlatformFeeChange: (v: number) => void
  note: string
  onNoteChange: (v: string) => void
  channel: string
  onChannelChange: (v: string) => void
  customer: CustomerFields
  onCustomerChange: (field: keyof CustomerFields, value: string) => void
  staffName: string
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

const MARKETPLACE_CHANNELS = new Set(['Shopee', 'TikTok Shop', 'Lazada'])

const GROUP_LABELS: Record<string, string> = {
  REGULAR: 'Thường', LOYAL: 'Thân thiết', VIP: 'VIP',
}

export function OrderPanel({
  invoices, activeId, onSelectInvoice, onAddInvoice, onCloseInvoice,
  cart, onUpdateQty, onUpdatePrice, onRemove,
  discount, onDiscountChange, platformFee, onPlatformFeeChange,
  note, onNoteChange, channel, onChannelChange, customer, onCustomerChange,
  staffName,
}: OrderPanelProps) {
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchedCustomer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const customerRef = useRef<HTMLDivElement>(null)
  const [showExtraFields, setShowExtraFields] = useState(false)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowChannelMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleCustomerSearch() {
    if (!customer.phone.trim()) return
    setSearchLoading(true)
    const res = await fetch(`/api/customers/search?phone=${encodeURIComponent(customer.phone)}`)
    const data = await res.json()
    setSuggestions(Array.isArray(data) ? data : [])
    setShowSuggestions(true)
    setSearchLoading(false)
  }

  function selectCustomer(c: SearchedCustomer) {
    onCustomerChange('phone', c.phone)
    onCustomerChange('name', c.name)
    onCustomerChange('address', c.address ?? '')
    onCustomerChange('email', c.email ?? '')
    onCustomerChange('city', c.city ?? '')
    onCustomerChange('district', c.district ?? '')
    onCustomerChange('customer_group', c.customer_group ?? 'REGULAR')
    setShowSuggestions(false)
    setSuggestions([])
    // Auto-expand extra fields if there's data
    if (c.email || c.city || c.district) setShowExtraFields(true)
  }

  const set = (field: keyof CustomerFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onCustomerChange(field, e.target.value)

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const grandTotal = Math.max(0, subtotal - discount - platformFee)
  const activeChannel = CHANNELS.find(c => c.value === channel) ?? CHANNELS[0]
  const isMarketplace = MARKETPLACE_CHANNELS.has(channel)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Tab bar */}
      <div className="flex items-center bg-white border-b border-gray-200 px-3 shrink-0 overflow-x-auto">
        <div className="flex items-center shrink-0">
          {invoices.map(inv => (
            <div
              key={inv.id}
              onClick={() => onSelectInvoice(inv.id)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-t-lg mt-px -mb-px z-10 cursor-pointer select-none transition-colors',
                inv.id === activeId
                  ? 'text-blue-700 bg-blue-50 border border-b-0 border-blue-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              <span className="whitespace-nowrap">{inv.label}</span>
              {inv.cart.length > 0 && (
                <span className={cn(
                  'text-[10px] px-1 rounded-full font-bold',
                  inv.id === activeId ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-500'
                )}>
                  {inv.cart.length}
                </span>
              )}
              {invoices.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); onCloseInvoice(inv.id) }}
                  className="hover:text-red-500 transition-colors ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={onAddInvoice}
            className="flex items-center gap-1 text-gray-400 hover:text-blue-600 text-xs px-2 py-2 transition-colors"
            title="Thêm hóa đơn mới"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Channel selector */}
        <div className="ml-auto relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowChannelMenu(v => !v)}
            className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <ChannelIcon icon={activeChannel.icon} size={16} />
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
                  <ChannelIcon icon={c.icon} size={18} />
                  <span>{c.label}</span>
                  {channel === c.value && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Customer block */}
        <div className="bg-white mx-2 mt-2 mb-0 rounded-lg border border-gray-200 p-3 space-y-2">
          {/* Phone + search */}
          <div className="flex gap-2" ref={customerRef}>
            <div className="relative flex-1">
              <UserSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="w-full pl-8 h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                placeholder="Số điện thoại (F4)"
                value={customer.phone}
                onChange={e => { onCustomerChange('phone', e.target.value); setShowSuggestions(false) }}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomerSearch() }}
              />
              {showSuggestions && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-40 overflow-hidden">
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3 py-2">Không tìm thấy khách hàng</p>
                  ) : suggestions.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.phone}
                        {c.address ? ` · ${c.address}` : ''}
                        {c.customer_group !== 'REGULAR' ? ` · ${GROUP_LABELS[c.customer_group] ?? c.customer_group}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleCustomerSearch}
              disabled={searchLoading}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 shrink-0 flex items-center gap-1"
            >
              {searchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tìm'}
            </button>
          </div>

          {/* Name + address (always visible) */}
          <div className="grid grid-cols-2 gap-2">
            <input
              className="h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-3 bg-white"
              placeholder="Tên người nhận"
              value={customer.name}
              onChange={set('name')}
            />
            <input
              className="h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-3 bg-white"
              placeholder="Địa chỉ giao hàng"
              value={customer.address}
              onChange={set('address')}
            />
          </div>

          {/* Expand/collapse extra fields */}
          <button
            onClick={() => setShowExtraFields(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
          >
            {showExtraFields ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showExtraFields ? 'Ẩn bớt' : 'Thêm thông tin khách hàng'}
          </button>

          {showExtraFields && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
              <input
                className="h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-3 bg-white"
                placeholder="Email"
                value={customer.email}
                onChange={set('email')}
              />
              <select
                className="h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-2 bg-white"
                value={customer.customer_group}
                onChange={set('customer_group')}
              >
                <option value="REGULAR">Khách thường</option>
                <option value="LOYAL">Thân thiết</option>
                <option value="VIP">VIP</option>
              </select>
              <input
                className="h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-3 bg-white"
                placeholder="Tỉnh / Thành phố"
                value={customer.city}
                onChange={set('city')}
              />
              <input
                className="h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 px-3 bg-white"
                placeholder="Quận / Huyện"
                value={customer.district}
                onChange={set('district')}
              />
            </div>
          )}

          {/* Staff */}
          {staffName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1 border-t border-gray-100">
              <User className="w-3 h-3" />
              <span>Nhân viên:</span>
              <span className="font-medium text-gray-600">{staffName}</span>
            </div>
          )}
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
                          type="number" min={1} max={item.stock} value={item.qty}
                          onChange={e => onUpdateQty(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 text-center h-7 border border-gray-200 rounded focus:outline-none focus:border-blue-400 text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number" min={0} value={item.price}
                          onChange={e => onUpdatePrice(item.productId, parseInt(e.target.value) || 0)}
                          className="w-24 text-right h-7 border border-gray-200 rounded focus:outline-none focus:border-blue-400 px-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-700">
                        {formatCurrency(item.price * item.qty)}
                      </td>
                      <td className="pr-1.5">
                        <button onClick={() => onRemove(item.productId)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1">
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
            <span>Giảm giá / Voucher người bán</span>
            <input
              type="number" min={0} value={discount}
              onChange={e => onDiscountChange(parseInt(e.target.value) || 0)}
              className="w-28 text-right h-7 border border-gray-200 rounded focus:outline-none focus:border-blue-400 px-2 text-sm"
            />
          </div>

          {isMarketplace && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1">
                Phí sàn / hoa hồng
                <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1">
                  <ChannelIcon icon={activeChannel.icon} size={14} className="inline-block align-middle" /> {activeChannel.label}
                </span>
              </span>
              <input
                type="number" min={0} value={platformFee}
                onChange={e => onPlatformFeeChange(parseInt(e.target.value) || 0)}
                className="w-28 text-right h-7 border border-gray-200 rounded focus:outline-none focus:border-blue-400 px-2 text-sm"
              />
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div>
              <span className="font-bold text-gray-800">Doanh thu thực</span>
              {isMarketplace && <p className="text-[10px] text-gray-400">Sau khi trừ phí sàn</p>}
            </div>
            <span className="text-lg font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
