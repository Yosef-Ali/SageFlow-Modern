import { Link } from 'react-router-dom'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, TrendingUp, PieChart, BarChart3 } from 'lucide-react'

const reportLinks = [
  {
    title: 'Profit & Loss',
    description: 'View income, expenses, and net profit over a period.',
    href: '/dashboard/reports/profit-loss',
    icon: TrendingUp,
  },
  {
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity snapshot.',
    href: '/dashboard/reports/balance-sheet',
    icon: PieChart,
  },
  {
    title: 'Trial Balance',
    description: 'List of all account balances for verification.',
    href: '/dashboard/reports/trial-balance',
    icon: BarChart3,
  },
  {
    title: 'General Ledger',
    description: 'Detailed transaction history by account.',
    href: '/dashboard/reports/general-ledger',
    icon: FileText,
  },
]

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-6">
      <DashboardHeader
        heading="Reports"
        text="Financial reports and business analytics"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {reportLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="p-2 bg-muted rounded-lg">
                  <link.icon className="h-6 w-6 text-muted-foreground" />
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
