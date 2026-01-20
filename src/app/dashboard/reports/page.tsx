import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, TrendingUp, Scale, AlertCircle } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/header'

const reports = [
  {
    title: 'Financial Statements',
    items: [
      {
        name: 'Balance Sheet',
        description: 'Assets, Liabilities, and Equity.',
        href: '/dashboard/reports/balance-sheet',
        icon: Scale
      },
      {
        name: 'Profit & Loss',
        description: 'Income statement showing revenue and expenses.',
        href: '/dashboard/reports/profit-loss',
        icon: TrendingUp
      },
      {
        name: 'Trial Balance',
        description: 'List of all account balances to ensure debits equal credits.',
        href: '/dashboard/reports/trial-balance',
        icon: FileText
      }
    ]
  },
  // Placeholders for future reports
  /*
  {
    title: 'Sales & Customers',
    items: [
      { name: 'Sales by Customer', description: 'Breakdown of sales per customer.', href: '#' },
      { name: 'A/R Aging', description: 'Unpaid invoices by age.', href: '#' },
    ]
  }
  */
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader 
        heading="Financial Reports" 
        text="View standard financial statements and reports."
      />
      
      <div className="grid gap-6">
        {reports.map((section, idx) => (
          <div key={idx} className="space-y-4">
             <h3 className="text-lg font-medium tracking-tight text-slate-900 border-b pb-2">
                 {section.title}
             </h3>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {section.items.map((report) => (
                     <Link href={report.href} key={report.name}>
                        <Card className="hover:border-blue-500 transition-all cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-semibold">
                                    {report.name}
                                </CardTitle>
                                <report.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    {report.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                     </Link>
                 ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}
