'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface AccountProfile {
  name: string
  email: string
  role_name: string
}

export async function getAccountProfile(): Promise<AccountProfile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')

  const service = await createServiceClient()
  const { data } = await service
    .from('users')
    .select('name, roles(name)')
    .eq('email', user.email!)
    .maybeSingle()

  return {
    name: data?.name ?? user.email?.split('@')[0] ?? '',
    email: user.email ?? '',
    role_name: (data?.roles as any)?.name ?? '',
  }
}

export async function updateAccountName(name: string): Promise<void> {
  if (!name.trim()) throw new Error('Tên không được để trống')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')

  const service = await createServiceClient()
  const { error } = await service
    .from('users')
    .update({ name: name.trim() })
    .eq('email', user.email!)
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}

export async function updateAccountPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('Chưa đăng nhập')

  // Verify current password by signing in again
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInErr) throw new Error('Mật khẩu hiện tại không đúng')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}
