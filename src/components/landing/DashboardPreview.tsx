import React from 'react';
import { TrendingUp, Users, FileText, DollarSign, Bell, Search, MoreHorizontal } from 'lucide-react';

const DashboardPreview: React.FC = () => {
  return (
    <div className="relative rounded-2xl overflow-hidden 
                  shadow-2xl shadow-black/20 dark:shadow-black/40
                  bg-[var(--color-surface-primary)] 
                  border border-[var(--color-border-primary)]
                  aspect-[16/9] w-full max-w-5xl mx-auto 
                  transform transition-all duration-700 
                  hover:scale-[1.01] hover:shadow-emerald-500/10">
      
      {/* Browser Chrome */}
      <div className="bg-[var(--color-surface-secondary)] h-10 flex items-center px-4 
                    border-b border-[var(--color-border-primary)]">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-400/80 hover:bg-red-400 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-400 transition-colors" />
          <div className="w-3 h-3 rounded-full bg-green-400/80 hover:bg-green-400 transition-colors" />
        </div>
        <div className="flex-1 mx-4 max-w-sm">
          <div className="h-6 bg-[var(--color-surface-primary)] rounded-lg 
                        border border-[var(--color-border-secondary)]
                        flex items-center px-3">
            <span className="text-[10px] text-[var(--color-text-muted)]">
              app.sageflow.et/dashboard
            </span>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[var(--color-text-muted)]" />
      </div>

      {/* Dashboard Content */}
      <div className="flex h-[calc(100%-2.5rem)]">
        {/* Sidebar */}
        <div className="w-48 bg-[var(--color-surface-secondary)] border-r border-[var(--color-border-primary)] 
                      hidden sm:flex flex-col p-4">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-sm text-[var(--color-text-primary)]">SageFlow</span>
          </div>
          {['Dashboard', 'Invoices', 'Reports', 'Inventory', 'Settings'].map((item, i) => (
            <div key={item} 
                 className={`h-8 w-full rounded-lg mb-1 flex items-center px-3 text-xs
                   ${i === 0 
                     ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                     : 'text-[var(--color-text-muted)]'
                   }`}>
              {item}
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 bg-[var(--color-bg-primary)] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Dashboard</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Welcome back, Abebe</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-secondary)] 
                            border border-[var(--color-border-primary)]
                            flex items-center justify-center">
                <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-secondary)] 
                            border border-[var(--color-border-primary)]
                            flex items-center justify-center relative">
                <Bell className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { icon: DollarSign, label: 'Revenue', value: 'ETB 125.0K', change: '+12.5%', color: 'emerald' },
              { icon: Users, label: 'Customers', value: '45', change: '+5%', color: 'cyan' },
              { icon: FileText, label: 'Invoices', value: '28', change: null, color: 'violet' },
              { icon: DollarSign, label: 'Pending', value: 'ETB 5K', change: null, color: 'amber' },
            ].map((stat, i) => (
              <div key={i} className="bg-[var(--color-surface-secondary)] p-4 rounded-xl 
                                    border border-[var(--color-border-primary)]">
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-2 rounded-lg bg-${stat.color}-500/10`}>
                    <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                  </div>
                  {stat.change && (
                    <span className="text-emerald-400 text-[10px] flex items-center font-medium">
                      {stat.change}
                      <TrendingUp className="w-3 h-3 ml-0.5" />
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold text-[var(--color-text-primary)]">{stat.value}</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Chart Area */}
          <div className="bg-[var(--color-surface-secondary)] rounded-xl 
                        border border-[var(--color-border-primary)] p-4 h-32">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-medium text-[var(--color-text-primary)]">Revenue Overview</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Last 7 days</span>
            </div>
            <div className="flex items-end h-16 space-x-2">
              {[35, 55, 40, 70, 60, 85, 95].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full group cursor-pointer">
                  <div 
                    className="w-full bg-emerald-500/20 group-hover:bg-emerald-500/40 
                             transition-all duration-300 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ambient glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent 
                    pointer-events-none rounded-2xl" />
    </div>
  );
};

export default DashboardPreview;
