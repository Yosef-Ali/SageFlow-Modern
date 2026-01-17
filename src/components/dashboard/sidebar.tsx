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
  User
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
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: Receipt },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Banking', href: '/banking', icon: Banknote },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

export function DashboardSidebar() {
  const { data: session } = useSession()

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">SageFlow</h1>
            <p className="text-slate-400 text-xs">Modern Accounting</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* User Profile Section */}
      <div className="mt-auto p-6 border-t border-slate-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white mb-2"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors w-full text-left">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {session.user.name || session.user.email}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {session.user.companyName}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{session.user.name}</p>
                  <p className="text-xs text-slate-500">{session.user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-red-600 focus:text-red-600"
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors w-full text-left text-slate-300 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </aside>
  )
}
