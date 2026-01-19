'use client'

import { useParams } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/header'
import { AccountForm } from '@/components/accounts/account-form'
import { useAccount } from '@/hooks/use-accounts'
import { Loader2 } from 'lucide-react'

export default function EditAccountPage() {
  const params = useParams()
  const id = params.id as string
  const { data: account, isLoading } = useAccount(id)

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Account not found.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardHeader
        heading="Edit Account"
        text={`Update account ${account.accountNumber} - ${account.accountName}`}
      />
      <div className="grid gap-4">
        <AccountForm account={account} />
      </div>
    </div>
  )
}
