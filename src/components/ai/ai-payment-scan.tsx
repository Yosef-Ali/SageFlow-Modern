'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, X, CheckCircle, Receipt } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { autoScanPayment } from '@/lib/gemini-service'
import { useToast } from '@/components/ui/use-toast'

interface AIPaymentScanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanComplete?: (data: {
    amount?: number
    paymentDate?: string
    paymentMethod?: string
    customerName?: string
    reference?: string
    notes?: string
  }) => void
}

export function AIPaymentScan({ open, onOpenChange, onScanComplete }: AIPaymentScanProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<any>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setSelectedImage(base64)
      const base64Data = base64.split(',')[1]

      setIsScanning(true)
      try {
        const result = await autoScanPayment(base64Data, file.type)
        if (result.success && result.data) {
          setScannedData(result.data)
          toast({ title: 'Scan complete!', description: 'Payment data extracted' })
        } else {
          toast({ title: 'Scan failed', description: result.error || 'Could not extract data', variant: 'destructive' })
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to process image', variant: 'destructive' })
      } finally {
        setIsScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleUseData = () => {
    if (scannedData && onScanComplete) {
      onScanComplete(scannedData)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedImage(null)
    setScannedData(null)
    setIsScanning(false)
    onOpenChange(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      fileInputRef.current.files = dataTransfer.files
      const event = new Event('change', { bubbles: true })
      fileInputRef.current.dispatchEvent(event)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-500" />
            AI Scan Payment Receipt
          </DialogTitle>
          <DialogDescription>
            Upload receipt or bank slip to auto-fill payment details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedImage && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-emerald-500/50 transition-colors cursor-pointer bg-muted/30"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or PDF (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Receipt preview"
                className="w-full rounded-lg border border-slate-200"
              />
              {!isScanning && !scannedData && (
                <Button
                  onClick={() => {
                    setSelectedImage(null)
                    setScannedData(null)
                  }}
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {isScanning && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <p className="text-sm font-medium">
                Scanning receipt...
              </p>
            </div>
          )}

          {scannedData && !isScanning && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Scan Complete!</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                {scannedData.amount && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="font-medium">
                      {scannedData.currency || 'ETB'} {scannedData.amount.toLocaleString()}
                    </p>
                  </div>
                )}
                {scannedData.paymentDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="font-medium">{scannedData.paymentDate}</p>
                  </div>
                )}
                {scannedData.paymentMethod && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Method</p>
                    <p className="font-medium capitalize">{scannedData.paymentMethod.replace('_', ' ')}</p>
                  </div>
                )}
                {scannedData.reference && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reference</p>
                    <p className="font-medium truncate">{scannedData.reference}</p>
                  </div>
                )}
              </div>

              {scannedData.customerName && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-100 dark:border-blue-900/50">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Extracted Customer Name</p>
                  <p className="text-sm">{scannedData.customerName}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUseData}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  Use This Data
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
