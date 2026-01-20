import { notFound } from 'next/navigation'
import { getBankAccount, getUnclearedTransactions } from '@/app/actions/banking-actions'
import { ReconciliationFlow } from '@/components/banking/reconciliation-flow'
import { DashboardHeader } from '@/components/dashboard/header'

export default async function ReconcilePage({ params }: { params: { id: string } }) {
  const accountRes = await getBankAccount(params.id)
  if (!accountRes.success || !accountRes.data) return notFound()

  const txsRes = await getUnclearedTransactions(params.id)
  const unclearedTxs = txsRes.success ? txsRes.data : []
  
  return (
    <div className="space-y-6">
       <DashboardHeader 
        heading={`Reconcile: ${accountRes.data.name}`}
        text="Match your statement to your records."
      />
      
      <ReconciliationFlow 
        accountId={accountRes.data.id}
        accountName={accountRes.data.name}
        currentBalance={Number(accountRes.data.currentBalance)}
        unclearedTransactions={unclearedTxs}
      />
    </div>
  )
}
