import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Layers, MoreVertical, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardHeader } from '@/components/dashboard/header'
import { useAccounts, useDeleteAccount } from '@/hooks/use-accounts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState('')
  const [accountToDelete, setAccountToDelete] = useState<{ id: string, name: string } | null>(null)
  const { data: accounts, isLoading, error } = useAccounts({ search })
  const deleteAccount = useDeleteAccount()
  const { toast } = useToast()

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading accounts: {error.message}
      </div>
    )
  }

  // Filter accounts client-side if needed (hook might handle it server-side)
  const filteredAccounts = accounts?.filter(account => 
    account.account_name.toLowerCase().includes(search.toLowerCase()) ||
    account.account_number.includes(search)
  )

  const handleExport = () => {
     // Trigger export (this would likely connect to the export actions we updated earlier)
     // For now, redirect to settings/import-export or show toast
     toast({
       title: "Export Available",
       description: "Go to Settings > Import & Export to download these accounts."
     })
  }

  const handleDelete = async () => {
    if (!accountToDelete) return
    
    try {
      await deleteAccount.mutateAsync(accountToDelete.id)
      setAccountToDelete(null)
    } catch (err) {
      // Error handling is handled in the hook's onError
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Chart of Accounts"
        text="Manage your account structure and categories"
      >
        <div className="flex gap-2">
           <Button variant="outline" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link to="/dashboard/chart-of-accounts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </Link>
        </div>
      </DashboardHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search accounts..." 
          className="pl-10" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : filteredAccounts && filteredAccounts.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.account_number}</TableCell>
                  <TableCell>{account.account_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(account.balance))}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link to={`/dashboard/chart-of-accounts/${account.id}/edit`}>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={() => setAccountToDelete({ id: account.id, name: account.account_name })}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-md bg-slate-50/50 dark:bg-slate-900/50">
          <Layers className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No accounts found</p>
          <p className="text-slate-400 text-sm mt-1">Set up your chart of accounts to get started</p>
          <Link to="/dashboard/chart-of-accounts/new">
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </Link>
        </div>
      )}

      <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the account <strong>{accountToDelete?.name}</strong>. 
              It will no longer appear in your active Chart of Accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
