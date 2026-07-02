'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export type AuditResourceType =
  | 'order'
  | 'purchase_order'
  | 'product'
  | 'inventory'
  | 'supplier'
  | 'category'
  | 'settings'

interface AuditLogParams {
  action: AuditAction
  resourceType: AuditResourceType
  resourceId: string
  resourceLabel?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (!user) return  // unauthenticated actions (e.g. system jobs) are not logged

    const serviceClient = await createServiceClient()
    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email ?? 'unknown',
      user_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      resource_label: params.resourceLabel ?? null,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      metadata: params.metadata ?? null,
    })
  } catch {
    // Audit log failure must never break the main operation
  }
}

export async function getAuditLogs(params?: {
  search?: string           // free-text: user_email, resource_label, resource_id
  userEmail?: string        // exact match from dropdown
  action?: AuditAction
  resourceType?: AuditResourceType
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  const serviceClient = await createServiceClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = serviceClient
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params?.search) {
    const q = `%${params.search}%`
    query = query.or(
      `user_email.ilike.${q},resource_label.ilike.${q},resource_id.ilike.${q}`
    )
  }
  if (params?.userEmail)    query = query.eq('user_email', params.userEmail)
  if (params?.action)       query = query.eq('action', params.action)
  if (params?.resourceType) query = query.eq('resource_type', params.resourceType)
  if (params?.dateFrom)     query = query.gte('created_at', params.dateFrom)
  if (params?.dateTo)       query = query.lte('created_at', params.dateTo)

  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getAuditLogActors() {
  const serviceClient = await createServiceClient()
  const { data } = await serviceClient
    .from('audit_logs')
    .select('user_email, user_name')
    .order('user_email')
  if (!data) return []
  const seen = new Set<string>()
  return data.filter(r => {
    if (seen.has(r.user_email)) return false
    seen.add(r.user_email)
    return true
  })
}
