import { headers } from 'next/headers'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Shield, Bell, Users, Building2, UserCircle } from 'lucide-react'
import { CompanySettingsForm } from '@/components/settings/company-settings-form'
import { NotificationPreferencesForm } from '@/components/settings/notification-preferences-form'
import { UsersTab } from '@/components/settings/users-tab'
import { RolesTab } from '@/components/settings/roles-tab'
import { AccountSettingsForm } from '@/components/settings/account-settings-form'
import { getCompanySettings } from '@/lib/actions/company-settings.actions'
import { getNotificationPrefs } from '@/lib/actions/notification-preferences.actions'
import { getUsers, getRoles } from '@/lib/actions/user-management.actions'
import { getPermissionsMap } from '@/lib/actions/permissions.actions'
import { getAccountProfile } from '@/lib/actions/account.actions'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const role = (await headers()).get('x-user-role') ?? ''
  const isAdmin = role === 'ADMIN'

  // Default tab: 'account' for all, keep requested tab if allowed
  const adminTabs = ['company', 'users', 'roles', 'notifications']
  const requestedTab = tab ?? 'account'
  const activeTab = (!isAdmin && adminTabs.includes(requestedTab)) ? 'account' : requestedTab

  const accountProfile = await getAccountProfile().catch(() => null)

  // Admin-only data — skip fetch for non-admin
  const [companySettings, notificationPrefs, users, roles, permissionsMap, currentAuthUser] =
    isAdmin
      ? await Promise.all([
          getCompanySettings().catch(() => null),
          getNotificationPrefs().catch(() => null),
          getUsers().catch(() => []),
          getRoles().catch(() => []),
          getPermissionsMap().catch(() => ({})),
          createClient().then(s => s.auth.getUser().then(r => r.data.user)),
        ])
      : [null, null, [], [], {}, null]

  return (
    <DashboardLayout titleKey="nav.settings">
      <div className="w-full">
        <Tabs defaultValue={activeTab}>
          <TabsList className="mb-6 h-auto flex-wrap gap-1">
            <TabsTrigger value="account" className="gap-1.5">
              <UserCircle className="w-3.5 h-3.5" />Tài khoản
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="company" className="gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />Công ty
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1.5">
                  <Users className="w-3.5 h-3.5" />Người dùng
                </TabsTrigger>
                <TabsTrigger value="roles" className="gap-1.5">
                  <Shield className="w-3.5 h-3.5" />Phân quyền
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-1.5">
                  <Bell className="w-3.5 h-3.5" />Thông báo
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Tài khoản — tất cả roles */}
          <TabsContent value="account">
            {accountProfile && <AccountSettingsForm profile={accountProfile} />}
          </TabsContent>

          {/* Các tab chỉ ADMIN thấy */}
          {isAdmin && (
            <>
              <TabsContent value="company">
                <Card>
                  <CardHeader>
                    <CardTitle>Thông tin công ty</CardTitle>
                    <CardDescription>Dùng trong phiếu đặt hàng (PO) và các tài liệu xuất ra.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompanySettingsForm initialData={companySettings} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <UsersTab
                  users={users}
                  roles={roles}
                  currentUserEmail={currentAuthUser?.email}
                />
              </TabsContent>

              <TabsContent value="roles">
                <RolesTab initialPermissions={
                  Object.fromEntries(
                    ['ADMIN', 'WAREHOUSE_STAFF', 'SALES_STAFF', 'ACCOUNTANT'].map(r => [
                      r,
                      Object.entries(permissionsMap)
                        .filter(([, roles]) => roles.includes(r))
                        .map(([route]) => route),
                    ])
                  )
                } />
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Cài đặt thông báo</CardTitle>
                    <CardDescription>Cấu hình khi nào và bằng cách nào bạn nhận cảnh báo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {notificationPrefs && (
                      <NotificationPreferencesForm initialPrefs={notificationPrefs} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
