'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { assertRole } from '@/lib/auth/server'
import type { CustomerFormData } from '@/types'

export async function getCustomerList() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      orders(id, total_amount, order_date)
    `)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((c: any) => ({
    ...c,
    total_orders: c.orders?.length ?? 0,
    total_spent: c.orders?.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) ?? 0,
    last_order_date: c.orders?.length
      ? c.orders.sort((a: any, b: any) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0].order_date
      : null,
  }))
}

export async function getCustomerById(id: string) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('customers')
    .select(`*, orders(*, channel:channels(name, icon), items:order_items(*, product:products(name, master_sku)))`)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createCustomer(form: CustomerFormData) {
  await assertRole(['ADMIN', 'SALES_STAFF'])
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      address: form.address?.trim() || null,
      customer_group: form.customer_group,
      source_channel: form.source_channel || null,
      city: form.city?.trim() || null,
      district: form.district?.trim() || null,
      notes: form.notes?.trim() || null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/customers')
  return data
}

export async function updateCustomer(id: string, form: CustomerFormData) {
  await assertRole(['ADMIN', 'SALES_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('customers')
    .update({
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      address: form.address?.trim() || null,
      customer_group: form.customer_group,
      source_channel: form.source_channel || null,
      city: form.city?.trim() || null,
      district: form.district?.trim() || null,
      notes: form.notes?.trim() || null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/customers')
}

export async function deleteCustomer(id: string) {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/customers')
}

/** Find or create by phone — used by POS checkout */
export async function findOrCreateCustomer(name: string, phone: string) {
  const supabase = await createServiceClient()
  if (phone) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()
    if (existing) return existing.id
  }
  const { data, error } = await supabase
    .from('customers')
    .insert({ name: name || 'Khách lẻ', phone: phone || null, customer_group: 'REGULAR' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/customers')
  return data.id
}
