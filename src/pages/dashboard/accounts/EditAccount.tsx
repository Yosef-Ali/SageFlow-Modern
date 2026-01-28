import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountForm } from '@/components/accounts/account-form'
import { useAccount } from '@/hooks/use-accounts'

export default function EditAccountPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: account, isLoading, error } = useAccount(id || '')

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
        <p className="text-muted-foreground mb-6">{error?.message || "We couldn't find the account you're looking for."}</p>
        <Button onClick={() => navigate('/dashboard/chart-of-accounts')}>Back to Chart of Accounts</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Account</h1>
          <p className="text-muted-foreground mt-1">Update account: {account.accountName}</p>
        </div>
      </div>

      <AccountForm
        account={account}
        onSuccess={() => navigate('/dashboard/chart-of-accounts')}
      />
    </div>
  )
}
