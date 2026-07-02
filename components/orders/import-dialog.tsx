'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ImportResult {
  ok: boolean
  imported: number
  updated: number
  skipped_duplicate: number
  skipped_sku: string[]
  error?: string
}

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = 'select' | 'uploading' | 'result'

export function ImportDialog({ open, onClose, onSuccess }: ImportDialogProps) {
  const [step, setStep] = useState<Step>('select')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('select')
    setFile(null)
    setResult(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Chỉ hỗ trợ file Excel (.xlsx / .xls)')
      return
    }
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setStep('uploading')

    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/import/shopee', { method: 'POST', body: fd })
      const data: ImportResult = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Lỗi không xác định')

      setResult(data)
      setStep('result')

      if (data.imported > 0 || data.updated > 0) onSuccess()
    } catch (e) {
      toast.error((e as Error).message)
      setStep('select')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/channels/shopee.svg" className="w-5 h-5" onError={e => (e.currentTarget.style.display = 'none')} />
            Import đơn hàng Shopee
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tải file báo cáo đơn hàng từ Shopee Seller Center → Đơn hàng của tôi → Xuất file.
            </p>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              } ${file ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-10 w-10 text-green-600" />
                  <p className="font-medium text-sm text-green-700 dark:text-green-400">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Kéo thả hoặc bấm để chọn file</p>
                  <p className="text-xs text-muted-foreground">Hỗ trợ .xlsx · .xls</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Huỷ</Button>
              <Button onClick={handleUpload} disabled={!file}>
                Import đơn hàng
              </Button>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Đang xử lý file...</p>
              <p className="text-sm text-muted-foreground mt-1">Đang đọc và import đơn hàng vào hệ thống</p>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-semibold text-green-700 dark:text-green-400">{result.imported}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Đã import</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">{result.updated}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500">Cập nhật TT</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg border border-border">
                <XCircle className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-2xl font-semibold">{result.skipped_duplicate}</p>
                <p className="text-xs text-muted-foreground">Bỏ qua (trùng)</p>
              </div>
            </div>

            {result.skipped_sku.length > 0 && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    {result.skipped_sku.length} đơn bị bỏ qua do SKU không tồn tại
                  </p>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.skipped_sku.map((msg, i) => (
                    <p key={i} className="text-xs text-yellow-700 dark:text-yellow-500 font-mono">{msg}</p>
                  ))}
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                  Vui lòng thêm các SKU này vào ERP rồi import lại.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Import thêm file</Button>
              <Button onClick={handleClose}>Xong</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
