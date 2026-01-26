import { Link } from 'react-router-dom'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ShoppingCart } from 'lucide-react'

const purchaseLinks = [
  {
    title: 'Purchase Orders',
    description: 'Create and manage purchase orders to vendors.',
    href: '/dashboard/purchases/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Bills',
    description: 'Track vendor bills and payables.',
    href: '/dashboard/purchases/bills',
    icon: FileText,
  },
]

export default function PurchasesPage() {
  return (
    <div className="flex-1 space-y-6">
      <DashboardHeader
        heading="Purchases"
        text="Manage purchase orders and vendor bills"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {purchaseLinks.map((link) => (
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
