import type { OrderStatus, PurchaseOrderStatus, InventoryStatus, MovementType, ChannelName } from '@/types'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PACKING: 'Packing',
  READY_TO_SHIP: 'Ready to Ship',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PACKING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  READY_TO_SHIP: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  SHIPPED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RETURNED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
}

export const PO_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
}

export const INVENTORY_STATUS_COLORS: Record<InventoryStatus, string> = {
  IN_STOCK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LOW_STOCK: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  OUT_OF_STOCK: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  SALE: 'Sale',
  PURCHASE: 'Purchase',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  CANCELLATION: 'Cancellation',
}

export const CHANNEL_ICONS: Record<ChannelName, string> = {
  Shopee: '/channels/shopee.svg',
  'TikTok Shop': '/channels/tiktok.svg',
  Lazada: '/channels/lazada.svg',
  Facebook: '/channels/facebook.svg',
  Instagram: '/channels/instagram.svg',
  Website: '🌐',
  Zalo: '💬',
  Direct: '🤝',
}

export const CHANNEL_COLORS: Record<ChannelName, string> = {
  Shopee: '#EE4D2D',
  'TikTok Shop': '#000000',
  Lazada: '#0F146D',
  Facebook: '#1877F2',
  Instagram: '#E1306C',
  Website: '#6366F1',
  Zalo: '#0068FF',
  Direct: '#10B981',
}

export const PRODUCT_CATEGORIES = [
  'Cutting Board',
  'Salad Bowl',
  'Tray',
  'Kitchen Utensils',
  'Furniture',
  'Home & Garden',
  'Electronics',
  'Clothing',
  'Food & Beverage',
  'Health & Beauty',
  'Sports & Outdoors',
  'Books & Stationery',
  'Toys & Games',
  'Automotive',
  'Other',
]

export const PRODUCT_MATERIALS = [
  'Teak',
  'Acacia',
  'Mango Wood',
  'Bamboo',
  'Rubberwood',
  'Pine',
  'Oak',
  'Walnut',
  'Mixed Wood',
  'Plastic',
  'Stainless Steel',
  'Other',
]

export const PRODUCT_UNITS: { value: string; label: string }[] = [
  { value: 'piece', label: 'Piece (cái)' },
  { value: 'set', label: 'Set (bộ)' },
  { value: 'pair', label: 'Pair (đôi)' },
  { value: 'pack', label: 'Pack (gói)' },
]

export const NAV_ITEMS = [
  { href: '/',                label: 'nav.dashboard',      icon: 'LayoutDashboard', roles: ['ADMIN', 'SALES_STAFF', 'WAREHOUSE_STAFF'] },
  { href: '/products',        label: 'nav.products',       icon: 'Package',         roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  { href: '/categories',      label: 'nav.categories',     icon: 'Tag',             roles: ['ADMIN'] },
  { href: '/inventory',       label: 'nav.inventory',      icon: 'Warehouse',       roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  { href: '/fulfillment',     label: 'nav.fulfillment',    icon: 'PackageCheck',    roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  { href: '/orders',          label: 'nav.orders',         icon: 'ShoppingCart',    roles: ['ADMIN', 'SALES_STAFF'] },
  { href: '/manual',          label: 'nav.manual',         icon: 'PenLine',         roles: ['ADMIN', 'SALES_STAFF'] },
  { href: '/purchase-orders', label: 'nav.purchaseOrders', icon: 'ClipboardList',   roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  { href: '/suppliers',       label: 'nav.suppliers',      icon: 'Truck',           roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  { href: '/integrations',    label: 'nav.integrations',   icon: 'Plug',            roles: ['ADMIN'] },
  { href: '/settings',        label: 'nav.settings',       icon: 'Settings',        roles: ['ADMIN'] },
] as const

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
