'use client'

import { useState, useRef } from 'react'
import { Scan, Upload, Loader2, X, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { scanInvoiceImage } from '@/app/actions/ai-actions'
import { useToast } from '@/components/ui/use-toast'

interface AIAutoScanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanComplete?: (data: any) => void
}

export function AIAutoScan({ open, onOpenChange, onScanComplete }: AIAutoScanProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<any>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      })
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setSelectedImage(base64)

      // Extract base64 data without prefix
      const base64Data = base64.split(',')[1]
      const mimeType = file.type

      // Start scanning
      setIsScanning(true)
      try {
        const result = await scanInvoiceImage(base64Data, mimeType)

        if (result.success && result.data) {
          setScannedData(result.data)
          toast({
            title: 'Scan complete!',
            description: 'Invoice data extracted successfully',
          })
        } else {
          toast({
            title: 'Scan failed',
            description: result.error || 'Could not extract invoice data',
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
      // Create a new FileList with the dropped file
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      fileInputRef.current.files = dataTransfer.files

      // Trigger change event
      const event = new Event('change', { bubbles: true })
      fileInputRef.current.dispatchEvent(event)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-emerald-500" />
            AI Auto-Scan Invoice
          </DialogTitle>
          <DialogDescription>
            Upload an invoice or receipt image to automatically extract data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          {!selectedImage && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
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

          {/* Image Preview */}
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Invoice preview"
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

          {/* Scanning Status */}
          {isScanning && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <p className="text-sm font-medium">
                Scanning invoice...
              </p>
            </div>
          )}

          {/* Scanned Data */}
          {scannedData && !isScanning && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Scan Complete!</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                {scannedData.invoiceNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Invoice Number</p>
                    <p className="font-medium">{scannedData.invoiceNumber}</p>
                  </div>
                )}
                {scannedData.date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="font-medium">{scannedData.date}</p>
                  </div>
                )}
                {scannedData.customerName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Customer</p>
                    <p className="font-medium">{scannedData.customerName}</p>
                  </div>
                )}
                {scannedData.total && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="font-medium">
                      {scannedData.currency || 'ETB'} {scannedData.total.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {scannedData.items && scannedData.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Line Items</p>
                  <div className="space-y-2">
                    {scannedData.items.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <span>{item.description}</span>
                        <span className="font-medium">
                          {item.quantity} × {item.unitPrice} = {item.total}
                        </span>
                      </div>
                    ))}
                  </div>
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
