'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAuditLogs, getAuditLogActors } from '@/lib/audit'
import { Shield, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AuditLog = Awaited<ReturnType<typeof getAuditLogs>>['data'][number]
type Actor = { user_email: string; user_name: string | null }

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
}

const RESOURCE_LABELS: Record<string, string> = {
  order: 'Đơn hàng',
  purchase_order: 'Đơn nhập hàng',
  product: 'Sản phẩm',
  inventory: 'Kho hàng',
  supplier: 'Nhà cung cấp',
  category: 'Danh mục',
  settings: 'Cài đặt',
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
}

function DiffRow({ label, oldVal, newVal }: { label: string; oldVal: unknown; newVal: unknown }) {
  const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal) : '—'
  const newStr = newVal !== undefined && newVal !== null ? String(newVal) : '—'
  if (oldStr === newStr) return null
  return (
    <tr className="text-xs">
      <td className="py-1 pr-3 text-slate-500 font-medium">{label}</td>
      <td className="py-1 pr-3 text-red-600 line-through">{oldStr}</td>
      <td className="py-1 text-green-700">{newStr}</td>
    </tr>
  )
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasDiff = log.old_data || log.new_data

  const allKeys = Array.from(new Set([
    ...Object.keys((log.old_data as Record<string, unknown>) ?? {}),
    ...Object.keys((log.new_data as Record<string, unknown>) ?? {}),
  ]))

  return (
    <>
      <tr
        className={`border-b transition-colors ${hasDiff ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
        onClick={() => hasDiff && setExpanded(v => !v)}
      >
        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
          {new Date(log.created_at).toLocaleString('vi-VN')}
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium">{log.user_name ?? log.user_email}</div>
          {log.user_name && <div className="text-xs text-slate-400">{log.user_email}</div>}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-700'}`}>
            {ACTION_LABELS[log.action] ?? log.action}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">{RESOURCE_LABELS[log.resource_type] ?? log.resource_type}</td>
        <td className="px-4 py-3 text-sm text-slate-700 font-mono">{log.resource_label ?? log.resource_id}</td>
        <td className="px-4 py-3 text-slate-400 w-8">
          {hasDiff && (expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
        </td>
      </tr>
      {expanded && hasDiff && (
        <tr className="bg-slate-50 border-b">
          <td colSpan={6} className="px-8 py-3">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="text-left pb-1 w-32">Trường</th>
                  <th className="text-left pb-1 w-40">Trước</th>
                  <th className="text-left pb-1">Sau</th>
                </tr>
              </thead>
              <tbody>
                {allKeys.map(key => (
                  <DiffRow
                    key={key}
                    label={key}
                    oldVal={(log.old_data as Record<string, unknown>)?.[key]}
                    newVal={(log.new_data as Record<string, unknown>)?.[key]}
                  />
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

export function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actors, setActors] = useState<Actor[]>([])

  // filters
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [userEmail, setUserEmail] = useState('ALL')
  const [action, setAction] = useState('ALL')
  const [resourceType, setResourceType] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    getAuditLogActors().then(setActors)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAuditLogs({
        search: search || undefined,
        userEmail: userEmail !== 'ALL' ? userEmail : undefined,
        action: action !== 'ALL' ? action as never : undefined,
        resourceType: resourceType !== 'ALL' ? resourceType as never : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo ? dateTo + 'T23:59:59' : undefined,
        page,
        pageSize: 20,
      })
      setLogs(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } finally {
      setLoading(false)
    }
  }, [search, userEmail, action, resourceType, dateFrom, dateTo, page])

  useEffect(() => { load() }, [load])

  const hasFilter = search || userEmail !== 'ALL' || action !== 'ALL' || resourceType !== 'ALL' || dateFrom || dateTo

  function clearAll() {
    setSearch(''); setSearchInput('')
    setUserEmail('ALL'); setAction('ALL'); setResourceType('ALL')
    setDateFrom(''); setDateTo('')
    setPage(1)
  }

  function handleSearch() {
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-semibold">Nhật ký hoạt động</h1>
        <Badge variant="secondary">{total} bản ghi</Badge>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        {/* Row 1: search + dropdowns trên cùng 1 hàng */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-[2] min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 w-full"
              placeholder="Tìm theo email, mã đơn hàng, tên sản phẩm..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <Select value={userEmail} onValueChange={v => { setUserEmail(v); setPage(1) }}>
            <SelectTrigger className="flex-[1.5] min-w-0">
              <SelectValue placeholder="Nhân viên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả nhân viên</SelectItem>
              {actors.map(a => (
                <SelectItem key={a.user_email} value={a.user_email}>
                  {a.user_name ? `${a.user_name} (${a.user_email})` : a.user_email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={action} onValueChange={v => { setAction(v); setPage(1) }}>
            <SelectTrigger className="flex-1 min-w-0">
              <SelectValue placeholder="Hành động" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả hành động</SelectItem>
              <SelectItem value="CREATE">Tạo mới</SelectItem>
              <SelectItem value="UPDATE">Cập nhật</SelectItem>
              <SelectItem value="DELETE">Xóa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={resourceType} onValueChange={v => { setResourceType(v); setPage(1) }}>
            <SelectTrigger className="flex-1 min-w-0">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả loại</SelectItem>
              {Object.entries(RESOURCE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="flex-1 min-w-0"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
          />
          <span className="text-slate-400 shrink-0">—</span>
          <Input
            type="date"
            className="flex-1 min-w-0"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
          />

          <Button onClick={handleSearch} className="shrink-0">Tìm</Button>

          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-3.5 h-3.5" />
              Xóa lọc
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Người thực hiện</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Hành động</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Đối tượng</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Đang tải...</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-slate-400">Không tìm thấy bản ghi nào</p>
                    {hasFilter && (
                      <button onClick={clearAll} className="mt-2 text-sm text-blue-500 hover:underline">
                        Xóa bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map(log => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Trang {page} / {totalPages} · {total} bản ghi</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Trước
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              )
            })}
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
