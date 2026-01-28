import React from 'react';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { PricingPlan } from './types';

const plans: PricingPlan[] = [
  {
    id: 1,
    name: "Standard",
    description: "For small businesses",
    price: "ETB 000",
    originalPrice: "ETB 1,999",
    features: [
      "2 Users",
      "Unlimited Invoices",
      "Basic Financial Reports",
      "Email Support",
      "Mobile App Access",
      "Inventory Management"
    ],
    cta: "Start Free Now",
    highlighted: false,
    badge: "BETA FREE"
  },
  {
    id: 2,
    name: "Premium",
    description: "For growing companies",
    price: "ETB 000",
    originalPrice: "ETB 3,999",
    features: [
      "5 Users",
      "Advanced Inventory (FIFO/LIFO)",
      "VAT & Withholding Automation",
      "AI Assistant & Auto-Scanning",
      "Priority Phone Support",
      "API Access"
    ],
    cta: "Claim Free Access",
    highlighted: true,
    badge: "LIMITED OFFER"
  },
  {
    id: 3,
    name: "Enterprise",
    description: "For large organizations",
    price: "Custom",
    features: [
      "Unlimited Users",
      "ERP Integrations",
      "Dedicated Account Manager",
      "Advanced AI & Custom Models",
      "Custom Training",
      "SLA Guarantee"
    ],
    cta: "Contact Sales",
    highlighted: false
  }
];

const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                    w-[60rem] h-[60rem] bg-emerald-500/5 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <span className="inline-block text-emerald-500 font-semibold text-sm uppercase tracking-widest mb-4">
            Pricing
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold 
                       text-[var(--color-text-primary)] mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-[var(--color-text-tertiary)] text-lg md:text-xl">
            Choose the plan that fits your business needs. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`relative rounded-2xl p-8 transition-all duration-500
                ${plan.highlighted 
                  ? 'bg-gradient-to-b from-[var(--color-surface-hover)] to-[var(--color-surface-primary)] border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/10 scale-[1.02] z-10' 
                  : 'card-elevated hover:border-[var(--color-border-accent)]'
                }`}
            >
              {/* Popular Badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 
                              bg-gradient-to-r from-emerald-500 to-emerald-400 
                              text-white px-5 py-1.5 rounded-full text-xs font-bold 
                              uppercase tracking-wider shadow-lg shadow-emerald-500/30
                              flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Most Popular</span>
                </div>
              )}

              {/* Plan Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {plan.description}
                  </p>
                </div>
                {plan.badge && (
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full
                    ${plan.highlighted 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                    {plan.badge}
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="font-display text-4xl font-bold text-[var(--color-text-primary)]">
                    {plan.price}
                  </span>
                  {plan.price !== "Custom" && (
                    <span className="text-[var(--color-text-muted)] ml-2">/mo</span>
                  )}
                </div>
                {plan.originalPrice && (
                  <span className="text-sm text-[var(--color-text-muted)] line-through mt-1 block">
                    {plan.originalPrice}
                  </span>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
                      ${plan.highlighted 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                      }`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-[var(--color-text-secondary)] text-sm">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button 
                onClick={() => window.location.href = '/register'}
                className={`group w-full py-3.5 rounded-xl font-semibold transition-all duration-300 
                              flex items-center justify-center space-x-2
                ${plan.highlighted 
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35' 
                  : 'bg-[var(--color-surface-hover)] hover:bg-emerald-500/10 text-[var(--color-text-primary)] border border-[var(--color-border-primary)] hover:border-emerald-500/30'
                }`}>
                <span>{plan.cta}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
