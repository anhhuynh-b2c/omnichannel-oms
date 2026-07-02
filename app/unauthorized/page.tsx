import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Không có quyền truy cập</h1>
      <p className="text-muted-foreground max-w-sm">
        Tài khoản của bạn không có quyền vào trang này. Liên hệ admin nếu cần được cấp quyền.
      </p>
      <Button asChild>
        <Link href="/">Về trang chủ</Link>
      </Button>
    </div>
  )
}
