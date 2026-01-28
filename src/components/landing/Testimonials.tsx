import React from 'react';
import { Star, Quote } from 'lucide-react';
import { Testimonial } from './types';

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote: "SageFlow changed how we manage our VAT filing. It used to take days, now it takes minutes.",
    author: "Abebe Kebede",
    role: "General Manager",
    company: "Horizon Trading",
    initial: "A"
  },
  {
    id: 2,
    quote: "The inventory tracking is a lifesaver for our multi-branch retail stores. Highly recommended!",
    author: "Sara Tadesse",
    role: "Finance Director",
    company: "Blue Nile Coffee",
    initial: "S"
  },
  {
    id: 3,
    quote: "Finally, software that understands the local tax context and peachtree workflows.",
    author: "Dawit Samuel",
    role: "Senior Accountant",
    company: "Tech Solutions PLC",
    initial: "D"
  }
];

const avatarColors = [
  'from-emerald-500/20 to-emerald-600/20 text-emerald-400',
  'from-cyan-500/20 to-blue-600/20 text-cyan-400',
  'from-violet-500/20 to-purple-600/20 text-violet-400',
];

const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--color-surface-secondary)]" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border-primary)] to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border-primary)] to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block text-emerald-500 font-semibold text-sm uppercase tracking-widest mb-4">
            Testimonials
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold 
                       text-[var(--color-text-primary)] mb-6">
            Trusted by <span className="gradient-text">Ethiopian Businesses</span>
          </h2>
          <p className="text-[var(--color-text-tertiary)] text-lg md:text-xl max-w-2xl mx-auto">
            Join hundreds of companies that trust SageFlow for their financial operations.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, idx) => (
            <div 
              key={testimonial.id} 
              className="group relative card-elevated p-8 
                       hover:border-[var(--color-border-accent)]
                       transition-all duration-500"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6">
                <Quote className="w-10 h-10 text-[var(--color-border-primary)] 
                                group-hover:text-emerald-500/30 transition-colors" />
              </div>
              
              {/* Stars */}
              <div className="flex space-x-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              
              {/* Quote Text */}
              <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed mb-8 italic">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColors[idx]} 
                              flex items-center justify-center text-lg font-bold
                              border border-white/10`}>
                  {testimonial.initial}
                </div>
                <div>
                  <h4 className="font-display font-semibold text-[var(--color-text-primary)]">
                    {testimonial.author}
                  </h4>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
