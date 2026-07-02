import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Role } from '@/lib/auth/roles'

// Module-level cache — refreshed per cold start (fine for internal OMS)
let permissionsCache: Record<string, string[]> | null = null
let permissionsCacheTime = 0
const CACHE_TTL_MS = 60_000 // 1 minute

async function getPermissions(supabaseUrl: string, serviceRoleKey: string) {
  const now = Date.now()
  if (permissionsCache && now - permissionsCacheTime < CACHE_TTL_MS) {
    return permissionsCache
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/role_permissions?select=role_name,route`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) return null

  const rows: { role_name: string; route: string }[] = await res.json()
  const map: Record<string, string[]> = {}
  for (const row of rows) {
    if (!map[row.route]) map[row.route] = []
    map[row.route].push(row.role_name)
  }

  permissionsCache = map
  permissionsCacheTime = now
  return map
}

function canAccess(permissions: Record<string, string[]>, role: string, pathname: string): boolean {
  const match = Object.keys(permissions)
    .filter(prefix =>
      prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/')
    )
    .sort((a, b) => b.length - a.length)[0]

  if (!match) return true // no rule → allow (e.g. /api, /unauthorized)
  return permissions[match].includes(role)
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage        = pathname.startsWith('/login')
  const isApiRoute        = pathname.startsWith('/api')
  const isUnauthorizedPage = pathname === '/unauthorized'

  if (!user && !isAuthPage && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (user && !isApiRoute && !isAuthPage && !isUnauthorizedPage) {
    const role = (user.app_metadata?.role as Role) ?? null

    if (role) {
      const permissions = await getPermissions(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )

      if (permissions && !canAccess(permissions, role, pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }
    } else {
      // No role assigned yet → block everything except dashboard
      if (pathname !== '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-role', role ?? '')
    supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
    request.cookies.getAll().forEach(({ name, value }) => {
      supabaseResponse.cookies.set(name, value)
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
