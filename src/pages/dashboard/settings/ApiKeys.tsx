
import { ApiKeysForm } from '@/components/settings/api-keys-form'
import { DashboardHeader } from '@/components/dashboard/header'

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="API Keys"
        text="Manage your API keys for third-party integrations."
      />
      <ApiKeysForm />
    </div>
  )
}
