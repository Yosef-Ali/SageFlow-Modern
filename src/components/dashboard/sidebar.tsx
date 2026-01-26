import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
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
  ChevronRight,
  User,
  BookOpen,
  Building2,
  History,
  ScrollText,
  ShoppingCart,
  Hammer,
  ClipboardEdit,
  Wallet,
  Calculator,
  type LucideIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ModeToggle } from '@/components/mode-toggle'
import { cn } from '@/lib/utils'

// Navigation item type
type NavItem = {
  name: string
  href?: string
  icon: LucideIcon
  children?: { name: string; href: string }[]
}

// Peachtree-style grouped navigation
const navigation: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Customers & Sales', 
    icon: Users,
    children: [
      { name: 'Customers', href: '/dashboard/customers' },
      { name: 'Invoices', href: '/dashboard/invoices' },
      { name: 'Quotes (Proforma)', href: '/dashboard/invoices/quotes' },
      { name: 'Payments Received', href: '/dashboard/payments' },
      { name: 'Credit Memos', href: '/dashboard/invoices/credit-memos' },
    ]
  },
  { 
    name: 'Vendors & Purchases', 
    icon: Building2,
    children: [
      { name: 'Vendors', href: '/dashboard/vendors' },
      { name: 'Purchase Orders', href: '/dashboard/purchases/orders' },
      { name: 'Bills', href: '/dashboard/purchases/bills' },
      { name: 'Pay Bills', href: '/dashboard/purchases/pay-bills' },
      { name: 'Credit Memos', href: '/dashboard/purchases/vendor-credits' },
    ]
  },
  { 
    name: 'Banking', 
    icon: Banknote,
    children: [
      { name: 'Bank Accounts', href: '/dashboard/banking' },
    ]
  },
  { 
    name: 'Inventory', 
    icon: Package,
    children: [
      { name: 'Items & Services', href: '/dashboard/inventory' },
      { name: 'Assemblies', href: '/dashboard/inventory/assemblies' },
      { name: 'Stock Count/Adjustments', href: '/dashboard/inventory/adjustments' },
    ]
  },
  { 
    name: 'Fixed Assets', 
    icon: Calculator, // Using Calculator as placeholder for Fixed Assets
    children: [
        { name: 'Assets', href: '/dashboard/assets' },
    ]
  },
  { 
    name: 'General Ledger', 
    icon: BookOpen,
    children: [
      { name: 'Chart of Accounts', href: '/dashboard/chart-of-accounts' },
      { name: 'Journal Entries', href: '/dashboard/journals' },
    ]
  },
  { 
    name: 'Payroll', 
    icon: Wallet,
    children: [
      { name: 'Employees', href: '/dashboard/employees' },
    ]
  },
  { 
    name: 'Reports', 
    href: '/dashboard/reports', 
    icon: BarChart3 
  },
  { 
    name: 'Settings', 
    icon: Settings,
    children: [
      { name: 'System Config', href: '/dashboard/settings' },
      { name: 'Tax Rules', href: '/dashboard/settings/taxes' },
      { name: 'Audit Trail', href: '/dashboard/audit-trail' },
    ]
  },
]

// Collapsible Section Component
function NavSection({ item, expanded, onToggle, pathname }: { 
  item: NavItem
  expanded: boolean
  onToggle: () => void 
  pathname: string
}) {
  // Check if any child is active
  const isChildActive = item.children?.some(child => pathname.startsWith(child.href)) || false

  return (
    <div>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-colors text-left",
          isChildActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground" 
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon className="w-5 h-5" />
          <span className="font-medium text-sm">{item.name}</span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
        ) : (
          <ChevronRight className="w-4 h-4 text-sidebar-foreground/60" />
        )}
      </button>

      {/* Children */}
      {expanded && item.children && (
        <div className="mt-1 ml-4 pl-4 border-l border-sidebar-border/50 space-y-0.5">
          {item.children.map((child) => (
            <Link
              key={child.href}
              to={child.href}
              className={cn(
                "flex items-center py-2 px-3 rounded-lg text-sm transition-colors",
                pathname === child.href || pathname.startsWith(child.href + '/')
                  ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
              )}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function DashboardSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }
  
  // Expanded sections state (persisted in localStorage)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  
  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded')
    if (saved) {
      setExpandedSections(JSON.parse(saved))
    } else {
      // Default: expand sections with active children
      const defaultExpanded: Record<string, boolean> = {}
      navigation.forEach(item => {
        if (item.children?.some(child => pathname.startsWith(child.href))) {
          defaultExpanded[item.name] = true
        }
      })
      setExpandedSections(defaultExpanded)
    }
  }, [pathname])
  
  // Save to localStorage on change
  const toggleSection = (name: string) => {
    setExpandedSections(prev => {
      const updated = { ...prev, [name]: !prev[name] }
      localStorage.setItem('sidebar-expanded', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border h-screen overflow-hidden">
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Logo */}
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between mb-6 px-2">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">SageFlow</h1>
              <p className="text-sidebar-foreground/60 text-xs">Modern Accounting</p>
            </div>
          </Link>
          <ModeToggle />
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigation.map((item) => (
            item.children ? (
              <NavSection 
                key={item.name} 
                item={item} 
                expanded={expandedSections[item.name] || false}
                onToggle={() => toggleSection(item.name)}
                pathname={pathname}
              />
            ) : (
                <Link
                key={item.name}
                to={item.href!}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            )
          ))}
        </nav>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-sidebar-border">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors w-full text-left">
                <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user.companyName}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!user && (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full text-left text-sidebar-foreground/80"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign out</span>
          </button>
        )}
      </div>
    </aside>
  )
}
