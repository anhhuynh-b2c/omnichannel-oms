import { cn } from '@/lib/utils'
import type { OrderStatus, PurchaseOrderStatus, InventoryStatus } from '@/types'
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PO_STATUS_COLORS,
  PO_STATUS_LABELS,
  INVENTORY_STATUS_COLORS,
  INVENTORY_STATUS_LABELS,
} from '@/constants'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      ORDER_STATUS_COLORS[status],
      className
    )}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}

interface POStatusBadgeProps {
  status: PurchaseOrderStatus
  className?: string
}

export function POStatusBadge({ status, className }: POStatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      PO_STATUS_COLORS[status],
      className
    )}>
      {PO_STATUS_LABELS[status]}
    </span>
  )
}

interface InventoryStatusBadgeProps {
  status: InventoryStatus
  className?: string
}

export function InventoryStatusBadge({ status, className }: InventoryStatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      INVENTORY_STATUS_COLORS[status],
      className
    )}>
      {INVENTORY_STATUS_LABELS[status]}
    </span>
  )
}
