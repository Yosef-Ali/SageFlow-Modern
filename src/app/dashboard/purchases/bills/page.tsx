import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { BillTable } from '@/components/purchases/bill-table'
import { getBills } from '@/app/actions/purchase-actions'

export default async function BillsPage() {
  const { data, success } = await getBills()
  const bills = success && data ? data.bills : []

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Bills"
        text="Manage vendor bills and payments"
      >
        <Link href="/dashboard/purchases/bills/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Enter Bill
          </Button>
        </Link>
      </DashboardHeader>

      <BillTable bills={bills} />
    </div>
  )
}
