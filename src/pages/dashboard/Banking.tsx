'use client'

import { useBankAccounts } from '@/hooks/use-banking'
import { BankAccountList } from '@/components/banking/bank-account-list'
import { Loader2 } from 'lucide-react'

export default function BankingPage() {
  const { data: accounts, isLoading, error } = useBankAccounts()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 text-destructive">
        Failed to load bank accounts
      </div>
    )
  }

  return <BankAccountList accounts={accounts || []} />
}
