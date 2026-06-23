import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const uuid = () => crypto.randomUUID()

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// ─── Data Definitions ─────────────────────────────────────────────────────────

const CATEGORIES = ['Furniture', 'Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors', 'Health & Beauty', 'Books & Stationery', 'Toys & Games']

const PRODUCT_TEMPLATES = [
  { name: 'Teak Dining Table 6-Seater', sku: 'TEAK-DT-001', cat: 'Furniture', price: 8500000, cost: 4200000 },
  { name: 'Teak Dining Table 4-Seater', sku: 'TEAK-DT-002', cat: 'Furniture', price: 6200000, cost: 3100000 },
  { name: 'Bamboo Shelf Unit 5-Tier', sku: 'BAMB-SH-001', cat: 'Furniture', price: 1800000, cost: 850000 },
  { name: 'Oak Coffee Table Round', sku: 'OAK-CT-001', cat: 'Furniture', price: 3200000, cost: 1600000 },
  { name: 'Ergonomic Office Chair', sku: 'ERGO-CH-001', cat: 'Furniture', price: 4500000, cost: 2100000 },
  { name: 'Standing Desk Electric', sku: 'DESK-EL-001', cat: 'Furniture', price: 7200000, cost: 3600000 },
  { name: 'Sofa 3-Seater Grey', sku: 'SOFA-3S-001', cat: 'Furniture', price: 12000000, cost: 6000000 },
  { name: 'King Bed Frame Walnut', sku: 'BED-KG-001', cat: 'Furniture', price: 9800000, cost: 4900000 },
  { name: 'Wardrobe 3-Door Sliding', sku: 'WARD-3D-001', cat: 'Furniture', price: 6800000, cost: 3400000 },
  { name: 'TV Console Modern White', sku: 'TVCN-MW-001', cat: 'Furniture', price: 2800000, cost: 1400000 },
  { name: 'Wireless Earbuds Pro', sku: 'ELEC-EB-001', cat: 'Electronics', price: 1200000, cost: 500000 },
  { name: 'Smart Watch Series X', sku: 'ELEC-SW-001', cat: 'Electronics', price: 3500000, cost: 1500000 },
  { name: 'Bluetooth Speaker Mini', sku: 'ELEC-BS-001', cat: 'Electronics', price: 650000, cost: 280000 },
  { name: 'LED Desk Lamp USB-C', sku: 'ELEC-DL-001', cat: 'Electronics', price: 450000, cost: 180000 },
  { name: 'Wireless Charger Pad 15W', sku: 'ELEC-WC-001', cat: 'Electronics', price: 380000, cost: 150000 },
  { name: 'Mechanical Keyboard TKL', sku: 'ELEC-KB-001', cat: 'Electronics', price: 1800000, cost: 820000 },
  { name: 'Gaming Mouse RGB', sku: 'ELEC-MS-001', cat: 'Electronics', price: 850000, cost: 350000 },
  { name: 'Webcam 4K Auto-Focus', sku: 'ELEC-WB-001', cat: 'Electronics', price: 1600000, cost: 700000 },
  { name: 'Monitor 27" IPS 144Hz', sku: 'ELEC-MN-001', cat: 'Electronics', price: 6800000, cost: 3200000 },
  { name: 'USB-C Hub 7-in-1', sku: 'ELEC-HB-001', cat: 'Electronics', price: 520000, cost: 200000 },
  { name: 'Linen Shirt Men White', sku: 'CLO-LS-001', cat: 'Clothing', price: 420000, cost: 150000 },
  { name: 'Slim Fit Chinos Beige', sku: 'CLO-CH-001', cat: 'Clothing', price: 580000, cost: 210000 },
  { name: 'Summer Dress Floral', sku: 'CLO-SD-001', cat: 'Clothing', price: 490000, cost: 180000 },
  { name: 'Running Shoes Mesh', sku: 'CLO-RS-001', cat: 'Clothing', price: 1200000, cost: 520000 },
  { name: 'Hoodie Unisex Black', sku: 'CLO-HD-001', cat: 'Clothing', price: 680000, cost: 250000 },
  { name: 'Tote Bag Canvas Large', sku: 'CLO-TB-001', cat: 'Clothing', price: 280000, cost: 90000 },
  { name: 'Denim Jacket Vintage', sku: 'CLO-DJ-001', cat: 'Clothing', price: 980000, cost: 380000 },
  { name: 'Yoga Pants High-Waist', sku: 'CLO-YP-001', cat: 'Clothing', price: 520000, cost: 190000 },
  { name: 'Succulent Plant Set 3', sku: 'HOME-SP-001', cat: 'Home & Garden', price: 320000, cost: 110000 },
  { name: 'Scented Candle Vanilla', sku: 'HOME-SC-001', cat: 'Home & Garden', price: 180000, cost: 60000 },
  { name: 'Bamboo Cutting Board', sku: 'HOME-CB-001', cat: 'Home & Garden', price: 220000, cost: 80000 },
  { name: 'Cast Iron Skillet 26cm', sku: 'HOME-CI-001', cat: 'Home & Garden', price: 650000, cost: 280000 },
  { name: 'French Press Coffee 600ml', sku: 'HOME-FP-001', cat: 'Home & Garden', price: 380000, cost: 140000 },
  { name: 'Throw Pillow Set Linen', sku: 'HOME-TP-001', cat: 'Home & Garden', price: 290000, cost: 100000 },
  { name: 'Wall Clock Minimalist', sku: 'HOME-WC-001', cat: 'Home & Garden', price: 350000, cost: 130000 },
  { name: 'Yoga Mat TPE 6mm', sku: 'SPRT-YM-001', cat: 'Sports & Outdoors', price: 480000, cost: 190000 },
  { name: 'Resistance Band Set', sku: 'SPRT-RB-001', cat: 'Sports & Outdoors', price: 280000, cost: 100000 },
  { name: 'Adjustable Dumbbell 20kg', sku: 'SPRT-DB-001', cat: 'Sports & Outdoors', price: 1800000, cost: 750000 },
  { name: 'Jump Rope Speed Cable', sku: 'SPRT-JR-001', cat: 'Sports & Outdoors', price: 180000, cost: 60000 },
  { name: 'Water Bottle 1L Tritan', sku: 'SPRT-WB-001', cat: 'Sports & Outdoors', price: 220000, cost: 80000 },
  { name: 'Face Serum Vitamin C', sku: 'HLTH-FS-001', cat: 'Health & Beauty', price: 480000, cost: 180000 },
  { name: 'Collagen Supplement 30 Pack', sku: 'HLTH-CL-001', cat: 'Health & Beauty', price: 620000, cost: 240000 },
  { name: 'Mineral Sunscreen SPF50', sku: 'HLTH-SS-001', cat: 'Health & Beauty', price: 320000, cost: 110000 },
  { name: 'Diffuser Essential Oil Set', sku: 'HLTH-DO-001', cat: 'Health & Beauty', price: 580000, cost: 220000 },
  { name: 'Electric Toothbrush Pro', sku: 'HLTH-ET-001', cat: 'Health & Beauty', price: 890000, cost: 380000 },
  { name: 'Sketchbook A4 200g 50p', sku: 'BOOK-SB-001', cat: 'Books & Stationery', price: 120000, cost: 45000 },
  { name: 'Fountain Pen Set Luxury', sku: 'BOOK-FP-001', cat: 'Books & Stationery', price: 680000, cost: 280000 },
  { name: 'Planner 2025 Hardcover', sku: 'BOOK-PL-001', cat: 'Books & Stationery', price: 280000, cost: 95000 },
  { name: 'Sticky Notes Pastel 400p', sku: 'BOOK-SN-001', cat: 'Books & Stationery', price: 85000, cost: 30000 },
  { name: 'Building Blocks 1000pc', sku: 'TOYS-BB-001', cat: 'Toys & Games', price: 850000, cost: 340000 },
  { name: 'Board Game Strategy', sku: 'TOYS-BG-001', cat: 'Toys & Games', price: 580000, cost: 220000 },
  { name: 'RC Car Off-Road', sku: 'TOYS-RC-001', cat: 'Toys & Games', price: 980000, cost: 420000 },
]

const CHANNEL_PREFIXES: Record<string, string> = {
  Shopee: 'SP', 'TikTok Shop': 'TT', Lazada: 'LZD', Facebook: 'FB', Instagram: 'IG', Website: 'WEB'
}

const FIRST_NAMES = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vo', 'Dang', 'Bui', 'Do', 'Ngo']
const LAST_NAMES = ['An', 'Binh', 'Cuong', 'Dung', 'Em', 'Giang', 'Ha', 'Hoa', 'Khanh', 'Lan', 'Mai', 'Nam', 'Oanh', 'Phong', 'Quynh']
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const PO_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'RECEIVED']

async function main() {
  console.log('🌱 Starting seed...')

  // Fetch channels
  const { data: channels } = await supabase.from('channels').select('*')
  if (!channels?.length) throw new Error('No channels found. Run migration first.')

  // ─── Suppliers ───────────────────────────────────────────────────────────────
  console.log('  Creating suppliers...')
  const supplierData = [
    { supplier_name: 'Moc Viet Furniture Co.', phone: '0901234567', email: 'supply@mocviet.vn', address: '123 Nguyen Trai, Hanoi' },
    { supplier_name: 'Tech Imports Asia', phone: '0912345678', email: 'orders@techimports.asia', address: '45 Le Loi, Ho Chi Minh City' },
    { supplier_name: 'Fashion Forward VN', phone: '0923456789', email: 'bulk@fashionforward.vn', address: '78 Hai Ba Trung, Da Nang' },
    { supplier_name: 'GreenHome Supplies', phone: '0934567890', email: 'info@greenhome.vn', address: '12 Tran Hung Dao, Can Tho' },
    { supplier_name: 'SportLife Distributors', phone: '0945678901', email: 'orders@sportlife.vn', address: '56 Phan Chu Trinh, Hue' },
    { supplier_name: 'BeautyBox Vietnam', phone: '0956789012', email: 'wholesale@beautybox.vn', address: '34 Le Duan, Hai Phong' },
    { supplier_name: 'Stationery World', phone: '0967890123', email: 'supply@statworld.vn', address: '89 Dong Khoi, Ho Chi Minh City' },
    { supplier_name: 'Kidzone Toys', phone: '0978901234', email: 'bulk@kidzone.vn', address: '23 Hoang Dieu, Bien Hoa' },
    { supplier_name: 'Global Electronics HK', phone: '0989012345', email: 'orders@globalelec.hk', address: 'Unit 5, Kowloon Bay, Hong Kong' },
    { supplier_name: 'Eco Materials Corp', phone: '0990123456', email: 'sales@ecomaterials.vn', address: '67 Ba Dinh, Hanoi' },
  ]

  const { data: suppliers } = await supabase.from('suppliers').insert(supplierData).select()
  if (!suppliers) throw new Error('Failed to insert suppliers')
  console.log(`  ✓ ${suppliers.length} suppliers`)

  // ─── Products ────────────────────────────────────────────────────────────────
  console.log('  Creating products...')
  const productRows = PRODUCT_TEMPLATES.map(p => ({
    name: p.name,
    master_sku: p.sku,
    category: p.cat,
    description: `High-quality ${p.name.toLowerCase()} for everyday use.`,
    price: p.price,
    cost: p.cost,
    status: Math.random() > 0.1 ? 'ACTIVE' : 'INACTIVE',
    image_url: null,
  }))

  const { data: products } = await supabase.from('products').insert(productRows).select()
  if (!products) throw new Error('Failed to insert products')
  console.log(`  ✓ ${products.length} products`)

  // ─── Inventory ───────────────────────────────────────────────────────────────
  console.log('  Creating inventory...')
  const inventoryRows = products.map((p, i) => {
    const reorder_point = rand(5, 20)
    const safety_stock = rand(20, 60)
    let stock_quantity: number
    const r = Math.random()
    if (i % 8 === 0) stock_quantity = 0
    else if (i % 5 === 0) stock_quantity = rand(1, reorder_point)
    else stock_quantity = rand(safety_stock, safety_stock * 4)

    return { product_id: p.id, stock_quantity, reorder_point, safety_stock }
  })

  const { error: invErr } = await supabase.from('inventory').insert(inventoryRows)
  if (invErr) throw invErr
  console.log(`  ✓ ${inventoryRows.length} inventory records`)

  // ─── Channel SKU Mappings ────────────────────────────────────────────────────
  console.log('  Creating channel SKU mappings...')
  const mappings: { product_id: string; channel_id: string; channel_sku: string }[] = []
  for (const product of products) {
    for (const channel of channels) {
      const prefix = CHANNEL_PREFIXES[channel.name] || 'CH'
      const shortSku = product.master_sku.replace(/-/g, '').substring(0, 8).toUpperCase()
      mappings.push({
        product_id: product.id,
        channel_id: channel.id,
        channel_sku: `${prefix}-${shortSku}`,
      })
    }
  }
  const { error: mapErr } = await supabase.from('channel_sku_mapping').insert(mappings)
  if (mapErr) throw mapErr
  console.log(`  ✓ ${mappings.length} SKU mappings`)

  // ─── Customers ───────────────────────────────────────────────────────────────
  console.log('  Creating customers...')
  const customerRows = Array.from({ length: 200 }, () => {
    const first = pick(FIRST_NAMES)
    const last = pick(LAST_NAMES)
    return {
      name: `${first} ${last}`,
      phone: `09${rand(10000000, 99999999)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${rand(1, 99)}@email.com`,
      address: `${rand(1, 200)} Duong so ${rand(1, 50)}, Quan ${rand(1, 12)}, TP.HCM`,
    }
  })

  const { data: customers } = await supabase.from('customers').insert(customerRows).select()
  if (!customers) throw new Error('Failed to insert customers')
  console.log(`  ✓ ${customers.length} customers`)

  // ─── Orders ──────────────────────────────────────────────────────────────────
  console.log('  Creating 500+ orders...')
  const orderRows = []
  for (let i = 0; i < 520; i++) {
    const channel = pick(channels)
    const customer = pick(customers)
    const daysBack = rand(0, 90)
    orderRows.push({
      channel_id: channel.id,
      customer_id: customer.id,
      order_number: `ORD-${(100000 + i).toString()}`,
      total_amount: rand(200000, 15000000),
      status: pick(ORDER_STATUSES),
      order_date: daysAgo(daysBack),
    })
  }

  const { data: orders } = await supabase.from('orders').insert(orderRows).select()
  if (!orders) throw new Error('Failed to insert orders')
  console.log(`  ✓ ${orders.length} orders`)

  // ─── Order Items ─────────────────────────────────────────────────────────────
  console.log('  Creating order items...')
  const orderItemRows = []
  for (const order of orders) {
    const numItems = rand(1, 4)
    const usedProducts = new Set<string>()
    for (let j = 0; j < numItems; j++) {
      const product = pick(products)
      if (usedProducts.has(product.id)) continue
      usedProducts.add(product.id)
      const qty = rand(1, 5)
      orderItemRows.push({
        order_id: order.id,
        product_id: product.id,
        quantity: qty,
        price: product.price,
        subtotal: product.price * qty,
      })
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < orderItemRows.length; i += 500) {
    const { error } = await supabase.from('order_items').insert(orderItemRows.slice(i, i + 500))
    if (error) throw error
  }
  console.log(`  ✓ ${orderItemRows.length} order items`)

  // ─── Purchase Orders ─────────────────────────────────────────────────────────
  console.log('  Creating purchase orders...')
  const poRows = Array.from({ length: 40 }, (_, i) => {
    const expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() + rand(-30, 30))
    return {
      supplier_id: pick(suppliers).id,
      expected_date: expectedDate.toISOString().split('T')[0],
      status: pick(PO_STATUSES),
    }
  })

  const { data: pos } = await supabase.from('purchase_orders').insert(poRows).select()
  if (!pos) throw new Error('Failed to insert purchase orders')

  const poItemRows = []
  for (const po of pos) {
    const numItems = rand(2, 6)
    for (let j = 0; j < numItems; j++) {
      const product = pick(products)
      poItemRows.push({
        purchase_order_id: po.id,
        product_id: product.id,
        quantity: rand(10, 100),
        cost: product.cost,
      })
    }
  }

  const { error: poItemErr } = await supabase.from('purchase_order_items').insert(poItemRows)
  if (poItemErr) throw poItemErr
  console.log(`  ✓ ${pos.length} purchase orders, ${poItemRows.length} PO items`)

  // ─── Inventory Movements ─────────────────────────────────────────────────────
  console.log('  Creating inventory movements...')
  const movRows = []
  // PURCHASE movements for RECEIVED POs
  for (const po of pos.filter(p => p.status === 'RECEIVED')) {
    const items = poItemRows.filter(i => i.purchase_order_id === po.id)
    for (const item of items) {
      movRows.push({
        product_id: item.product_id,
        qty_change: item.quantity,
        movement_type: 'PURCHASE',
        reference_id: po.id,
      })
    }
  }
  // SALE movements for CONFIRMED+ orders
  const confirmedOrders = orders.filter(o =>
    ['CONFIRMED', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'].includes(o.status)
  )
  for (const order of confirmedOrders.slice(0, 200)) {
    const items = orderItemRows.filter(i => i.order_id === order.id)
    for (const item of items) {
      movRows.push({
        product_id: item.product_id,
        qty_change: -item.quantity,
        movement_type: 'SALE',
        reference_id: order.id,
      })
    }
  }

  for (let i = 0; i < movRows.length; i += 500) {
    const { error } = await supabase.from('inventory_movements').insert(movRows.slice(i, i + 500))
    if (error) throw error
  }
  console.log(`  ✓ ${movRows.length} inventory movements`)

  console.log('\n✅ Seed complete!')
  console.log(`   Products: ${products.length}`)
  console.log(`   Customers: ${customers.length}`)
  console.log(`   Orders: ${orders.length}`)
  console.log(`   Purchase Orders: ${pos.length}`)
  console.log(`   Suppliers: ${suppliers.length}`)
}

main().catch(e => {
  console.error('Seed failed:', e)
  process.exit(1)
})
