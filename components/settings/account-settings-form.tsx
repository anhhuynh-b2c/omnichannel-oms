'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { updateAccountName, updateAccountPassword } from '@/lib/actions/account.actions'
import type { AccountProfile } from '@/lib/actions/account.actions'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  WAREHOUSE_STAFF: 'Nhân viên kho',
  SALES_STAFF: 'Nhân viên bán hàng',
  ACCOUNTANT: 'Kế toán',
}

export function AccountSettingsForm({ profile }: { profile: AccountProfile }) {
  const [name, setName] = useState(profile.name)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSaveName() {
    setNameLoading(true)
    setNameMsg(null)
    try {
      await updateAccountName(name)
      setNameMsg({ ok: true, text: 'Đã cập nhật tên thành công' })
    } catch (e: any) {
      setNameMsg({ ok: false, text: e.message })
    } finally {
      setNameLoading(false)
    }
  }

  async function handleChangePassword() {
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: 'Mật khẩu xác nhận không khớp' })
      return
    }
    setPwdLoading(true)
    setPwdMsg(null)
    try {
      await updateAccountPassword(currentPwd, newPwd)
      setPwdMsg({ ok: true, text: 'Đã đổi mật khẩu thành công' })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (e: any) {
      setPwdMsg({ ok: false, text: e.message })
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
          <CardDescription>Tên hiển thị sẽ xuất hiện trên các đơn hàng và phiếu mua hàng bạn tạo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile.email} disabled className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label>Vai trò</Label>
            <Input value={ROLE_LABELS[profile.role_name] ?? profile.role_name} disabled className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Họ và tên</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nhập họ và tên..."
            />
          </div>
          {nameMsg && (
            <p className={`text-sm ${nameMsg.ok ? 'text-green-600' : 'text-destructive'}`}>
              {nameMsg.text}
            </p>
          )}
          <Button onClick={handleSaveName} disabled={nameLoading || !name.trim()}>
            {nameLoading ? 'Đang lưu...' : 'Lưu tên'}
          </Button>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
          <CardDescription>Mật khẩu mới phải có ít nhất 8 ký tự.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pwd">Mật khẩu hiện tại</Label>
            <Input
              id="current-pwd"
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">Mật khẩu mới</Label>
            <Input
              id="new-pwd"
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {pwdMsg && (
            <p className={`text-sm ${pwdMsg.ok ? 'text-green-600' : 'text-destructive'}`}>
              {pwdMsg.text}
            </p>
          )}
          <Button
            onClick={handleChangePassword}
            disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
          >
            {pwdLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
