import { CompanyProfileForm } from '@/components/settings/CompanyProfileForm'

export default function CompanySettingsPage() {
  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Company Settings</h2>
        <p className="text-muted-foreground">
          Update your company profile and information. These details will appear on your invoices and reports.
        </p>
      </div>
      <CompanyProfileForm />
    </div>
  )
}
