import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AuditLogsContent } from '@/components/audit-logs/audit-logs-content'

export default function AuditLogsPage() {
  return (
    <DashboardLayout titleKey="nav.auditLogs">
      <AuditLogsContent />
    </DashboardLayout>
  )
}
