import { UserManagement } from '@/components/settings/UserManagement'

export default function UserManagementPage() {
  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Team Members</h2>
        <p className="text-muted-foreground">
          Manage your team members and their access levels within the company.
        </p>
      </div>
      <UserManagement />
    </div>
  )
}
