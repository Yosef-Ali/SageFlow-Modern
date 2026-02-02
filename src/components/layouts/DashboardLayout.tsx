import { ReactNode, useMemo } from 'react'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { ChevronRight, Building2, Bell, Search, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  // Generate breadcrumbs from pathname
  const breadcrumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    return parts.map((part, index) => {
      const href = `/${parts.slice(0, index + 1).join('/')}`
      let name = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
      
      // Special naming for breadcrumbs
      if (name === 'Dashboard') name = 'Home'
      
      return { name, href, isLast: index === parts.length - 1 }
    })
  }, [pathname])

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Fixed width */}
      <DashboardSidebar />

      {/* Main Content Area - Flexible with its own scrollbar */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Contextual Header - Sticky at the top */}
        <header 
          className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 lg:px-8 z-30 shrink-0 shadow-sm"
          style={{ WebkitBackdropFilter: 'blur(8px)' }}
        >
          <div className="flex items-center gap-4 min-w-0">
            {/* Company Badge - Highlights the business context */}
            <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <Building2 className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-70 leading-none mb-1">Company</span>
                <span className="text-xs font-extrabold truncate max-w-[200px] leading-tight">
                  {user?.companyName || 'SageFlow Modern'}
                </span>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-border/60 hidden lg:block" />

            {/* Breadcrumbs - Navigation context */}
            <nav className="flex items-center gap-2 text-[13px] text-muted-foreground/80 overflow-hidden font-medium">
              {breadcrumbs.map((crumb, i) => (
                <div key={crumb.href} className="flex items-center gap-2 shrink-0">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-30 shrink-0" />}
                  {crumb.isLast ? (
                    <span className="font-bold text-foreground truncate max-w-[180px]">
                      {crumb.name}
                    </span>
                  ) : (
                    <Link 
                      to={crumb.href} 
                      className="hover:text-emerald-600 transition-colors hidden sm:inline whitespace-nowrap"
                    >
                      {crumb.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Quick Actions & User Context */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center bg-muted/40 rounded-full pl-3 pr-1 py-1 border focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs w-24 focus:w-40 transition-all px-2 py-0.5"
              />
            </div>
            
            <button className="relative flex items-center justify-center h-10 w-10 rounded-full hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-all group">
              <Bell className="w-5 h-5 group-hover:shake transition-transform" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-background border border-background shadow-glow" />
            </button>
            
            <div className="flex items-center gap-3 pl-2 border-l border-border/60">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-bold leading-none">{user?.name || 'User'}</span>
                <span className="text-[10px] text-muted-foreground font-medium mt-1">{user?.role || 'Administrator'}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground shadow-elegant ring-2 ring-emerald-500/20">
                <UserIcon className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content - Independent Scroll */}
        <main
          className="flex-1 overflow-auto custom-scrollbar"
          style={{ backgroundColor: 'var(--main-content-bg, #f5f5f3)' }}
        >
          <div className="p-6 lg:p-10 xl:p-12 w-full animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Assistant - Floating Chatbot */}
      <AIAssistant />
    </div>
  )
}
