import { useState } from 'react';
import { useImportCSV } from '@/hooks/use-csv-import';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  Loader2, 
  AlertTriangle,
  Users,
  Building2,
  Calculator,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CSVImportType } from '@/lib/peachtree/csv-import-service';

type ImportState = 'select-type' | 'select-file' | 'uploading' | 'success' | 'error';

const DATA_TYPES = [
  { 
    id: 'customers' as CSVImportType, 
    label: 'Customers', 
    labelAm: 'ደንበኞች',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  { 
    id: 'vendors' as CSVImportType, 
    label: 'Vendors', 
    labelAm: 'አቅራቢዎች',
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  { 
    id: 'accounts' as CSVImportType, 
    label: 'Chart of Accounts', 
    labelAm: 'የሂሳብ ዝርዝር',
    icon: Calculator,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  { 
    id: 'auto' as CSVImportType, 
    label: 'Auto Detect', 
    labelAm: 'በራስ ሰር',
    icon: Sparkles,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
];

export function CsvImportDialog() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CSVImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const { mutate: importCSV, isPending, data, isSuccess, error, isError, reset } = useImportCSV();

  // Determine current state
  const getState = (): ImportState => {
    if (isPending) return 'uploading';
    if (isError) return 'error';
    if (isSuccess) return data?.success ? 'success' : 'error';
    if (selectedType && !file) return 'select-file';
    return 'select-type';
  };

  const state = getState();

  const handleImport = () => {
    if (!file || !selectedType) return;
    importCSV({ file, type: selectedType });
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setFile(null);
      setSelectedType(null);
      reset();
    }, 200);
  };

  const handleReset = () => {
    setFile(null);
    setSelectedType(null);
    reset();
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile && (
      selectedFile.name.toLowerCase().endsWith('.csv') ||
      selectedFile.name.toLowerCase().endsWith('.txt')
    )) {
      setFile(selectedFile);
    }
  };

  const selectedTypeData = DATA_TYPES.find(t => t.id === selectedType);

  return (
    <>
      {/* Trigger Button */}
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <FileSpreadsheet className="h-4 w-4" />
        Import CSV
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(val) => val ? setOpen(true) : handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="block text-lg">CSV ፋይል አስገባ</span>
              <span className="block text-sm font-normal text-muted-foreground mt-1">
                Import from CSV file
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* ========== SELECT TYPE STATE ========== */}
          {state === 'select-type' && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">What are you importing?</p>
              
              <div className="grid grid-cols-2 gap-2">
                {DATA_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                      "hover:border-primary/50 hover:bg-muted/30",
                      selectedType === type.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className={cn("p-2 rounded-full mb-2", type.bg)}>
                      <type.icon className={cn("h-5 w-5", type.color)} />
                    </div>
                    <span className="text-sm font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.labelAm}</span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Export from Peachtree: File → Export → select data type
              </p>
            </div>
          )}

          {/* ========== SELECT FILE STATE ========== */}
          {state === 'select-file' && (
            <div className="space-y-4 pt-2">
              {/* Selected type indicator */}
              {selectedTypeData && (
                <div className={cn("flex items-center gap-2 p-2 rounded-lg", selectedTypeData.bg)}>
                  <selectedTypeData.icon className={cn("h-4 w-4", selectedTypeData.color)} />
                  <span className="text-sm font-medium">{selectedTypeData.label}</span>
                  <button 
                    onClick={() => setSelectedType(null)}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* File Drop Zone */}
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
                  dragOver && "border-primary bg-primary/10",
                  file && !dragOver && "border-primary bg-primary/5",
                  !file && !dragOver && "border-muted-foreground/25 hover:border-primary/50"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileSelect(e.dataTransfer.files[0]);
                }}
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-file-input"
                />
                
                <FileSpreadsheet className={cn(
                  "mx-auto h-10 w-10 transition-colors",
                  file ? "text-primary" : "text-muted-foreground"
                )} />
                
                <p className="mt-3 text-sm font-medium">
                  {file ? file.name : 'Click or drop CSV file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  .csv or .txt files
                </p>
              </div>

              {/* File Info */}
              {file && (
                <div className="bg-muted/50 p-3 rounded-md text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                <Button onClick={() => setSelectedType(null)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleImport} disabled={!file} className="flex-1">
                  Import
                </Button>
              </div>
            </div>
          )}

          {/* ========== UPLOADING STATE ========== */}
          {state === 'uploading' && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-sm font-medium">Importing...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Processing {file?.name}
              </p>
            </div>
          )}

          {/* ========== ERROR STATE ========== */}
          {state === 'error' && (
            <div className="space-y-4 pt-2">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 mb-3">
                  <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold">Import Failed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {data?.error || error?.message || 'Unknown error'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={handleClose} variant="ghost" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* ========== SUCCESS STATE ========== */}
          {state === 'success' && data?.success && (
            <div className="space-y-4 pt-2">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                  <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold">Import Successful!</h3>
                <p className="text-sm text-muted-foreground mt-1">በተሳካ ሁኔታ ገብቷል</p>
              </div>

              {/* Count */}
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{data.imported}</p>
                <p className="text-sm text-muted-foreground">
                  {data.type === 'customers' && 'customers imported'}
                  {data.type === 'vendors' && 'vendors imported'}
                  {data.type === 'accounts' && 'accounts imported'}
                  {data.type === 'auto' && 'records imported'}
                </p>
              </div>

              {/* Samples */}
              {data.samples && data.samples.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Samples:</p>
                  {data.samples.slice(0, 3).map((name, i) => (
                    <p key={i} className="truncate">• {name}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Import More
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
