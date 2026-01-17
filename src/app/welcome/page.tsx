import Link from 'next/link'
import { ArrowRight, BarChart3, FileText, Users, Package } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-slate-900 mb-4">
            SageFlow
          </h1>
          <p className="text-2xl text-slate-600 mb-8">
            Modern Accounting for Ethiopian Businesses
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/dashboard" 
              className="px-8 py-4 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/login" 
              className="px-8 py-4 border-2 border-slate-900 text-slate-900 rounded-lg font-medium hover:bg-slate-900 hover:text-white transition-colors"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <feature.icon className="w-12 h-12 text-slate-900 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

const features = [
  {
    icon: BarChart3,
    title: 'Real-time Dashboard',
    description: 'Track your business finances with interactive charts and KPIs'
  },
  {
    icon: FileText,
    title: 'Invoice Management',
    description: 'Create professional invoices in Amharic and English'
  },
  {
    icon: Users,
    title: 'Customer & Vendor',
    description: 'Manage relationships and track payments efficiently'
  },
  {
    icon: Package,
    title: 'Inventory Tracking',
    description: 'Monitor stock levels with real-time alerts'
  },
]
