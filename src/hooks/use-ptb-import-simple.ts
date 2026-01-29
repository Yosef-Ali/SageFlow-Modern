import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importPtbFile, type ImportResult } from '@/lib/peachtree/ptb-import-service'
import { useToast } from '@/components/ui/use-toast'

/**
 * Hook to import from PTB file
 * Uses client-side parsing with Supabase insert
 */
export function useImportPtbSimple() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      return await importPtbFile(file)
    },
    onSuccess: (data) => {
      const total = (data?.customers || 0) + (data?.vendors || 0) + (data?.accounts || 0)
      
      // Refresh data in cache
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
      
      if (total > 0) {
        toast({
          title: 'Import Successful',
          description: `Imported ${data?.customers || 0} customers, ${data?.vendors || 0} vendors, ${data?.accounts || 0} accounts`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
