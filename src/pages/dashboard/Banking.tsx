import { BankAccountList } from '@/components/banking/bank-account-list'

export default function BankingPage() {
  // In Vite SPA, we use client-side data fetching via hooks
  // The BankAccountList component should handle its own data fetching
  return <BankAccountList accounts={[]} />
}
