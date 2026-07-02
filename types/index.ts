// ─── Enums ─────────────────────────────────────────────────────────────────

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PACKING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED'

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'RECEIVED'
  | 'CANCELLED'

export type MovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'CANCELLATION'

export type UserRole = 'ADMIN' | 'WAREHOUSE_STAFF' | 'SALES_STAFF'

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR'

export type ChannelName =
  | 'Shopee'
  | 'TikTok Shop'
  | 'Lazada'
  | 'Facebook'
  | 'Instagram'
  | 'Website'
  | 'Zalo'

// Channels that push status via webhook — staff cannot manually change status
export const MARKETPLACE_CHANNELS: ChannelName[] = ['Shopee', 'TikTok Shop', 'Lazada']
// Channels where staff manually control order status
export const MANUAL_CHANNELS: ChannelName[] = ['Facebook', 'Instagram', 'Website', 'Zalo']

// ─── Database Models ────────────────────────────────────────────────────────

export interface Role {
  id: string
  name: UserRole
}

export interface User {
  id: string
  name: string
  email: string
  role_id: string
  created_at: string
  role?: Role
}

export type ProductUnit = 'piece' | 'set' | 'pair' | 'pack'

export interface Product {
  id: string
  name: string
  master_sku: string
  category: string
  description: string | null
  price: number
  cost: number
  image_url: string | null
  status: ProductStatus
  material: string | null
  weight_g: number | null
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  unit: ProductUnit
  barcode: string | null
  default_safety_stock: number
  created_at: string
  updated_at: string
}

export interface Inventory {
  id: string
  product_id: string
  stock_quantity: number
  reorder_point: number
  safety_stock: number
  inventory_status: InventoryStatus
  updated_at: string
  product?: Product
}

export interface Channel {
  id: string
  name: ChannelName
  icon: string
  status: IntegrationStatus
}

export interface ChannelSkuMapping {
  id: string
  product_id: string
  channel_id: string
  channel_sku: string
  product?: Product
  channel?: Channel
}

export type CustomerGroup = 'VIP' | 'LOYAL' | 'REGULAR'

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  customer_group: CustomerGroup
  source_channel: string | null
  city: string | null
  district: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // aggregated from orders (joined)
  total_orders?: number
  total_spent?: number
  last_order_date?: string | null
}

export interface CustomerFormData {
  name: string
  phone?: string
  email?: string
  address?: string
  customer_group: CustomerGroup
  source_channel?: string
  city?: string
  district?: string
  notes?: string
}

export interface Order {
  id: string
  channel_id: string
  customer_id: string
  order_number: string
  external_order_id?: string | null
  total_amount: number
  vat_rate: number
  discount_amount?: number
  shipping_fee?: number
  payment_method?: string
  notes?: string
  tracking_number?: string | null
  shipped_at?: string | null
  created_by_name?: string | null
  status: OrderStatus
  order_date: string
  created_at: string
  channel?: Channel
  customer?: Customer
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  subtotal: number
  product?: Product
}

export interface Supplier {
  id: string
  supplier_name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

export interface PurchaseOrder {
  id: string
  po_number?: string
  supplier_id: string
  expected_date: string
  status: PurchaseOrderStatus
  notes?: string
  approved_by?: string
  requisitioner?: string
  shipped_via?: string
  fob_point?: string
  payment_terms?: string
  ship_to_name?: string
  ship_to_address?: string
  vat_rate?: number
  shipping_fee?: number
  created_by_name?: string | null
  created_at: string
  supplier?: Supplier
  items?: PurchaseOrderItem[]
}

export interface CompanySettings {
  id: string
  company_name: string
  slogan?: string | null
  tax_id?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  website?: string | null
  logo_url?: string | null
  currency: string
  timezone: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  quantity: number
  cost: number
  product?: Product
}

export interface InventoryMovement {
  id: string
  product_id: string
  qty_change: number
  movement_type: MovementType
  reference_id: string | null
  created_at: string
  product?: Product
}

export interface Return {
  id: string
  order_id: string
  reason: string
  status: string
  created_at: string
  order?: Order
}

export interface Integration {
  id: string
  channel_id: string
  api_key: string | null
  secret_key: string | null
  webhook_url: string | null
  status: IntegrationStatus
  channel?: Channel
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
  user?: User
}

// ─── View / Composite Types ──────────────────────────────────────────────────

export interface ProductWithInventory extends Product {
  inventory?: Inventory
}

export interface DashboardKPI {
  total_revenue: number
  revenue_change: number
  new_orders: number
  orders_change: number
  low_stock_count: number
  pending_orders: number
}

export interface RevenueByChannel {
  channel: string
  revenue: number
}

export interface SalesTrend {
  date: string
  revenue: number
  orders: number
}

export interface TopSellingProduct {
  product_id: string
  product_name: string
  master_sku: string
  sold_qty: number
  revenue: number
}

export interface LowStockAlert {
  product_id: string
  product_name: string
  master_sku: string
  stock_quantity: number
  safety_stock: number
  reorder_point: number
}

// ─── Form Types ─────────────────────────────────────────────────────────────

export interface ProductFormData {
  name: string
  master_sku: string
  category: string
  description?: string
  price: number
  cost: number
  image_url?: string
  status: ProductStatus
  material?: string
  weight_g?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  unit?: ProductUnit
  barcode?: string
  default_safety_stock?: number
  initial_stock?: number
  stock_quantity?: number
}

export interface InventoryAdjustmentFormData {
  product_id: string
  qty_change: number
  movement_type: MovementType
  note?: string
}

export interface PurchaseOrderFormData {
  supplier_id: string
  expected_date: string
  items: {
    product_id: string
    quantity: number
    cost: number
  }[]
}

export interface IntegrationFormData {
  api_key: string
  secret_key: string
  webhook_url: string
}

// ─── Table / Pagination ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TableFilters {
  search?: string
  status?: string
  channel?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}
