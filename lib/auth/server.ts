'use server'

import { createClient } from '@/lib/supabase/server'
import type { Role } from './roles'

export async function getUserRole(): Promise<Role | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (user.app_metadata?.role as Role) ?? null
}

export async function assertRole(allowed: Role[]): Promise<void> {
  const role = await getUserRole()
  if (!role || !allowed.includes(role)) {
    throw new Error('Unauthorized')
  }
}
