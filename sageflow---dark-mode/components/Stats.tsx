import React from 'react';
import { Stat } from '../types';

const stats: Stat[] = [
  { id: 1, value: "500+", label: "Businesses" },
  { id: 2, value: "ETB 1B+", label: "Processed" },
  { id: 3, value: "99.9%", label: "Uptime" },
  { id: 4, value: "24/7", label: "Support" },
];

const Stats: React.FC = () => {
  return (
    <section className="relative py-12 border-y border-[var(--color-border-primary)]">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/[0.02] to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, idx) => (
            <div 
              key={stat.id} 
              className="flex flex-col items-center justify-center text-center group"
            >
              <dt className="text-3xl md:text-4xl lg:text-5xl font-display font-bold 
                           text-[var(--color-text-primary)] mb-2
                           group-hover:text-emerald-500 transition-colors duration-300">
                {stat.value}
              </dt>
              <dd className="text-xs md:text-sm uppercase tracking-widest font-semibold 
                           text-[var(--color-text-muted)]">
                {stat.label}
              </dd>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
