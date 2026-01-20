import { DashboardHeader } from '@/components/dashboard/header'
import { BankAccountList } from '@/components/banking/bank-account-list'
import { getBankAccounts } from '@/app/actions/banking-actions'

export default async function BankingPage() {
  const result = await getBankAccounts()
  const accounts = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <DashboardHeader 
        heading="Banking" 
        text="Manage bank accounts and transactions."
      />
      <BankAccountList accounts={accounts || []} />
    </div>
  )
}
