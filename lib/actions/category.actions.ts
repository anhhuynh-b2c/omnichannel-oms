'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { assertRole } from '@/lib/auth/server'

export async function getCategories() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCategory(data: { name: string; description?: string }) {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true })
  const { error } = await supabase.from('categories').insert({ ...data, sort_order: (count ?? 0) + 1 })
  if (error) {
    if (error.code === '23505') throw new Error(`Category "${data.name}" already exists.`)
    throw new Error(error.message)
  }
  revalidatePath('/categories')
}

export async function updateCategory(id: string, data: { name?: string; description?: string }) {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('categories').update(data).eq('id', id)
  if (error) {
    if (error.code === '23505') throw new Error(`Category "${data.name}" already exists.`)
    throw new Error(error.message)
  }
  revalidatePath('/categories')
}

export async function deleteCategory(id: string) {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/categories')
}
