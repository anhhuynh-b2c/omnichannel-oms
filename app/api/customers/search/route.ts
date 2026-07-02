import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone') ?? ''

  if (!phone) return NextResponse.json([])

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, address, email')
    .ilike('phone', `%${phone}%`)
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
