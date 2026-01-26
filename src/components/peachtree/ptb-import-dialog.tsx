'use client';

import { useState } from 'react';
import { useImportPtb } from '@/hooks/use-import-export';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function PtbImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { mutate: importPtb, isPending, data, isSuccess, error, isError, reset } = useImportPtb();

  const handleImport = () => {
    if (!file) return;
    importPtb(file);
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose();
      else setOpen(true);
    }}>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        Import from Peachtree
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span>የፔችትሪ መረጃ አስገባ</span>
            <span className="text-sm font-normal text-muted-foreground">
              Import from Peachtree Company File
            </span>
          </DialogTitle>
        </DialogHeader>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Failed</AlertTitle>
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        )}

        {!isSuccess ? (
          <div className="space-y-4 pt-4">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile?.name.endsWith('.ptb')) setFile(droppedFile);
              }}
            >
              <input
                type="file"
                accept=".ptb"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) setFile(selectedFile);
                }}
                className="hidden"
                id="ptb-file"
                disabled={isPending}
              />
              <label
                htmlFor="ptb-file"
                className="cursor-pointer group block"
              >
                <FileText className={`mx-auto h-12 w-12 transition-colors ${file ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="mt-2 text-sm font-medium">
                  {file ? file.name : 'Click or drag PTB file here'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Peachtree Backup File (.ptb)
                </p>
              </label>
            </div>

            {file && !isPending && (
              <div className="bg-secondary/50 p-3 rounded-md text-xs space-y-1">
                <p className="font-semibold text-secondary-foreground">File details:</p>
                <p className="text-muted-foreground truncate">{file.name}</p>
                <p className="text-muted-foreground">
                  Size: {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  እየገባ ነው... (Importing)
                </>
              ) : (
                'Start Import'
              )}
            </Button>

            <div className="text-[10px] text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> Customers (ደንበኞች)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> Vendors (አቅራቢዎች)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> Chart of Accounts
              </span>
              <span className="flex items-center gap-1 text-muted-foreground/50">
                ⌛ Operations (Soon)
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-6 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Import Successful!
              </h3>
              <p className="text-sm text-muted-foreground">
                Your Peachtree data has been successfully imported.
              </p>
            </div>

            <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customers:</span>
                <span className="font-medium">{data?.customers || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendors:</span>
                <span className="font-medium">{data?.vendors || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accounts:</span>
                <span className="font-medium">{data?.accounts || 0}</span>
              </div>
            </div>

            <Button
              onClick={handleClose}
              className="w-full"
              variant="outline"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
