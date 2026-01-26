import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Loader2, DollarSign, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useBankAccount, useDeleteBankAccount } from '@/hooks/use-banking'

export default function BankAccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: account, isLoading, error } = useBankAccount(id || '')
  const deleteAccount = useDeleteBankAccount()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    if (!id) return
    await deleteAccount.mutateAsync(id)
    navigate('/dashboard/banking')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Account Not Found</h2>
        <p className="text-muted-foreground mb-6">{error?.message || "We couldn't find this bank account."}</p>
        <Button onClick={() => navigate('/dashboard/banking')}>Back to Banking</Button>
      </div>
    )
  }

  const accData = account as any
  const formatCurrency = (amount: any) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: accData.currency || 'ETB' }).format(Number(amount) || 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/banking')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{accData.account_name}</h1>
              <Badge variant={accData.is_active !== false ? 'default' : 'secondary'}>
                {accData.is_active !== false ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {accData.account_number && (
              <p className="text-muted-foreground mt-1">Account #: {accData.account_number}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/dashboard/banking/${id}/reconcile`)}>
            <TrendingUp className="w-4 w-4 mr-2" />
            Reconcile
          </Button>
          <Button variant="outline" onClick={() => navigate(`/dashboard/banking/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accData.current_balance)}</div>
            <p className="text-xs text-muted-foreground">As of today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
            <DollarSign className="h-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accData.opening_balance)}</div>
            <p className="text-xs text-muted-foreground">Initial balance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Account Type</p>
            <p className="font-medium">{accData.account_type?.replace('_', ' ')}</p>
          </div>
          {accData.bank_name && (
            <div>
              <p className="text-sm text-muted-foreground">Bank Name</p>
              <p className="font-medium">{accData.bank_name}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="font-medium">{accData.currency}</p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accData.account_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteAccount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
