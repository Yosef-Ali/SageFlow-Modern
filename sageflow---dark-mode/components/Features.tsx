import React from 'react';
import { BarChart3, Users, Receipt, Package, CreditCard, ShieldCheck, LucideIcon } from 'lucide-react';

interface Feature {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

const features: Feature[] = [
  {
    id: 1,
    title: "FS Report Generation",
    description: "Generate compliant Profit & Loss, Balance Sheet, and Cash Flow statements instantly.",
    icon: BarChart3
  },
  {
    id: 2,
    title: "Customer & Vendor Ledgers",
    description: "Track every transaction. Automated reconciliation and balance tracking for verified partners.",
    icon: Users
  },
  {
    id: 3,
    title: "VAT & Withholding Tax",
    description: "Auto-calculate VAT and withholding tax on every invoice. Export directly for tax filing.",
    icon: Receipt
  },
  {
    id: 4,
    title: "Inventory Tracking",
    description: "Multi-warehouse inventory management with FIFO/LIFO valuation methods.",
    icon: Package
  },
  {
    id: 5,
    title: "Payroll Management",
    description: "Manage employee salaries, pensions, and income tax calculations seamlessly.",
    icon: CreditCard
  },
  {
    id: 6,
    title: "Multi-User Access",
    description: "Granular permissions for Accountants, Managers, and Auditors. Secure audit trails.",
    icon: ShieldCheck
  }
];

const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-[30rem] h-[30rem] 
                    bg-emerald-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <span className="inline-block text-emerald-500 font-semibold text-sm uppercase tracking-widest mb-4">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold 
                       text-[var(--color-text-primary)] mb-6 leading-tight">
            Everything you need to{' '}
            <span className="gradient-text">run your business</span>
          </h2>
          <p className="text-[var(--color-text-tertiary)] text-lg md:text-xl leading-relaxed">
            Built specifically for the Ethiopian market, fully compliant with ERCA regulations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, idx) => (
            <div 
              key={feature.id} 
              className="group relative card-elevated p-8 
                       hover:border-[var(--color-border-accent)]
                       transition-all duration-500"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-2xl 
                            bg-gradient-to-br from-emerald-500/10 to-emerald-600/5
                            border border-emerald-500/20
                            flex items-center justify-center mb-6
                            group-hover:from-emerald-500/20 group-hover:to-emerald-600/10
                            group-hover:border-emerald-500/30
                            group-hover:shadow-lg group-hover:shadow-emerald-500/10
                            transition-all duration-500">
                <feature.icon className="w-7 h-7 text-emerald-400 
                                       group-hover:text-emerald-300 transition-colors" />
              </div>
              
              {/* Content */}
              <h3 className="font-display text-xl font-bold text-[var(--color-text-primary)] mb-3
                           group-hover:text-emerald-400 transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-[var(--color-text-tertiary)] leading-relaxed">
                {feature.description}
              </p>
              
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br 
                            from-emerald-500/0 to-emerald-500/0 
                            group-hover:from-emerald-500/[0.02] group-hover:to-emerald-600/[0.02]
                            transition-all duration-500 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
