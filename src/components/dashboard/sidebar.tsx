'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Banknote,
  Receipt,
  Settings,
  LogOut,
  TrendingUp,
  BarChart3,
  ChevronDown,
  User,
  BookOpen,
  Building2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chart of Accounts', href: '/dashboard/chart-of-accounts', icon: BookOpen },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Building2 },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { name: 'Payments', href: '/dashboard/payments', icon: Receipt },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { name: 'Banking', href: '/dashboard/banking', icon: Banknote },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Employees', href: '/dashboard/employees', icon: Users },
]


export function DashboardSidebar() {
  const { data: session } = useSession()

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">SageFlow</h1>
            <p className="text-sidebar-foreground/60 text-xs font-medium">Modern Accounting</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sidebar-foreground/80"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* User Profile Section */}
      <div className="mt-auto p-6 border-t border-sidebar-border">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sidebar-foreground/80 mb-2"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors w-full text-left">
                <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {session.user.name || session.user.email}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {session.user.companyName}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full text-left text-sidebar-foreground/80"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign out</span>
          </button>
        )}
      </div>
    </aside>
  )
}
