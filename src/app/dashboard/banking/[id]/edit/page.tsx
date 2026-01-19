'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BankAccountForm } from '@/components/banking/bank-account-form'
import { useBankAccount } from '@/hooks/use-banking'

interface EditBankAccountPageProps {
  params: { id: string }
}

export default function EditBankAccountPage({ params }: EditBankAccountPageProps) {
  const { id } = params
  const { data: account, isLoading, error } = useBankAccount(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Account not found</p>
          <Link href="/dashboard/banking">
            <Button variant="outline">Back to Banking</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/banking/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Account</h1>
          <p className="text-slate-500">Update {account.accountName}</p>
        </div>
      </div>

      {/* Form */}
      <BankAccountForm account={account} />
    </div>
  )
}
