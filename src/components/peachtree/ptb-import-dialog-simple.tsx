import { useState } from 'react';
import { parsePtbFile, type PtbParseResult } from '@/lib/peachtree/ptb-parser';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle, 
  Loader2, 
  AlertTriangle,
  Users,
  Building2,
  Calculator,
  Database,
  FileUp,
  ArrowRight,
  Package,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';

type Step = 'select' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

export function PtbImportDialogSimple() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [parseResult, setParseResult] = useState<PtbParseResult | null>(null);
  const [importedCounts, setImportedCounts] = useState({ customers: 0, vendors: 0, accounts: 0, inventory: 0, transactions: 0, employees: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Restored hook call for permission fix

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setStep('parsing');
    setErrorMsg('');

    try {
      const result = await parsePtbFile(selectedFile);
      setParseResult(result);
      
      const total = result.customers.length + result.vendors.length + result.accounts.length + 
                    result.journalEntries.length + result.employees.length;
      if (total === 0) {
        setErrorMsg('No readable data found. The file may be encrypted or in an unsupported format.');
        setStep('error');
      } else {
        setStep('preview');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file');
      setStep('error');
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;
    
    setStep('importing');
    
    try {
      // Get company ID from authenticated session
      const companyId = user?.companyId;
      
      if (!companyId) {
        throw new Error('No company info found for current user');
      }
      
      console.log('[PTB Import] Using authenticated company ID:', companyId);
      console.log('[PTB Import] Sending data to database via RPC (Transaction)...');

      // Call Supabase RPC function (Transactional Upsert)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('import_ptb_v1', {
        p_company_id: companyId,
        p_data: parseResult
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Database transaction failed');
      }

      const result = rpcResult as any; // Cast returned JSONB

      if (!result.success) {
        throw new Error(result.error || 'Import reported failure');
      }

      setImportedCounts({
        customers: result.counts.customers || 0,
        vendors: result.counts.vendors || 0,
        accounts: result.counts.accounts || 0,
        transactions: result.counts.transactions || 0,
        employees: result.counts.employees || 0,
        inventory: result.counts.inventory || 0,
      });
      setStep('done');

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });

      const totalImported = 
        (result.counts.customers || 0) + 
        (result.counts.vendors || 0) + 
        (result.counts.accounts || 0) + 
        (result.counts.transactions || 0) + 
        (result.counts.employees || 0);
      
      if (totalImported > 0) {
        toast({
          title: 'Import Successful',
          description: `Imported ${result.counts.customers} customers, ${result.counts.vendors} vendors, ${result.counts.accounts} accounts`,
        });
      } else {
        toast({
          variant: 'default',
          title: 'Import Complete',
          description: 'No new records were needed (all duplicates found/updated).',
        });
      }

    } catch (err: any) {
      console.error('[PTB Import] Error:', err);
      setErrorMsg(err.message || 'Import failed');
      setStep('error');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setFile(null);
      setStep('select');
      setParseResult(null);
      setErrorMsg('');
    }, 200);
  };

  const handleReset = () => {
    setFile(null);
    setStep('select');
    setParseResult(null);
    setErrorMsg('');
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <Database className="h-4 w-4" />
        Import PTB
      </Button>

      <Dialog open={open} onOpenChange={(val) => val ? setOpen(true) : handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              <span>Peachtree Import</span>
            </DialogTitle>
          </DialogHeader>

          {/* STEP 1: SELECT FILE */}
          {step === 'select' && (
            <div className="space-y-4">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                  dragOver ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-muted-foreground/25 hover:border-emerald-400"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f?.name.toLowerCase().endsWith('.ptb')) handleFileSelect(f);
                }}
                onClick={() => document.getElementById('ptb-file-input')?.click()}
              >
                <input
                  type="file"
                  accept=".ptb"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                  id="ptb-file-input"
                />
                <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="font-medium">Drop .ptb file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
            </div>
          )}

          {/* STEP 2: PARSING */}
          {step === 'parsing' && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
              <p className="mt-4 font-medium">Reading file...</p>
              <p className="text-sm text-muted-foreground">{file?.name}</p>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Data Type</th>
                      <th className="text-right px-4 py-2 font-medium">Found</th>
                      <th className="text-left px-4 py-2 font-medium">Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Customers</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("font-bold", parseResult.customers.length > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          {parseResult.customers.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">
                        {parseResult.customers.slice(0, 2).map(c => c.name).join(', ') || '-'}
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">Vendors</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("font-bold", parseResult.vendors.length > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          {parseResult.vendors.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">
                        {parseResult.vendors.slice(0, 2).map(v => v.name).join(', ') || '-'}
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-amber-600" />
                          <span className="font-medium">Accounts</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("font-bold", parseResult.accounts.length > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                          {parseResult.accounts.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">
                        {parseResult.accounts.slice(0, 2).map(a => a.accountName).join(', ') || '-'}
                      </td>
                    </tr>
                    {parseResult.inventoryItems && parseResult.inventoryItems.length > 0 && (
                      <tr className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-cyan-600" />
                            <span className="font-medium">Inventory</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-emerald-600">
                            {parseResult.inventoryItems.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">
                          {parseResult.inventoryItems.slice(0, 2).map(i => i.itemName).join(', ') || '-'}
                        </td>
                      </tr>
                    )}
                    {parseResult.journalEntries && parseResult.journalEntries.length > 0 && (
                      <tr className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-600" />
                            <span className="font-medium">Transactions</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-emerald-600">
                            {parseResult.journalEntries.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">
                          {parseResult.journalEntries.slice(0, 3).map(j => j.entryId).join(', ') || '-'}
                        </td>
                      </tr>
                    )}
                    {parseResult.employees && parseResult.employees.length > 0 && (
                      <tr className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-pink-600" />
                            <span className="font-medium">Employees</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-emerald-600">
                            {parseResult.employees.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">
                          {parseResult.employees.slice(0, 2).map(e => e.name).join(', ') || '-'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-emerald-50 dark:bg-emerald-950/30">
                    <tr>
                      <td className="px-4 py-2 font-semibold">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-600">
                        {parseResult.customers.length + parseResult.vendors.length + parseResult.accounts.length + (parseResult.inventoryItems?.length || 0) + (parseResult.journalEntries?.length || 0) + (parseResult.employees?.length || 0)}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">records to import</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Source: {file?.name}
              </p>

              {/* Show detected files */}
              {parseResult.fileInfo.foundDataFiles.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-3 text-xs">
                  <span className="font-medium">Files Detected inside ZIP:</span>{' '}
                  <span className="text-muted-foreground">
                    {parseResult.fileInfo.foundDataFiles.join(', ')}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleImport} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
                  Import Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORTING */}
          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
              <p className="mt-4 font-medium">Importing to database...</p>
            </div>
          )}

          {/* STEP 5: DONE */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold">Import Complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">በተሳካ ሁኔታ ገብቷል</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                  <p className="text-2xl font-bold text-blue-600">{importedCounts.customers}</p>
                  <p className="text-xs text-muted-foreground">Customers</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
                  <Building2 className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                  <p className="text-2xl font-bold text-purple-600">{importedCounts.vendors}</p>
                  <p className="text-xs text-muted-foreground">Vendors</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                  <Calculator className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                  <p className="text-2xl font-bold text-amber-600">{importedCounts.accounts}</p>
                  <p className="text-xs text-muted-foreground">Accounts</p>
                </div>
              </div>
              
              {(importedCounts.transactions > 0 || importedCounts.employees > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {importedCounts.transactions > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-lg p-3 text-center">
                      <FileText className="h-5 w-5 mx-auto text-indigo-600 mb-1" />
                      <p className="text-xl font-bold text-indigo-600">{importedCounts.transactions}</p>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                    </div>
                  )}
                  {importedCounts.employees > 0 && (
                    <div className="bg-pink-50 dark:bg-pink-950/30 rounded-lg p-3 text-center">
                      <Users className="h-5 w-5 mx-auto text-pink-600 mb-1" />
                      <p className="text-xl font-bold text-pink-600">{importedCounts.employees}</p>
                      <p className="text-xs text-muted-foreground">Employees</p>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}

          {/* ERROR STATE */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 mb-3">
                  <AlertTriangle className="h-7 w-7 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Unable to Read File</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  {errorMsg}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Try Another File
                </Button>
                <Button variant="ghost" onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
