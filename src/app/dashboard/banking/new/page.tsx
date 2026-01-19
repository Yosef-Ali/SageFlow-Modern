import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BankAccountForm } from '@/components/banking/bank-account-form'

export default function NewBankAccountPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/banking">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Bank Account</h1>
          <p className="text-slate-500">Connect a new bank account</p>
        </div>
      </div>

      {/* Form */}
      <BankAccountForm />
    </div>
  )
}
