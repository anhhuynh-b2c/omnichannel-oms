import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

interface DashboardLayoutProps {
  children: React.ReactNode
  /** i18n key like "nav.dashboard" — translated in Topbar */
  titleKey?: string
  /** Static string fallback (not translated) */
  title?: string
}

export function DashboardLayout({ children, titleKey, title }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar titleKey={titleKey} title={title} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
