import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Sparkles, Zap, Shield, Clock, TrendingUp } from 'lucide-react';
import DashboardPreview from './DashboardPreview';
import { useTheme } from '@/components/providers/theme-provider';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  
  return (
    <section className="relative pt-32 pb-32 overflow-hidden">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary gradient orb */}
        <div className="hero-gradient-orb hero-gradient-orb-1" />
        {/* Secondary gradient orb */}
        <div className="hero-gradient-orb hero-gradient-orb-2" />
        {/* Tertiary gradient orb */}
        <div className="hero-gradient-orb hero-gradient-orb-3" />
        
        {/* Aurora effect for dark mode */}
        {resolvedTheme === 'dark' && (
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[50vh] 
                       opacity-30 pointer-events-none"
            style={{
              background: 'conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(52, 211, 153, 0.08) 60deg, transparent 120deg, rgba(6, 182, 212, 0.05) 180deg, transparent 240deg, rgba(52, 211, 153, 0.06) 300deg, transparent 360deg)',
              filter: 'blur(60px)',
              animation: 'aurora 20s linear infinite',
            }}
          />
        )}
      </div>

      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 grid-pattern opacity-40 dark:opacity-25"
        style={{ 
          maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 100%)'
        }}
      />

      {/* Hero Gradient Overlay */}
      <div 
        className="absolute inset-0" 
        style={{ background: 'var(--gradient-hero)' }}
      />
      <div 
        className="absolute inset-0" 
        style={{ background: 'var(--gradient-hero-secondary)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-24">
          {/* Premium Announcement Badge */}
          <div 
            className="inline-flex items-center gap-2.5 
                      bg-[var(--color-surface-primary)]/90 backdrop-blur-xl
                      border border-[var(--color-border-accent)]
                      rounded-full px-5 py-2.5 mb-12
                      shadow-xl shadow-emerald-500/10
                      animate-fade-in-up
                      hover:shadow-emerald-500/20 hover:border-emerald-500/40
                      hover:scale-[1.02]
                      transition-all duration-400 cursor-default
                      group"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">New</span>
              {' '}Version 2.0 Released
            </span>
            <Sparkles className="w-4 h-4 text-emerald-500 group-hover:rotate-12 transition-transform duration-300" />
          </div>
          
          {/* Main Headline */}
          <h1 
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold 
                     text-[var(--color-text-primary)] tracking-tight mb-8 leading-[1.08]
                     animate-fade-in-up" 
            style={{ animationDelay: '100ms' }}
          >
            Modern Accounting for
            <span className="block mt-4">
              <span className="gradient-text">Ethiopian Businesses</span>
            </span>
          </h1>

          {/* Subheadline */}
          <p 
            className="text-lg md:text-xl lg:text-2xl text-[var(--color-text-tertiary)] mb-14 
                      leading-relaxed max-w-2xl mx-auto font-medium
                      animate-fade-in-up" 
            style={{ animationDelay: '200ms' }}
          >
            Streamline your finances, manage inventory, and stay compliant with tax regulations.
            <span className="text-[var(--color-text-secondary)] block mt-2">
              The all-in-one platform designed for growth.
            </span>
          </p>
          
          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5
                      animate-fade-in-up" 
            style={{ animationDelay: '300ms' }}
          >
            <button 
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-base transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              onClick={() => navigate('/register')}
            >
              <Zap className="w-5 h-5" />
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button 
              className="group w-full sm:w-auto 
                       bg-[var(--color-surface-primary)]/90 backdrop-blur-xl
                       border border-[var(--color-border-primary)]
                       hover:border-[var(--color-border-accent)]
                       text-[var(--color-text-primary)] px-8 py-4.5 rounded-2xl 
                       font-bold text-base transition-all duration-400
                       hover:bg-[var(--color-surface-hover)]
                       hover:shadow-xl hover:shadow-emerald-500/10
                       hover:-translate-y-1 active:translate-y-0
                       flex items-center justify-center gap-3.5"
            >
              <div 
                className="w-11 h-11 rounded-xl 
                          bg-emerald-500/10 dark:bg-emerald-500/15
                          flex items-center justify-center
                          group-hover:bg-emerald-500/20 
                          group-hover:scale-110
                          transition-all duration-300
                          border border-emerald-500/20 group-hover:border-emerald-500/30"
              >
                <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500/40 ml-0.5" />
              </div>
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div 
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-14 
                      text-[var(--color-text-muted)] text-sm font-medium
                      animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            <span className="flex items-center gap-2.5 hover:text-[var(--color-text-tertiary)] transition-colors">
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Shield className="w-3 h-3 text-emerald-500" />
              </div>
              <span>ERCA Compliant</span>
            </span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-[var(--color-border-primary)]" />
            <span className="flex items-center gap-2.5 hover:text-[var(--color-text-tertiary)] transition-colors">
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span>Bank-grade Security</span>
            </span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-[var(--color-border-primary)]" />
            <span className="flex items-center gap-2.5 hover:text-[var(--color-text-tertiary)] transition-colors">
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Clock className="w-3 h-3 text-emerald-500" />
              </div>
              <span>Setup in 5 minutes</span>
            </span>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div 
          className="relative mx-auto mt-20 animate-scale-in" 
          style={{ animationDelay: '500ms' }}
        >
          {/* Floating metric cards */}
          <div className="absolute -left-6 lg:-left-10 top-[20%] w-24 h-24 rounded-2xl 
                        bg-[var(--color-surface-primary)]/95 backdrop-blur-xl
                        border border-[var(--color-border-primary)]
                        shadow-2xl shadow-black/10 dark:shadow-black/30
                        flex items-center justify-center
                        animate-float hidden lg:flex
                        hover:border-[var(--color-border-accent)] hover:shadow-emerald-500/10
                        transition-all duration-400">
            <div className="text-center">
              <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-emerald-500 font-bold text-xl">+12%</div>
              <div className="text-[var(--color-text-muted)] text-xs font-medium">Revenue</div>
            </div>
          </div>
          
          <div className="absolute -right-6 lg:-right-10 top-[30%] w-24 h-24 rounded-2xl 
                        bg-[var(--color-surface-primary)]/95 backdrop-blur-xl
                        border border-[var(--color-border-primary)]
                        shadow-2xl shadow-black/10 dark:shadow-black/30
                        flex items-center justify-center
                        animate-float-delayed hidden lg:flex
                        hover:border-[var(--color-border-accent)] hover:shadow-emerald-500/10
                        transition-all duration-400">
            <div className="text-center">
              <svg className="w-4 h-4 text-cyan-500 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="text-cyan-500 font-bold text-xl">45</div>
              <div className="text-[var(--color-text-muted)] text-xs font-medium">Clients</div>
            </div>
          </div>

          <DashboardPreview />
          
          {/* Enhanced Glow Effect Under Dashboard */}
          <div 
            className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[85%] h-28 
                      bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent 
                      blur-3xl rounded-[100%] opacity-80"
          />
          
          {/* Secondary glow */}
          <div 
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[55%] h-16 
                      bg-emerald-500/25 blur-2xl rounded-[100%]"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
