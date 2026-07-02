'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { assertRole } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'

export interface ManagedUser {
  id: string
  auth_id: string | null
  name: string
  email: string
  role_id: string
  role_name: string
  created_at: string
  last_sign_in_at: string | null
  is_banned: boolean
  invite_pending: boolean // accepted invite or not
}

export interface RoleOption {
  id: string
  name: string
}

export async function getUsers(): Promise<ManagedUser[]> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()

  const [{ data: dbUsers, error }, { data: { users: authUsers } }] = await Promise.all([
    supabase.from('users').select('id, name, email, role_id, created_at, roles(name)').order('created_at'),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])
  if (error) throw new Error(error.message)

  const authByEmail = new Map(authUsers.map(u => [u.email, u]))

  return (dbUsers ?? []).map(u => {
    const auth = authByEmail.get(u.email)
    return {
      id: u.id,
      auth_id: auth?.id ?? null,
      name: u.name,
      email: u.email,
      role_id: u.role_id,
      role_name: (u.roles as any)?.name ?? '',
      created_at: u.created_at,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      is_banned: !!(auth?.banned_until && new Date(auth.banned_until) > new Date()),
      invite_pending: !auth?.last_sign_in_at,
    }
  })
}

export async function getRoles(): Promise<RoleOption[]> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.from('roles').select('id, name').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role_id: string
}): Promise<void> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()

  const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // skip email verification
    user_metadata: { name: data.name },
  })
  if (createErr) {
    if (createErr.message.includes('already been registered')) throw new Error(`Email "${data.email}" đã tồn tại.`)
    throw new Error(createErr.message)
  }

  const { error: insertErr } = await supabase.from('users').insert({
    name: data.name,
    email: data.email,
    role_id: data.role_id,
  })
  if (insertErr) {
    if (authData?.user?.id) await supabase.auth.admin.deleteUser(authData.user.id)
    if (insertErr.code === '23505') throw new Error(`Email "${data.email}" đã tồn tại.`)
    throw new Error(insertErr.message)
  }

  revalidatePath('/settings')
}

export async function inviteUser(data: {
  name: string
  email: string
  role_id: string
}): Promise<void> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()

  const { data: authData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
    data.email,
    {
      data: { name: data.name },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/set-password`,
    }
  )
  if (inviteErr) throw new Error(inviteErr.message)

  const { error: insertErr } = await supabase.from('users').insert({
    name: data.name,
    email: data.email,
    role_id: data.role_id,
  })
  if (insertErr) {
    if (authData?.user?.id) await supabase.auth.admin.deleteUser(authData.user.id)
    if (insertErr.code === '23505') throw new Error(`Email "${data.email}" đã tồn tại.`)
    throw new Error(insertErr.message)
  }

  revalidatePath('/settings')
}

export async function updateUserRole(userId: string, roleId: string): Promise<void> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('users').update({ role_id: roleId }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function setUserPassword(authId: string, password: string): Promise<void> {
  await assertRole(['ADMIN'])
  if (password.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự')
  const supabase = await createServiceClient()
  const { error } = await supabase.auth.admin.updateUserById(authId, { password })
  if (error) throw new Error(error.message)
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('users').update({ name }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function toggleBanUser(authId: string, ban: boolean): Promise<void> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.auth.admin.updateUserById(authId, {
    ban_duration: ban ? '876600h' : 'none',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function sendPasswordReset(email: string): Promise<void> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/set-password`,
  })
  if (error) throw new Error(error.message)
}

export async function deleteUser(userId: string): Promise<void> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()

  const { data: user } = await supabase.from('users').select('email').eq('id', userId).single()

  if (user?.email) {
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const authUser = authUsers.find(u => u.email === user.email)
    if (authUser) await supabase.auth.admin.deleteUser(authUser.id)
  }

  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function bulkDeleteUsers(userIds: string[]): Promise<void> {
  await assertRole(['ADMIN'])
  await Promise.all(userIds.map(id => deleteUser(id)))
}

export async function bulkUpdateRole(userIds: string[], roleId: string): Promise<void> {
  await assertRole(['ADMIN'])
  const supabase = await createServiceClient()
  const { error } = await supabase.from('users').update({ role_id: roleId }).in('id', userIds)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
