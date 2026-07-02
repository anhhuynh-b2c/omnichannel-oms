'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { assertRole } from '@/lib/auth/server'

export async function getSupplierList() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('*, purchase_orders(id)')
    .order('supplier_name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createSupplier(data: {
  supplier_name: string
  phone?: string
  email?: string
  address?: string
}) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('suppliers').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/suppliers')
  revalidatePath('/purchase-orders')
}

export async function updateSupplier(id: string, data: {
  supplier_name: string
  phone?: string
  email?: string
  address?: string
}) {
  await assertRole(['ADMIN', 'WAREHOUSE_STAFF'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('suppliers').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/suppliers')
  revalidatePath('/purchase-orders')
}

export async function deleteSupplier(id: string) {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/suppliers')
}
