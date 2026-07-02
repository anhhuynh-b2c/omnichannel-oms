import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/accountant/payments?po_id=xxx  — list payments for one PO
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const poId = req.nextUrl.searchParams.get('po_id')
  if (!poId) return NextResponse.json({ error: 'po_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('po_payments')
    .select('*')
    .eq('purchase_order_id', poId)
    .order('payment_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/accountant/payments — record a new payment
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { purchase_order_id, amount, payment_date, method, reference_number, notes } = body
  if (!purchase_order_id || !amount) {
    return NextResponse.json({ error: 'purchase_order_id and amount required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('po_payments')
    .insert({ purchase_order_id, amount, payment_date, method, reference_number, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
