'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { CompanySettings } from '@/types'

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single()
  return data ?? null
}

export async function saveCompanySettings(values: Omit<CompanySettings, 'id' | 'updated_at'>) {
  const supabase = await createServiceClient()
  const { data: existing } = await supabase.from('company_settings').select('id').limit(1).single()

  if (existing) {
    const { error } = await supabase
      .from('company_settings')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('company_settings').insert(values)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/settings')
  revalidatePath('/purchase-orders')
}
