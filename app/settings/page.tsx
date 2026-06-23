import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Shield, Bell, Users, Building2 } from 'lucide-react'

const MOCK_USERS = [
  { id: '1', name: 'Admin User',       email: 'admin@company.com',     role: 'ADMIN',           initials: 'AU', active: true },
  { id: '2', name: 'Warehouse Staff',  email: 'warehouse@company.com', role: 'WAREHOUSE_STAFF', initials: 'WS', active: true },
  { id: '3', name: 'Sales Staff',      email: 'sales@company.com',     role: 'SALES_STAFF',     initials: 'SS', active: true },
  { id: '4', name: 'John Nguyen',      email: 'john@company.com',      role: 'SALES_STAFF',     initials: 'JN', active: false },
]

const ROLE_PERMISSIONS = [
  { role: 'ADMIN',           label: 'Admin',           desc: 'Full access to all modules',                           color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { role: 'WAREHOUSE_STAFF', label: 'Warehouse Staff', desc: 'Products, Inventory, Purchase Orders',                 color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { role: 'SALES_STAFF',     label: 'Sales Staff',     desc: 'Dashboard, Orders (read only on inventory/settings)',  color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
]

export default function SettingsPage() {
  return (
    <DashboardLayout titleKey="nav.settings">
      <div className="max-w-4xl">
        <Tabs defaultValue="company">
          <TabsList className="mb-6 h-auto flex-wrap gap-1">
            <TabsTrigger value="company" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Company</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" />Users</TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Roles & Permissions</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-3.5 h-3.5" />Notifications</TabsTrigger>
          </TabsList>

          {/* Company Profile */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Manage your company information and branding.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Company Name</Label>
                    <Input defaultValue="My Retail Brand" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tax ID</Label>
                    <Input defaultValue="0123456789" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" defaultValue="info@myretail.vn" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input defaultValue="+84 28 1234 5678" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Address</Label>
                    <Input defaultValue="123 Nguyen Hue, Quan 1, TP.HCM" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Input defaultValue="VND" disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Input defaultValue="Asia/Ho_Chi_Minh" />
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage team members and their access.</CardDescription>
                </div>
                <Button size="sm">Invite User</Button>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wide font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wide font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wide font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_USERS.map(user => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">{user.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-muted-foreground">{user.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.active ? 'default' : 'secondary'} className="text-xs">
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles & Permissions */}
          <TabsContent value="roles">
            <div className="space-y-4">
              {ROLE_PERMISSIONS.map(role => (
                <Card key={role.role}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{role.label}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${role.color}`}>
                              {role.role}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{role.desc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { module: 'Dashboard',        admin: true, warehouse: true,  sales: true },
                        { module: 'Products',         admin: true, warehouse: true,  sales: false },
                        { module: 'Inventory',        admin: true, warehouse: true,  sales: false },
                        { module: 'Orders',           admin: true, warehouse: false, sales: true },
                        { module: 'Purchase Orders',  admin: true, warehouse: true,  sales: false },
                        { module: 'Integrations',     admin: true, warehouse: false, sales: false },
                        { module: 'Settings',         admin: true, warehouse: false, sales: false },
                      ].map(perm => {
                        const hasAccess = role.role === 'ADMIN' ? perm.admin :
                          role.role === 'WAREHOUSE_STAFF' ? perm.warehouse : perm.sales
                        return (
                          <div key={perm.module} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                            hasAccess ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            <span>{hasAccess ? '✓' : '✗'}</span>
                            <span>{perm.module}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure when and how you receive alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Low Stock Alerts',          desc: 'Notify when stock falls below reorder point', defaultChecked: true },
                  { label: 'Out of Stock Alerts',       desc: 'Notify when products reach zero inventory',   defaultChecked: true },
                  { label: 'New Order Received',        desc: 'Alert when a new order comes in',             defaultChecked: true },
                  { label: 'Order Status Changes',      desc: 'Notify on each order status transition',      defaultChecked: false },
                  { label: 'Purchase Order Approved',   desc: 'Alert when a PO is approved',                 defaultChecked: true },
                  { label: 'Purchase Order Received',   desc: 'Confirm when PO is marked as received',       defaultChecked: true },
                  { label: 'Channel Sync Errors',       desc: 'Alert when marketplace sync fails',           defaultChecked: true },
                  { label: 'Daily Summary Report',      desc: 'Send daily digest at 8:00 AM',                defaultChecked: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
