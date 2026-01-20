import { BankAccountList } from '@/components/banking/bank-account-list'
import { getBankAccounts } from '@/app/actions/banking-actions'

export default async function BankingPage() {
  const result = await getBankAccounts()
  const accounts = result.success ? result.data : []

  return (
    <BankAccountList accounts={accounts || []} />
  )
}
