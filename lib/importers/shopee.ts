import * as XLSX from 'xlsx'
import type { OrderStatus } from '@/types'

// ── Column indices (0-based) from Shopee order report ────────────────────────
const COL = {
  ORDER_ID:        0,   // Mã đơn hàng
  ORDER_DATE:      3,   // Ngày đặt hàng
  STATUS:          4,   // Trạng Thái Đơn Hàng
  TRACKING:        8,   // Mã vận đơn
  CARRIER:         9,   // Đơn Vị Vận Chuyển
  RETURN_STATUS:  15,   // Trạng thái Trả hàng/Hoàn tiền
  SKU_PRODUCT:    16,   // SKU sản phẩm
  PRODUCT_NAME:   17,   // Tên sản phẩm
  SKU_VARIANT:    20,   // SKU phân loại hàng
  VARIANT_NAME:   21,   // Tên phân loại hàng
  ORIGINAL_PRICE: 22,   // Giá gốc
  SELLER_DISC:    23,   // Người bán trợ giá
  FINAL_PRICE:    26,   // Giá ưu đãi
  QUANTITY:       27,   // Số lượng
  BUYER_PAID:     46,   // Tổng số tiền người mua thanh toán
  COMPLETED_AT:   47,   // Thời gian hoàn thành đơn hàng
  PAYMENT_METHOD: 49,   // Phương thức thanh toán
  FIXED_FEE:      50,   // Phí cố định
  SERVICE_FEE:    51,   // Phí Dịch Vụ
  TXN_FEE:        52,   // Phí xử lý giao dịch
  BUYER_USERNAME: 54,   // Người Mua
  RECIPIENT_NAME: 55,   // Tên Người nhận
  PHONE:          56,   // Số điện thoại (masked)
  PROVINCE:       57,   // Tỉnh/Thành phố
  DISTRICT:       58,   // TP / Quận / Huyện
  ADDRESS:        60,   // Địa chỉ nhận hàng (masked)
  NOTE:           62,   // Ghi chú
} as const

// ── Status mapping ────────────────────────────────────────────────────────────
const SHOPEE_STATUS_MAP: Record<string, OrderStatus> = {
  'Chờ xác nhận':           'PENDING',
  'Đang xử lý':             'CONFIRMED',
  'Chờ lấy hàng':           'READY_TO_SHIP',
  'Đang giao':              'SHIPPED',
  'Đã giao':                'DELIVERED',
  'Đã hủy':                 'CANCELLED',
  'Trả hàng/Hoàn tiền':     'RETURNED',
  'Hoàn tiền':              'REFUNDED',
}

// Statuses that should update an existing order (higher priority)
const STATUS_PRIORITY: Record<OrderStatus, number> = {
  PENDING: 1, CONFIRMED: 2, PACKING: 3, READY_TO_SHIP: 4,
  SHIPPED: 5, DELIVERED: 6, CANCELLED: 7, RETURNED: 8, REFUNDED: 9,
}

export interface ShopeeOrderRow {
  externalOrderId: string
  orderDate: string
  status: OrderStatus
  returnStatus: string
  trackingNumber: string
  carrier: string
  sku: string           // SKU sản phẩm (master SKU preferred)
  variantSku: string    // SKU phân loại (có thể khác)
  productName: string
  variantName: string
  originalPrice: number
  finalPrice: number
  sellerDiscount: number
  quantity: number
  buyerPaid: number
  platformFee: number   // fixed + service + txn
  paymentMethod: string
  buyerUsername: string
  recipientName: string
  phone: string
  province: string
  district: string
  address: string
  note: string
}

function cellStr(row: any[], idx: number): string {
  const v = row[idx]
  return v == null ? '' : String(v).trim()
}

function cellNum(row: any[], idx: number): number {
  const v = row[idx]
  if (v == null || v === '') return 0
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

export function parseShopeeExcel(buffer: ArrayBuffer): ShopeeOrderRow[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Skip header row (index 0)
  const rows: ShopeeOrderRow[] = []
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i]
    const externalOrderId = cellStr(r, COL.ORDER_ID)
    if (!externalOrderId) continue

    const statusRaw = cellStr(r, COL.STATUS)
    const returnStatus = cellStr(r, COL.RETURN_STATUS)

    // If return status is set, override
    let status: OrderStatus = SHOPEE_STATUS_MAP[statusRaw] ?? 'PENDING'
    if (returnStatus && returnStatus !== '') {
      status = SHOPEE_STATUS_MAP[returnStatus] ?? status
    }

    const fixedFee    = cellNum(r, COL.FIXED_FEE)
    const serviceFee  = cellNum(r, COL.SERVICE_FEE)
    const txnFee      = cellNum(r, COL.TXN_FEE)

    // Use variant SKU if product SKU is empty
    const sku = cellStr(r, COL.SKU_PRODUCT) || cellStr(r, COL.SKU_VARIANT)

    rows.push({
      externalOrderId,
      orderDate: cellStr(r, COL.ORDER_DATE),
      status,
      returnStatus,
      trackingNumber: cellStr(r, COL.TRACKING),
      carrier: cellStr(r, COL.CARRIER),
      sku,
      variantSku: cellStr(r, COL.SKU_VARIANT),
      productName: cellStr(r, COL.PRODUCT_NAME),
      variantName: cellStr(r, COL.VARIANT_NAME),
      originalPrice: cellNum(r, COL.ORIGINAL_PRICE),
      finalPrice: cellNum(r, COL.FINAL_PRICE),
      sellerDiscount: cellNum(r, COL.SELLER_DISC),
      quantity: cellNum(r, COL.QUANTITY) || 1,
      buyerPaid: cellNum(r, COL.BUYER_PAID),
      platformFee: fixedFee + serviceFee + txnFee,
      paymentMethod: cellStr(r, COL.PAYMENT_METHOD),
      buyerUsername: cellStr(r, COL.BUYER_USERNAME),
      recipientName: cellStr(r, COL.RECIPIENT_NAME),
      phone: cellStr(r, COL.PHONE),
      province: cellStr(r, COL.PROVINCE),
      district: cellStr(r, COL.DISTRICT),
      address: cellStr(r, COL.ADDRESS),
      note: cellStr(r, COL.NOTE),
    })
  }
  return rows
}

export { STATUS_PRIORITY }
