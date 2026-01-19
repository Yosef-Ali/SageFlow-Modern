'use client'

import { DashboardHeader } from '@/components/dashboard/header'
import { AccountForm } from '@/components/accounts/account-form'

export default function NewAccountPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardHeader
        heading="New Account"
        text="Add a new account to your chart of accounts."
      />
      <div className="grid gap-4">
        <AccountForm />
      </div>
    </div>
  )
}
