'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, X, CheckCircle, Receipt } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { scanPaymentImage } from '@/app/actions/ai-actions'
import { useToast } from '@/components/ui/use-toast'

interface AIPaymentScanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanComplete?: (data: any) => void
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
        description: 'Please select an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setSelectedImage(base64)

      const base64Data = base64.split(',')[1]
      const mimeType = file.type

      setIsScanning(true)
      try {
        const result = await scanPaymentImage(base64Data, mimeType)

        if (result.success && result.data) {
          setScannedData(result.data)
          toast({
            title: 'Scan complete!',
            description: 'Payment data extracted successfully',
          })
        } else {
          toast({
            title: 'Scan failed',
            description: result.error || 'Could not extract payment data',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to process image',
          variant: 'destructive',
        })
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

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      chapa: 'Chapa (Mobile Money)',
      check: 'Check',
      credit_card: 'Credit Card',
    }
    return methodMap[method] || method
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[85vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            AI Auto-Scan Payment Receipt
          </DialogTitle>
          <DialogDescription>
            Upload a payment receipt or bank transfer confirmation to automatically extract data
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Upload Area */}
          {!selectedImage && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-muted rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-foreground mb-1">
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

          {/* Image Preview */}
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Receipt preview"
                className="w-full max-h-[300px] object-contain rounded-lg border border-slate-200"
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

          {/* Scanning Status */}
          {isScanning && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                Scanning payment receipt...
              </p>
            </div>
          )}

          {/* Scanned Data */}
          {scannedData && !isScanning && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Scan Complete!</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                {scannedData.amount && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="font-medium text-lg">
                      {scannedData.currency || 'ETB'} {scannedData.amount.toLocaleString()}
                    </p>
                  </div>
                )}
                {scannedData.paymentDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payment Date</p>
                    <p className="font-medium">{scannedData.paymentDate}</p>
                  </div>
                )}
                {scannedData.paymentMethod && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                    <p className="font-medium">{getPaymentMethodLabel(scannedData.paymentMethod)}</p>
                  </div>
                )}
                {scannedData.customerName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Customer/Payer</p>
                    <p className="font-medium">{scannedData.customerName}</p>
                  </div>
                )}
                {scannedData.reference && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Reference</p>
                    <p className="font-medium">{scannedData.reference}</p>
                  </div>
                )}
                {scannedData.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="font-medium">{scannedData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fixed footer with buttons - always visible */}
        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {scannedData && (
            <Button
              onClick={handleUseData}
            >
              Use This Data
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
