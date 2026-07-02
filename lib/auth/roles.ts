export type Role = 'ADMIN' | 'WAREHOUSE_STAFF' | 'SALES_STAFF' | 'ACCOUNTANT'

export const ALL_ROLES: Role[] = ['ADMIN', 'WAREHOUSE_STAFF', 'SALES_STAFF', 'ACCOUNTANT']

// Which roles can access each route prefix
export const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  '/':                 ALL_ROLES,
  '/products':         ['ADMIN', 'WAREHOUSE_STAFF', 'SALES_STAFF'],
  '/categories':       ['ADMIN'],
  '/inventory':        ['ADMIN', 'WAREHOUSE_STAFF'],
  '/fulfillment':      ['ADMIN', 'WAREHOUSE_STAFF'],
  '/customers':        ['ADMIN', 'SALES_STAFF'],
  '/orders':           ALL_ROLES,
  '/sale':             ['ADMIN', 'SALES_STAFF'],
  '/purchase-orders':  ['ADMIN', 'WAREHOUSE_STAFF', 'ACCOUNTANT'],
  '/suppliers':        ['ADMIN', 'WAREHOUSE_STAFF'],
  '/reports':          ['ADMIN', 'SALES_STAFF', 'ACCOUNTANT'],
  '/accountant':       ['ADMIN', 'ACCOUNTANT'],
  '/integrations':     ['ADMIN'],
  '/audit-logs':       ['ADMIN'],
  '/settings':         ALL_ROLES,
}

// Nav items config — sidebar filters this by role
export const NAV_ITEMS = [
  { href: '/',                label: 'nav.dashboard',      roles: ALL_ROLES },
  { href: '/products',        label: 'nav.products',       roles: ['ADMIN', 'WAREHOUSE_STAFF', 'SALES_STAFF'] },
  { href: '/categories',      label: 'nav.categories',     roles: ['ADMIN'] },
  { href: '/inventory',       label: 'nav.inventory',      roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  { href: '/fulfillment',     label: 'nav.fulfillment',    roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  { href: '/customers',       label: 'nav.customers',      roles: ['ADMIN', 'SALES_STAFF'] },
  { href: '/orders',          label: 'nav.orders',         roles: ALL_ROLES },
  { href: '/sale',            label: 'nav.sale',           roles: ['ADMIN', 'SALES_STAFF'] },
  { href: '/purchase-orders', label: 'nav.purchaseOrders', roles: ['ADMIN', 'WAREHOUSE_STAFF', 'ACCOUNTANT'] },
  { href: '/suppliers',       label: 'nav.suppliers',      roles: ['ADMIN', 'WAREHOUSE_STAFF'] },
  { href: '/reports',         label: 'nav.reports',        roles: ['ADMIN', 'SALES_STAFF', 'ACCOUNTANT'] },
  { href: '/accountant',      label: 'nav.accountant',     roles: ['ADMIN', 'ACCOUNTANT'] },
  { href: '/integrations',    label: 'nav.integrations',   roles: ['ADMIN'] },
  { href: '/audit-logs',      label: 'nav.auditLogs',      roles: ['ADMIN'] },
  { href: '/settings',        label: 'nav.settings',       roles: ALL_ROLES },
] as const

export function canAccess(role: Role | null, pathname: string): boolean {
  if (!role) return false

  // Find the most-specific matching prefix
  const match = Object.keys(ROUTE_PERMISSIONS)
    .filter(prefix => prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/'))
    .sort((a, b) => b.length - a.length)[0]

  if (!match) return true // no rule → allow (e.g. /api routes)
  return (ROUTE_PERMISSIONS[match] as readonly string[]).includes(role)
}
