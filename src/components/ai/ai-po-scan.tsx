'use client'

import { useState, useRef } from 'react'
import { ScanText, Upload, Loader2, X, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { autoScanPurchaseOrder } from '@/lib/gemini-service'
import { useToast } from '@/components/ui/use-toast'

interface AIPOScanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanComplete?: (data: {
    vendorName?: string
    poNumber?: string
    date?: string
    expectedDate?: string
    items?: Array<{
      description: string
      quantity: number
      unitCost: number
      total: number
    }>
    subtotal?: number
    taxAmount?: number
    totalAmount?: number
    currency?: string
  }) => void
}

export function AIPOScan({ open, onOpenChange, onScanComplete }: AIPOScanProps) {
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
        const result = await autoScanPurchaseOrder(base64Data, file.type)

        if (result.success && result.data) {
          setScannedData(result.data)
          toast({
            title: 'Scan complete!',
            description: 'Purchase Order data extracted',
          })
        } else {
          toast({
            title: 'Scan failed',
            description: result.error || 'Could not extract PO data',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="h-5 w-5 text-purple-500" />
            AI Auto-Scan Quote / PO
          </DialogTitle>
          <DialogDescription>
            Upload a vendor quote, proforma invoice, or purchase request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedImage && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-purple-500/50 transition-colors cursor-pointer bg-muted/30"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Quote, Proforma (JPG, PNG)
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
                alt="Document preview"
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
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              <p className="text-sm font-medium">
                Scanning document...
              </p>
            </div>
          )}

          {scannedData && !isScanning && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Information Extracted!</p>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="col-span-2">
                   <p className="text-xs text-muted-foreground mb-1">Vendor Name</p>
                   <p className="font-medium">{scannedData.vendorName}</p>
                </div>
                <div>
                   <p className="text-xs text-muted-foreground mb-1">Date</p>
                   <p className="font-medium">{scannedData.date}</p>
                </div>
                <div>
                   <p className="text-xs text-muted-foreground mb-1">Subtotal</p>
                   <p className="font-mono">{scannedData.subtotal?.toFixed(2)}</p>
                </div>
                 <div>
                   <p className="text-xs text-muted-foreground mb-1">Tax</p>
                   <p className="font-mono">{scannedData.taxAmount?.toFixed(2)}</p>
                </div>
                 <div>
                   <p className="text-xs text-muted-foreground mb-1">Total</p>
                   <p className="font-bold text-emerald-600">{scannedData.currency || 'ETB'} {scannedData.totalAmount?.toFixed(2)}</p>
                </div>
              </div>

              {scannedData.items && scannedData.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Line Items Found ({scannedData.items.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                    {scannedData.items.map((item: any, i: number) => (
                      <div key={i} className="text-xs grid grid-cols-12 gap-2 pb-1 border-b last:border-0 border-dashed">
                        <div className="col-span-6 truncate font-medium">{item.description}</div>
                        <div className="col-span-2 text-right">{item.quantity} ×</div>
                        <div className="col-span-2 text-right">{item.unitCost}</div>
                        <div className="col-span-2 text-right font-mono">{item.total}</div>
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
                  className="bg-purple-600 hover:bg-purple-700"
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
