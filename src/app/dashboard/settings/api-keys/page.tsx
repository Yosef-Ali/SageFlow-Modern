import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardHeader } from '@/components/dashboard/header'
import { ApiKeysForm } from '@/components/settings/api-keys-form'

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        heading="API Keys"
        text="Manage your API keys for external services and integrations."
      >
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </DashboardHeader>

      {/* Form */}
      <ApiKeysForm />
    </div>
  )
}
