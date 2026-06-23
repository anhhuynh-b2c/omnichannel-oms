'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MOCK_PRODUCTS_WITH_INVENTORY } from '@/lib/mock-data'
import { PRODUCT_CATEGORIES } from '@/constants'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface CartItem {
  productId: string
  name: string
  sku: string
  price: number
  qty: number
  stock: number
}

interface ProductPanelProps {
  onAddToCart: (item: CartItem) => void
}

export function ProductPanel({ onAddToCart }: ProductPanelProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const searchRef = useRef<HTMLInputElement>(null)

  // F3 shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F3') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const categories = ['all', ...PRODUCT_CATEGORIES.slice(0, 6)]

  const products = MOCK_PRODUCTS_WITH_INVENTORY.data.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.master_sku.toLowerCase().includes(q)
    const matchCat = category === 'all' || p.category === category
    return matchSearch && matchCat
  })

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Search */}
      <div className="p-2 border-b border-gray-200 shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            ref={searchRef}
            className="w-full pl-8 pr-3 h-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
            placeholder="Tìm hàng hóa (F3)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Category chips */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'shrink-0 text-xs px-2 py-0.5 rounded-full border transition-colors',
                category === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              )}
            >
              {cat === 'all' ? 'Tất cả' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product count */}
      <div className="px-3 py-1.5 shrink-0 flex items-center justify-between border-b border-gray-100">
        <span className="text-xs text-gray-400">{products.length} sản phẩm</span>
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {products.map(p => {
            const qty = p.inventory.stock_quantity
            const status = p.inventory.inventory_status
            const outOfStock = qty === 0
            return (
              <button
                key={p.id}
                onClick={() => !outOfStock && onAddToCart({
                  productId: p.id,
                  name: p.name,
                  sku: p.master_sku,
                  price: p.price,
                  qty: 1,
                  stock: qty,
                })}
                disabled={outOfStock}
                className={cn(
                  'text-left p-2 rounded-lg border transition-all duration-100',
                  outOfStock
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm active:scale-[0.98] cursor-pointer'
                )}
              >
                {/* Stock bar */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight flex-1">
                    {p.name}
                  </p>
                  {outOfStock ? (
                    <span className="shrink-0 text-[10px] bg-red-100 text-red-600 rounded px-1 leading-4">Hết</span>
                  ) : status === 'LOW_STOCK' ? (
                    <span className="shrink-0 text-[10px] bg-orange-100 text-orange-600 rounded px-1 leading-4">{qty}</span>
                  ) : (
                    <span className="shrink-0 text-[10px] bg-green-100 text-green-600 rounded px-1 leading-4">{qty}</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mb-1 font-mono truncate">{p.master_sku}</p>
                <p className="text-xs font-bold text-blue-600">{formatCurrency(p.price)}</p>
              </button>
            )
          })}
        </div>
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Không tìm thấy</p>
          </div>
        )}
      </div>
    </div>
  )
}
