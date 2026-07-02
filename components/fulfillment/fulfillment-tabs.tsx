'use client'

import { useState } from 'react'
import { MaterialsTable } from './materials-table'
import { BomManager } from './bom-manager'
import type { PackagingMaterial } from '@/lib/actions/fulfillment.actions'

interface Product {
  id: string
  name: string
  master_sku: string
  category: string
}

interface FulfillmentTabsProps {
  materials: PackagingMaterial[]
  materialsTotal: number
  products: Product[]
}

export function FulfillmentTabs({ materials, materialsTotal, products }: FulfillmentTabsProps) {
  const [tab, setTab] = useState<'materials' | 'bom'>('materials')

  const lowStockCount = materials.filter(m => m.stock_status !== 'IN_STOCK').length

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('materials')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'materials'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Vật tư đóng gói
          {lowStockCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
              {lowStockCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('bom')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'bom'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Công thức đóng gói
        </button>
      </div>

      {tab === 'materials' && (
        <MaterialsTable initialData={materials} total={materialsTotal} />
      )}
      {tab === 'bom' && (
        <BomManager products={products} materials={materials} />
      )}
    </div>
  )
}
