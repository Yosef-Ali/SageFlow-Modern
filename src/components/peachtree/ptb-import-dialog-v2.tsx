import { useState } from 'react';
import { useImportPtb } from '@/hooks/use-import-export';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileWarning, 
  RefreshCw,
  Lock,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type ImportState = 'idle' | 'uploading' | 'success' | 'empty' | 'error';

export function PtbImportDialogV2() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { mutate: importPtb, isPending, data, isSuccess, error, isError, reset } = useImportPtb();

  // Determine current state
  const getState = (): ImportState => {
    if (isPending) return 'uploading';
    if (isError) return 'error';
    if (isSuccess) {
      const total = (data?.customers || 0) + (data?.vendors || 0) + (data?.accounts || 0);
      return total === 0 ? 'empty' : 'success';
    }
    return 'idle';
  };

  const state = getState();

  const handleImport = () => {
    if (!file) return;
    importPtb(file);
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    reset();
  };

  const handleTryAgain = () => {
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
            <span className="text-lg">የፔችትሪ መረጃ አስገባ</span>
            <span className="text-sm font-normal text-muted-foreground">
              Import from Peachtree Company File
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Error State */}
        {state === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Failed</AlertTitle>
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        )}

        {/* IDLE STATE: File Selection */}
        {state === 'idle' && (
          <div className="space-y-4 pt-2">
            {/* File Drop Zone */}
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
                file 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile?.name.toLowerCase().endsWith('.ptb')) setFile(droppedFile);
              }}
            >
              <input
                type="file"
                accept=".ptb,.PTB"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) setFile(selectedFile);
                }}
                className="hidden"
                id="ptb-file-v2"
              />
              <label htmlFor="ptb-file-v2" className="cursor-pointer block">
                <Database className={cn(
                  "mx-auto h-10 w-10 transition-colors",
                  file ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="mt-3 text-sm font-medium">
                  {file ? file.name : 'Click or drop PTB file here'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Peachtree Backup (.ptb) • Max 50MB
                </p>
              </label>
            </div>

            {/* File Info */}
            {file && (
              <div className="bg-muted/50 p-3 rounded-md text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File:</span>
                  <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            )}

            {/* Import Button */}
            <Button onClick={handleImport} disabled={!file} className="w-full">
              Start Import
            </Button>

            {/* What gets imported */}
            <div className="text-[10px] text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> ደንበኞች (Customers)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> አቅራቢዎች (Vendors)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" /> Chart of Accounts
              </span>
              <span className="flex items-center gap-1 text-muted-foreground/50">
                ⏳ Transactions (Soon)
              </span>
            </div>
          </div>
        )}

        {/* UPLOADING STATE */}
        {state === 'uploading' && (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium">እየገባ ነው... (Importing)</p>
            <p className="text-xs text-muted-foreground mt-1">Extracting data from {file?.name}</p>
          </div>
        )}

        {/* EMPTY STATE: No Records Found */}
        {state === 'empty' && (
          <div className="space-y-4 pt-2">
            {/* Header */}
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-3">
                <FileWarning className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold">ምንም መረጃ አልተገኘም</h3>
              <p className="text-sm text-muted-foreground">No Records Found</p>
            </div>

            {/* Why this happens */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs space-y-2">
              <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Common reasons:
              </p>
              <ul className="text-amber-700 dark:text-amber-400 space-y-1 ml-5">
                <li>• File is encrypted (Peachtree Complete)</li>
                <li>• Old Peachtree version with legacy format</li>
                <li>• File is corrupted or incomplete</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={handleTryAgain}
                variant="outline"
                className="w-full justify-start h-auto py-3"
              >
                <RefreshCw className="h-5 w-5 mr-3 text-blue-600 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">Try Different File</p>
                  <p className="text-xs text-muted-foreground">Select another .ptb backup</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={handleClose}
              >
                <FileSpreadsheet className="h-5 w-5 mr-3 text-emerald-600 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">Use CSV Instead</p>
                  <p className="text-xs text-muted-foreground">Export from Peachtree → File → Export</p>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3"
                onClick={handleClose}
              >
                <FileText className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">Enter Manually</p>
                  <p className="text-xs text-muted-foreground">Add customers & vendors in SageFlow</p>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {state === 'success' && (
          <div className="space-y-4 pt-2">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold">Import Successful!</h3>
              <p className="text-sm text-muted-foreground">በተሳካ ሁኔታ ገብቷል</p>
            </div>

            {/* Imported counts */}
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 space-y-2">
              {(data?.customers || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ደንበኞች (Customers):</span>
                  <span className="font-semibold text-green-600">{data?.customers}</span>
                </div>
              )}
              {(data?.vendors || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">አቅራቢዎች (Vendors):</span>
                  <span className="font-semibold text-green-600">{data?.vendors}</span>
                </div>
              )}
              {(data?.accounts || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Accounts:</span>
                  <span className="font-semibold text-green-600">{data?.accounts}</span>
                </div>
              )}
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
