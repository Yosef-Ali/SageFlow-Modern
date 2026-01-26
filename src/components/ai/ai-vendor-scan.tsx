'use client'

import { useState, useRef } from 'react'
import { Scan, Upload, Loader2, X, CheckCircle, Store } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { autoScanVendor } from '@/lib/gemini-service'
import { useToast } from '@/components/ui/use-toast'

interface AIVendorScanProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanComplete?: (data: {
    name?: string
    taxId?: string
    email?: string
    phone?: string
    address?: string
    contactName?: string
    website?: string
  }) => void
}

export function AIVendorScan({ open, onOpenChange, onScanComplete }: AIVendorScanProps) {
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
        description: 'Please select an image file (JPG, PNG)',
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
        const result = await autoScanVendor(base64Data, file.type)

        if (result.success && result.data) {
          setScannedData(result.data)
          toast({
            title: 'Scan complete!',
            description: 'Vendor details extracted successfully',
          })
        } else {
          toast({
            title: 'Scan failed',
            description: result.error || 'Could not extract vendor data',
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-500" />
            AI Auto-Scan Vendor
          </DialogTitle>
          <DialogDescription>
            Upload a business card, letterhead, or invoice to auto-fill vendor details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedImage && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-blue-500/50 transition-colors cursor-pointer bg-muted/30"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Business Card, Invoice Header (JPG, PNG)
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
                alt="Source preview"
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
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <p className="text-sm font-medium">
                Extracting vendor info...
              </p>
            </div>
          )}

          {scannedData && !isScanning && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">Information Extracted!</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                {scannedData.name && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Company Name</p>
                    <p className="font-bold text-lg">{scannedData.name}</p>
                  </div>
                )}
                {scannedData.taxId && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tax ID / TIN</p>
                    <p className="font-medium">{scannedData.taxId}</p>
                  </div>
                )}
                {scannedData.contactName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Contact Person</p>
                    <p className="font-medium">{scannedData.contactName}</p>
                  </div>
                )}
                {scannedData.email && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="font-medium">{scannedData.email}</p>
                  </div>
                )}
                {scannedData.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium">{scannedData.phone}</p>
                  </div>
                )}
                {scannedData.address && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Address</p>
                    <p className="font-medium">{scannedData.address}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUseData}
                  className="bg-blue-600 hover:bg-blue-700"
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
