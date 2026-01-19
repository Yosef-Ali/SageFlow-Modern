import Link from 'next/link'
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  FileText, 
  Calendar,
  ArrowRight
} from 'lucide-react'

const reports = [
  {
    title: 'Profit & Loss',
    description: 'Summary of revenues, costs, and expenses during a specific period.',
    href: '/dashboard/reports/profit-loss',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Balance Sheet',
    description: 'Statement of assets, liabilities, and capital at a specific point in time.',
    href: '/dashboard/reports/balance-sheet',
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'General Ledger',
    description: 'Complete record of all financial transactions across all accounts.',
    href: '/dashboard/reports/general-ledger',
    icon: FileText,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
  {
    title: 'Aged Receivables',
    description: 'Detailed report of customer invoices that are currently unpaid.',
    href: '/dashboard/reports/aged-receivables',
    icon: Calendar,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    comingSoon: true,
  },
  {
    title: 'Tax Report (VAT)',
    description: 'Summary of VAT collected on sales and VAT paid on purchases.',
    href: '/dashboard/reports/tax',
    icon: FileText,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    comingSoon: true,
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
        <p className="text-slate-600">Get insights into your business performance and financial health.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div 
            key={report.title}
            className={`group relative bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all ${
              report.comingSoon ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${report.bg}`}>
                <report.icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold text-slate-900">{report.title}</h3>
                  {report.comingSoon && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mb-4">{report.description}</p>
                
                {!report.comingSoon && (
                  <Link 
                    href={report.href}
                    className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 gap-1"
                  >
                    Generate Report <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
