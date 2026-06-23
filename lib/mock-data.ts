import type {
  DashboardKPI,
  RevenueByChannel,
  SalesTrend,
  TopSellingProduct,
  LowStockAlert,
  Product,
  Inventory,
  Order,
  Channel,
  Customer,
  PurchaseOrder,
  Supplier,
} from '@/types'

// ─── Shared IDs ───────────────────────────────────────────────────────────────
const CHANNEL_IDS = {
  shopee: 'ch-shopee-001',
  tiktok: 'ch-tiktok-001',
  lazada: 'ch-lazada-001',
  facebook: 'ch-facebook-001',
  instagram: 'ch-instagram-001',
  website: 'ch-website-001',
}

export const MOCK_CHANNELS: Channel[] = [
  { id: CHANNEL_IDS.shopee,    name: 'Shopee',      icon: '🛍️', status: 'CONNECTED' },
  { id: CHANNEL_IDS.tiktok,   name: 'TikTok Shop', icon: '🎵', status: 'DISCONNECTED' },
  { id: CHANNEL_IDS.lazada,   name: 'Lazada',      icon: '🛒', status: 'DISCONNECTED' },
  { id: CHANNEL_IDS.facebook, name: 'Facebook',    icon: '📘', status: 'DISCONNECTED' },
  { id: CHANNEL_IDS.instagram,name: 'Instagram',   icon: '📸', status: 'DISCONNECTED' },
  { id: CHANNEL_IDS.website,  name: 'Website',     icon: '🌐', status: 'CONNECTED' },
]

// ─── Products ─────────────────────────────────────────────────────────────────
const RAW_PRODUCTS = [
  { name: 'Teak Dining Table 6-Seater',  sku: 'TEAK-DT-001', cat: 'Furniture',          price: 8500000,  cost: 4200000,  stock: 0,  safety: 30, reorder: 10, status: 'OUT_OF_STOCK' },
  { name: 'Teak Dining Table 4-Seater',  sku: 'TEAK-DT-002', cat: 'Furniture',          price: 6200000,  cost: 3100000,  stock: 24, safety: 25, reorder: 8,  status: 'IN_STOCK' },
  { name: 'Bamboo Shelf Unit 5-Tier',    sku: 'BAMB-SH-001', cat: 'Furniture',          price: 1800000,  cost: 850000,   stock: 67, safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Oak Coffee Table Round',      sku: 'OAK-CT-001',  cat: 'Furniture',          price: 3200000,  cost: 1600000,  stock: 3,  safety: 20, reorder: 8,  status: 'LOW_STOCK' },
  { name: 'Ergonomic Office Chair',      sku: 'ERGO-CH-001', cat: 'Furniture',          price: 4500000,  cost: 2100000,  stock: 8,  safety: 40, reorder: 15, status: 'LOW_STOCK' },
  { name: 'Standing Desk Electric',      sku: 'DESK-EL-001', cat: 'Furniture',          price: 7200000,  cost: 3600000,  stock: 0,  safety: 25, reorder: 8,  status: 'OUT_OF_STOCK' },
  { name: 'Sofa 3-Seater Grey',          sku: 'SOFA-3S-001', cat: 'Furniture',          price: 12000000, cost: 6000000,  stock: 0,  safety: 20, reorder: 6,  status: 'OUT_OF_STOCK' },
  { name: 'King Bed Frame Walnut',       sku: 'BED-KG-001',  cat: 'Furniture',          price: 9800000,  cost: 4900000,  stock: 3,  safety: 25, reorder: 8,  status: 'LOW_STOCK' },
  { name: 'Wardrobe 3-Door Sliding',     sku: 'WARD-3D-001', cat: 'Furniture',          price: 6800000,  cost: 3400000,  stock: 5,  safety: 20, reorder: 7,  status: 'LOW_STOCK' },
  { name: 'TV Console Modern White',     sku: 'TVCN-MW-001', cat: 'Furniture',          price: 2800000,  cost: 1400000,  stock: 45, safety: 25, reorder: 8,  status: 'IN_STOCK' },
  { name: 'Wireless Earbuds Pro',        sku: 'ELEC-EB-001', cat: 'Electronics',        price: 1200000,  cost: 500000,   stock: 120,safety: 50, reorder: 20, status: 'IN_STOCK' },
  { name: 'Smart Watch Series X',        sku: 'ELEC-SW-001', cat: 'Electronics',        price: 3500000,  cost: 1500000,  stock: 35, safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Bluetooth Speaker Mini',      sku: 'ELEC-BS-001', cat: 'Electronics',        price: 650000,   cost: 280000,   stock: 88, safety: 40, reorder: 15, status: 'IN_STOCK' },
  { name: 'LED Desk Lamp USB-C',         sku: 'ELEC-DL-001', cat: 'Electronics',        price: 450000,   cost: 180000,   stock: 142,safety: 50, reorder: 20, status: 'IN_STOCK' },
  { name: 'Wireless Charger Pad 15W',    sku: 'ELEC-WC-001', cat: 'Electronics',        price: 380000,   cost: 150000,   stock: 95, safety: 40, reorder: 15, status: 'IN_STOCK' },
  { name: 'Mechanical Keyboard TKL',     sku: 'ELEC-KB-001', cat: 'Electronics',        price: 1800000,  cost: 820000,   stock: 42, safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Gaming Mouse RGB',            sku: 'ELEC-MS-001', cat: 'Electronics',        price: 850000,   cost: 350000,   stock: 78, safety: 40, reorder: 15, status: 'IN_STOCK' },
  { name: 'Webcam 4K Auto-Focus',        sku: 'ELEC-WB-001', cat: 'Electronics',        price: 1600000,  cost: 700000,   stock: 28, safety: 20, reorder: 8,  status: 'IN_STOCK' },
  { name: 'Monitor 27" IPS 144Hz',       sku: 'ELEC-MN-001', cat: 'Electronics',        price: 6800000,  cost: 3200000,  stock: 6,  safety: 30, reorder: 10, status: 'LOW_STOCK' },
  { name: 'USB-C Hub 7-in-1',            sku: 'ELEC-HB-001', cat: 'Electronics',        price: 520000,   cost: 200000,   stock: 110,safety: 40, reorder: 15, status: 'IN_STOCK' },
  { name: 'Linen Shirt Men White',       sku: 'CLO-LS-001',  cat: 'Clothing',           price: 420000,   cost: 150000,   stock: 320,safety: 80, reorder: 30, status: 'IN_STOCK' },
  { name: 'Slim Fit Chinos Beige',       sku: 'CLO-CH-001',  cat: 'Clothing',           price: 580000,   cost: 210000,   stock: 185,safety: 60, reorder: 20, status: 'IN_STOCK' },
  { name: 'Summer Dress Floral',         sku: 'CLO-SD-001',  cat: 'Clothing',           price: 490000,   cost: 180000,   stock: 240,safety: 70, reorder: 25, status: 'IN_STOCK' },
  { name: 'Running Shoes Mesh',          sku: 'CLO-RS-001',  cat: 'Clothing',           price: 1200000,  cost: 520000,   stock: 55, safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Hoodie Unisex Black',         sku: 'CLO-HD-001',  cat: 'Clothing',           price: 680000,   cost: 250000,   stock: 165,safety: 60, reorder: 20, status: 'IN_STOCK' },
  { name: 'Tote Bag Canvas Large',       sku: 'CLO-TB-001',  cat: 'Clothing',           price: 280000,   cost: 90000,    stock: 210,safety: 60, reorder: 20, status: 'IN_STOCK' },
  { name: 'Denim Jacket Vintage',        sku: 'CLO-DJ-001',  cat: 'Clothing',           price: 980000,   cost: 380000,   stock: 42, safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Yoga Pants High-Waist',       sku: 'CLO-YP-001',  cat: 'Clothing',           price: 520000,   cost: 190000,   stock: 130,safety: 50, reorder: 15, status: 'IN_STOCK' },
  { name: 'Succulent Plant Set 3',       sku: 'HOME-SP-001', cat: 'Home & Garden',      price: 320000,   cost: 110000,   stock: 85, safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Scented Candle Vanilla',      sku: 'HOME-SC-001', cat: 'Home & Garden',      price: 180000,   cost: 60000,    stock: 310,safety: 60, reorder: 20, status: 'IN_STOCK' },
  { name: 'Bamboo Cutting Board',        sku: 'HOME-CB-001', cat: 'Home & Garden',      price: 220000,   cost: 80000,    stock: 195,safety: 50, reorder: 15, status: 'IN_STOCK' },
  { name: 'Cast Iron Skillet 26cm',      sku: 'HOME-CI-001', cat: 'Home & Garden',      price: 650000,   cost: 280000,   stock: 68, safety: 25, reorder: 8,  status: 'IN_STOCK' },
  { name: 'French Press Coffee 600ml',   sku: 'HOME-FP-001', cat: 'Home & Garden',      price: 380000,   cost: 140000,   stock: 112,safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Throw Pillow Set Linen',      sku: 'HOME-TP-001', cat: 'Home & Garden',      price: 290000,   cost: 100000,   stock: 98, safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Wall Clock Minimalist',       sku: 'HOME-WC-001', cat: 'Home & Garden',      price: 350000,   cost: 130000,   stock: 75, safety: 25, reorder: 8,  status: 'IN_STOCK' },
  { name: 'Yoga Mat TPE 6mm',            sku: 'SPRT-YM-001', cat: 'Sports & Outdoors',  price: 480000,   cost: 190000,   stock: 145,safety: 40, reorder: 15, status: 'IN_STOCK' },
  { name: 'Resistance Band Set',         sku: 'SPRT-RB-001', cat: 'Sports & Outdoors',  price: 280000,   cost: 100000,   stock: 220,safety: 50, reorder: 15, status: 'IN_STOCK' },
  { name: 'Adjustable Dumbbell 20kg',    sku: 'SPRT-DB-001', cat: 'Sports & Outdoors',  price: 1800000,  cost: 750000,   stock: 4,  safety: 20, reorder: 6,  status: 'LOW_STOCK' },
  { name: 'Jump Rope Speed Cable',       sku: 'SPRT-JR-001', cat: 'Sports & Outdoors',  price: 180000,   cost: 60000,    stock: 340,safety: 50, reorder: 15, status: 'IN_STOCK' },
  { name: 'Water Bottle 1L Tritan',      sku: 'SPRT-WB-001', cat: 'Sports & Outdoors',  price: 220000,   cost: 80000,    stock: 285,safety: 50, reorder: 15, status: 'IN_STOCK' },
  { name: 'Face Serum Vitamin C',        sku: 'HLTH-FS-001', cat: 'Health & Beauty',    price: 480000,   cost: 180000,   stock: 160,safety: 40, reorder: 15, status: 'IN_STOCK' },
  { name: 'Collagen Supplement 30 Pack', sku: 'HLTH-CL-001', cat: 'Health & Beauty',    price: 620000,   cost: 240000,   stock: 88, safety: 30, reorder: 10, status: 'IN_STOCK' },
  { name: 'Mineral Sunscreen SPF50',     sku: 'HLTH-SS-001', cat: 'Health & Beauty',    price: 320000,   cost: 110000,   stock: 195,safety: 40, reorder: 15, status: 'IN_STOCK' },
  { name: 'Diffuser Essential Oil Set',  sku: 'HLTH-DO-001', cat: 'Health & Beauty',    price: 580000,   cost: 220000,   stock: 72, safety: 25, reorder: 8,  status: 'IN_STOCK' },
  { name: 'Electric Toothbrush Pro',     sku: 'HLTH-ET-001', cat: 'Health & Beauty',    price: 890000,   cost: 380000,   stock: 48, safety: 20, reorder: 8,  status: 'IN_STOCK' },
  { name: 'Sketchbook A4 200g 50p',      sku: 'BOOK-SB-001', cat: 'Books & Stationery', price: 120000,   cost: 45000,    stock: 420,safety: 80, reorder: 30, status: 'IN_STOCK' },
  { name: 'Fountain Pen Set Luxury',     sku: 'BOOK-FP-001', cat: 'Books & Stationery', price: 680000,   cost: 280000,   stock: 38, safety: 20, reorder: 8,  status: 'IN_STOCK' },
  { name: 'Planner 2025 Hardcover',      sku: 'BOOK-PL-001', cat: 'Books & Stationery', price: 280000,   cost: 95000,    stock: 155,safety: 40, reorder: 15, status: 'IN_STOCK' },
  { name: 'Sticky Notes Pastel 400p',    sku: 'BOOK-SN-001', cat: 'Books & Stationery', price: 85000,    cost: 30000,    stock: 680,safety: 80, reorder: 30, status: 'IN_STOCK' },
  { name: 'Building Blocks 1000pc',      sku: 'TOYS-BB-001', cat: 'Toys & Games',       price: 850000,   cost: 340000,   stock: 65, safety: 25, reorder: 8,  status: 'IN_STOCK' },
  { name: 'Board Game Strategy',         sku: 'TOYS-BG-001', cat: 'Toys & Games',       price: 580000,   cost: 220000,   stock: 82, safety: 25, reorder: 8,  status: 'IN_STOCK' },
  { name: 'RC Car Off-Road',             sku: 'TOYS-RC-001', cat: 'Toys & Games',       price: 980000,   cost: 420000,   stock: 2,  safety: 25, reorder: 8,  status: 'LOW_STOCK' },
]

type MockInventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
type MockProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

interface MockProduct extends Product {
  inventory: {
    id: string
    product_id: string
    stock_quantity: number
    reorder_point: number
    safety_stock: number
    inventory_status: MockInventoryStatus
    updated_at: string
  }
}

const MOCK_PRODUCTS_LIST: MockProduct[] = RAW_PRODUCTS.map((p, i) => ({
  id: `prod-${i.toString().padStart(3, '0')}`,
  name: p.name,
  master_sku: p.sku,
  category: p.cat,
  description: `High-quality ${p.name.toLowerCase()} for everyday use.`,
  price: p.price,
  cost: p.cost,
  image_url: null,
  status: (i % 10 === 9 ? 'INACTIVE' : 'ACTIVE') as MockProductStatus,
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  updated_at: new Date(Date.now() - i * 43200000).toISOString(),
  inventory: {
    id: `inv-${i.toString().padStart(3, '0')}`,
    product_id: `prod-${i.toString().padStart(3, '0')}`,
    stock_quantity: p.stock,
    reorder_point: p.reorder,
    safety_stock: p.safety,
    inventory_status: p.status as MockInventoryStatus,
    updated_at: new Date().toISOString(),
  },
}))

export const MOCK_PRODUCTS_WITH_INVENTORY = {
  data: MOCK_PRODUCTS_LIST,
  total: MOCK_PRODUCTS_LIST.length,
}

// ─── Mock Inventory (flat view) ───────────────────────────────────────────────
export const MOCK_INVENTORY = {
  data: MOCK_PRODUCTS_LIST.map(p => ({
    ...p.inventory,
    products: {
      id: p.id,
      name: p.name,
      master_sku: p.master_sku,
      category: p.category,
      price: p.price,
      cost: p.cost,
      status: p.status,
    },
    suggested_purchase: p.inventory.stock_quantity < p.inventory.safety_stock
      ? p.inventory.safety_stock - p.inventory.stock_quantity
      : 0,
  })),
  total: MOCK_PRODUCTS_LIST.length,
}

// ─── Mock Customers ───────────────────────────────────────────────────────────
const CUSTOMER_NAMES = [
  'Nguyen An', 'Tran Binh', 'Le Cuong', 'Pham Dung', 'Hoang Em',
  'Vo Giang', 'Dang Ha', 'Bui Hoa', 'Do Khanh', 'Ngo Lan',
  'Mai Nam', 'Nguyen Oanh', 'Tran Phong', 'Le Quynh', 'Pham Rong',
  'Hoang Son', 'Vo Tung', 'Dang Uyen', 'Bui Van', 'Do Xuan',
]

const MOCK_CUSTOMERS: Customer[] = CUSTOMER_NAMES.map((name, i) => ({
  id: `cust-${i.toString().padStart(3, '0')}`,
  name,
  phone: `09${(10000000 + i * 1234567).toString().slice(0, 8)}`,
  email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
  address: `${i + 1} Duong so ${i + 5}, Quan ${(i % 12) + 1}, TP.HCM`,
}))

// ─── Mock Orders ──────────────────────────────────────────────────────────────
const ORDER_STATUSES_LIST = [
  'PENDING', 'PENDING', 'CONFIRMED', 'PACKING', 'READY_TO_SHIP',
  'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'CANCELLED',
] as const

function makeDate(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

const MOCK_ORDERS_LIST: (Order & { channels: Channel; customers: Customer })[] = Array.from({ length: 40 }, (_, i) => {
  const channelKeys = Object.keys(CHANNEL_IDS) as (keyof typeof CHANNEL_IDS)[]
  const channelKey = channelKeys[i % channelKeys.length]
  const channel = MOCK_CHANNELS.find(c => c.id === CHANNEL_IDS[channelKey])!
  const customer = MOCK_CUSTOMERS[i % MOCK_CUSTOMERS.length]
  return {
    id: `ord-${i.toString().padStart(3, '0')}`,
    channel_id: channel.id,
    customer_id: customer.id,
    order_number: `ORD-${(100000 + i).toString()}`,
    total_amount: 200000 + (i * 378000) % 14000000,
    status: ORDER_STATUSES_LIST[i % ORDER_STATUSES_LIST.length] as Order['status'],
    order_date: makeDate(i % 60),
    created_at: makeDate(i % 60),
    channels: channel,
    customers: customer,
  }
})

export const MOCK_ORDERS = {
  data: MOCK_ORDERS_LIST,
  total: MOCK_ORDERS_LIST.length,
}

// ─── Mock Suppliers ───────────────────────────────────────────────────────────
export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'sup-001', supplier_name: 'Moc Viet Furniture Co.',   phone: '0901234567', email: 'supply@mocviet.vn',         address: '123 Nguyen Trai, Hanoi',              created_at: makeDate(365) },
  { id: 'sup-002', supplier_name: 'Tech Imports Asia',         phone: '0912345678', email: 'orders@techimports.asia',   address: '45 Le Loi, Ho Chi Minh City',         created_at: makeDate(300) },
  { id: 'sup-003', supplier_name: 'Fashion Forward VN',        phone: '0923456789', email: 'bulk@fashionforward.vn',    address: '78 Hai Ba Trung, Da Nang',            created_at: makeDate(250) },
  { id: 'sup-004', supplier_name: 'GreenHome Supplies',        phone: '0934567890', email: 'info@greenhome.vn',         address: '12 Tran Hung Dao, Can Tho',           created_at: makeDate(200) },
  { id: 'sup-005', supplier_name: 'SportLife Distributors',    phone: '0945678901', email: 'orders@sportlife.vn',       address: '56 Phan Chu Trinh, Hue',              created_at: makeDate(180) },
  { id: 'sup-006', supplier_name: 'BeautyBox Vietnam',         phone: '0956789012', email: 'wholesale@beautybox.vn',    address: '34 Le Duan, Hai Phong',               created_at: makeDate(150) },
  { id: 'sup-007', supplier_name: 'Stationery World',          phone: '0967890123', email: 'supply@statworld.vn',       address: '89 Dong Khoi, Ho Chi Minh City',      created_at: makeDate(120) },
  { id: 'sup-008', supplier_name: 'Kidzone Toys',              phone: '0978901234', email: 'bulk@kidzone.vn',           address: '23 Hoang Dieu, Bien Hoa',             created_at: makeDate(90) },
  { id: 'sup-009', supplier_name: 'Global Electronics HK',     phone: '0989012345', email: 'orders@globalelec.hk',      address: 'Unit 5, Kowloon Bay, Hong Kong',      created_at: makeDate(60) },
  { id: 'sup-010', supplier_name: 'Eco Materials Corp',        phone: '0990123456', email: 'sales@ecomaterials.vn',     address: '67 Ba Dinh, Hanoi',                   created_at: makeDate(30) },
]

// ─── Mock Purchase Orders ─────────────────────────────────────────────────────
const PO_STATUSES_LIST = ['DRAFT', 'PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'] as const

export const MOCK_PURCHASE_ORDERS: (PurchaseOrder & { suppliers: Supplier; purchase_order_items: Array<{ id: string; quantity: number; cost: number; products: { id: string; name: string; master_sku: string } }> })[] = Array.from({ length: 15 }, (_, i) => {
  const supplier = MOCK_SUPPLIERS[i % MOCK_SUPPLIERS.length]
  const exp = new Date()
  exp.setDate(exp.getDate() + (i % 30) - 10)
  const items = MOCK_PRODUCTS_LIST.slice(i * 2, i * 2 + 3).map((p, j) => ({
    id: `poi-${i}-${j}`,
    purchase_order_id: `po-${i.toString().padStart(3, '0')}`,
    quantity: (j + 1) * 10 + i * 5,
    cost: p.cost,
    products: { id: p.id, name: p.name, master_sku: p.master_sku },
    product_id: p.id,
  }))
  const totalCost = items.reduce((s, it) => s + it.quantity * it.cost, 0)
  return {
    id: `po-${i.toString().padStart(3, '0')}`,
    supplier_id: supplier.id,
    expected_date: exp.toISOString().split('T')[0],
    status: PO_STATUSES_LIST[i % PO_STATUSES_LIST.length],
    created_at: makeDate(i * 3 + 1),
    total_cost: totalCost,
    suppliers: supplier,
    purchase_order_items: items,
  }
})

export const MOCK_KPI: DashboardKPI = {
  total_revenue: 847_320_000,
  revenue_change: 18.2,
  new_orders: 234,
  orders_change: 12.5,
  low_stock_count: 9,
  pending_orders: 47,
}

export const MOCK_REVENUE_BY_CHANNEL: RevenueByChannel[] = [
  { channel: 'Shopee', revenue: 312_500_000 },
  { channel: 'TikTok Shop', revenue: 198_200_000 },
  { channel: 'Lazada', revenue: 145_800_000 },
  { channel: 'Facebook', revenue: 98_400_000 },
  { channel: 'Instagram', revenue: 62_100_000 },
  { channel: 'Website', revenue: 30_320_000 },
]

function generateDays(n: number): SalesTrend[] {
  const data: SalesTrend[] = []
  const base = 15_000_000
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    const revenue = base + Math.round((Math.random() - 0.4) * base * 0.8)
    const orders = Math.round(5 + Math.random() * 20)
    data.push({ date, revenue: Math.max(revenue, 0), orders })
  }
  return data
}

export const MOCK_SALES_TREND_7 = generateDays(7)
export const MOCK_SALES_TREND_30 = generateDays(30)

export const MOCK_TOP_PRODUCTS: TopSellingProduct[] = [
  { product_id: '1', product_name: 'Teak Dining Table 6-Seater', master_sku: 'TEAK-DT-001', sold_qty: 142, revenue: 1_207_000_000 },
  { product_id: '2', product_name: 'Wireless Earbuds Pro', master_sku: 'ELEC-EB-001', sold_qty: 389, revenue: 466_800_000 },
  { product_id: '3', product_name: 'Ergonomic Office Chair', master_sku: 'ERGO-CH-001', sold_qty: 98, revenue: 441_000_000 },
  { product_id: '4', product_name: 'Smart Watch Series X', master_sku: 'ELEC-SW-001', sold_qty: 115, revenue: 402_500_000 },
  { product_id: '5', product_name: 'Standing Desk Electric', master_sku: 'DESK-EL-001', sold_qty: 54, revenue: 388_800_000 },
  { product_id: '6', product_name: 'Sofa 3-Seater Grey', master_sku: 'SOFA-3S-001', sold_qty: 31, revenue: 372_000_000 },
  { product_id: '7', product_name: 'Monitor 27" IPS 144Hz', master_sku: 'ELEC-MN-001', sold_qty: 52, revenue: 353_600_000 },
  { product_id: '8', product_name: 'King Bed Frame Walnut', master_sku: 'BED-KG-001', sold_qty: 35, revenue: 343_000_000 },
  { product_id: '9', product_name: 'Linen Shirt Men White', master_sku: 'CLO-LS-001', sold_qty: 620, revenue: 260_400_000 },
  { product_id: '10', product_name: 'Mechanical Keyboard TKL', master_sku: 'ELEC-KB-001', sold_qty: 141, revenue: 253_800_000 },
]

export const MOCK_LOW_STOCK: LowStockAlert[] = [
  { product_id: '1', product_name: 'Teak Dining Table 6-Seater', master_sku: 'TEAK-DT-001', stock_quantity: 0, safety_stock: 30, reorder_point: 10 },
  { product_id: '2', product_name: 'King Bed Frame Walnut', master_sku: 'BED-KG-001', stock_quantity: 3, safety_stock: 25, reorder_point: 8 },
  { product_id: '3', product_name: 'Sofa 3-Seater Grey', master_sku: 'SOFA-3S-001', stock_quantity: 0, safety_stock: 20, reorder_point: 6 },
  { product_id: '4', product_name: 'Wardrobe 3-Door Sliding', master_sku: 'WARD-3D-001', stock_quantity: 5, safety_stock: 20, reorder_point: 7 },
  { product_id: '5', product_name: 'Ergonomic Office Chair', master_sku: 'ERGO-CH-001', stock_quantity: 8, safety_stock: 40, reorder_point: 15 },
  { product_id: '6', product_name: 'Monitor 27" IPS 144Hz', master_sku: 'ELEC-MN-001', stock_quantity: 6, safety_stock: 30, reorder_point: 10 },
  { product_id: '7', product_name: 'RC Car Off-Road', master_sku: 'TOYS-RC-001', stock_quantity: 2, safety_stock: 25, reorder_point: 8 },
  { product_id: '8', product_name: 'Adjustable Dumbbell 20kg', master_sku: 'SPRT-DB-001', stock_quantity: 4, safety_stock: 20, reorder_point: 6 },
  { product_id: '9', product_name: 'Standing Desk Electric', master_sku: 'DESK-EL-001', stock_quantity: 0, safety_stock: 25, reorder_point: 8 },
]
