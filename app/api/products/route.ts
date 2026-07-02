import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''

  const supabase = await createServiceClient()

  let query = supabase
    .from('products')
    .select('id, name, master_sku, price, category, image_url, inventory(stock_quantity, inventory_status)')
    .order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,master_sku.ilike.%${search}%`)
  }
  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
