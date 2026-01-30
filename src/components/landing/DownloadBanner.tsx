
import React from 'react';
import { Monitor, Apple, Download, Sparkles } from 'lucide-react';

const DownloadBanner: React.FC = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] 
                     bg-emerald-500/5 blur-[120px] rounded-full animate-pulse-slow" 
        />
        <div 
          className="absolute -top-24 -right-24 w-96 h-96 
                     bg-cyan-500/5 blur-[100px] rounded-full" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div 
          className="glass-effect-strong rounded-[3.5rem] p-12 md:p-24 text-center relative overflow-hidden 
                     border border-[var(--color-border-primary)] shadow-2xl
                     group"
        >
          {/* Decorative Corner Glows */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Premium Top Line */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          
          <div className="max-w-3xl mx-auto">
            {/* Small Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Native Experience
            </div>

            <h2 className="text-4xl md:text-6xl font-display font-extrabold text-[var(--color-text-primary)] mb-8 tracking-tight leading-[1.1]">
              Accounting Powerhouse <span className="gradient-text">On Your Desktop</span>
            </h2>
            
            <p className="text-xl text-[var(--color-text-tertiary)] mb-14 leading-relaxed max-w-2xl mx-auto">
              Get maximum performance, offline reliability, and deep system integration. 
              Built for speed, tailored for Ethiopian business needs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Windows Download */}
              <a 
                href="#" 
                className="group flex items-center gap-5 bg-[var(--color-surface-primary)]/80 hover:bg-[var(--color-surface-hover)] 
                           border border-[var(--color-border-primary)] hover:border-emerald-500/40 
                           p-6 rounded-3xl transition-all duration-500 
                           hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 
                           text-left backdrop-blur-md"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all duration-300">
                  <Monitor className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest mb-1">Windows OS</div>
                  <div className="text-[var(--color-text-primary)] font-bold text-xl leading-tight">
                    Download .EXE
                  </div>
                </div>
                <Download className="w-5 h-5 text-emerald-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
              </a>

              {/* Mac Download */}
              <a 
                href="#" 
                className="group flex items-center gap-5 bg-[var(--color-surface-primary)]/80 hover:bg-[var(--color-surface-hover)] 
                           border border-[var(--color-border-primary)] hover:border-emerald-500/40 
                           p-6 rounded-3xl transition-all duration-500 
                           hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/10 
                           text-left backdrop-blur-md"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all duration-300">
                  <Apple className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest mb-1">macOS</div>
                  <div className="text-[var(--color-text-primary)] font-bold text-xl leading-tight">
                    Download .DMG
                  </div>
                </div>
                <Download className="w-5 h-5 text-emerald-500 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
              </a>
            </div>

            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-[var(--color-text-muted)] text-sm font-medium">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Latest Stable: v2.0.4
              </div>
              <div className="w-px h-4 bg-[var(--color-border-primary)] hidden sm:block" />
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.041z" />
                </svg>
                Verified & Secure
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DownloadBanner;
