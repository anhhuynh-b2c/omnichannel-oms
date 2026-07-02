'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { assertRole } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'

// Returns { '/route': ['ADMIN', 'SALES_STAFF', ...], ... }
export async function getPermissionsMap(): Promise<Record<string, string[]>> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('role_permissions')
    .select('role_name, route')
  if (error) throw new Error(error.message)

  const map: Record<string, string[]> = {}
  for (const row of data ?? []) {
    if (!map[row.route]) map[row.route] = []
    map[row.route].push(row.role_name)
  }
  return map
}

// Returns routes this role can access
export async function getRoleRoutes(role: string): Promise<string[]> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('role_permissions')
    .select('route')
    .eq('role_name', role)
  return (data ?? []).map(r => r.route)
}

export async function saveRolePermissions(role: string, routes: string[]): Promise<void> {
  await assertRole(['ADMIN'])

  // ADMIN must always keep /settings — prevent self-lockout
  if (role === 'ADMIN' && !routes.includes('/settings')) {
    routes = [...routes, '/settings']
  }

  const supabase = await createServiceClient()

  // Replace all permissions for this role atomically
  await supabase.from('role_permissions').delete().eq('role_name', role)

  if (routes.length > 0) {
    const rows = routes.map(route => ({ role_name: role, route }))
    const { error } = await supabase.from('role_permissions').insert(rows)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/settings')
}
