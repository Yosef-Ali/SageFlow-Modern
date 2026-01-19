'use client'

import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Database, User, CreditCard, Building } from 'lucide-react'

const settingsLinks = [
  {
    title: 'Profile',
    description: 'Manage your personal information and login credentials.',
    href: '/dashboard/settings/profile',
    icon: User,
  },
  {
    title: 'Company Settings',
    description: 'Update company details, address, and branding.',
    href: '/dashboard/settings/company',
    icon: Building,
  },
  {
    title: 'Import & Export',
    description: 'Backup your data or import from Peachtree/Sage.',
    href: '/dashboard/settings/import-export',
    icon: Database,
  },
  {
    title: 'Billing & Subscription',
    description: 'Manage your plan, payment methods, and invoices.',
    href: '/dashboard/settings/billing',
    icon: CreditCard,
  },
]

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <DashboardHeader
        heading="Settings"
        text="Manage your account preferences and system configurations."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <link.icon className="h-6 w-6 text-slate-600" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{link.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{link.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
