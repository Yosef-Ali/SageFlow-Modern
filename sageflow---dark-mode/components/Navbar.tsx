import React, { useState, useEffect } from 'react';
import { Menu, X, BarChart2, ChevronRight, Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '#pricing', label: 'Pricing' },
  ];

  return (
    <nav 
      className={`
        fixed top-0 w-full z-50 
        transition-all duration-500 ease-out
        ${isScrolled 
          ? 'py-3 glass-effect-strong shadow-lg dark:shadow-black/30' 
          : 'py-5 bg-transparent'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative">
              {/* Ambient glow */}
              <div 
                className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
              <div 
                className="relative bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 
                          p-2.5 rounded-xl 
                          border border-emerald-500/25 
                          group-hover:border-emerald-500/50 
                          group-hover:from-emerald-500/30 group-hover:to-emerald-600/20
                          transition-all duration-300
                          shadow-sm group-hover:shadow-emerald-500/20"
              >
                <BarChart2 className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
            <span 
              className="text-xl font-display font-bold tracking-tight 
                        text-[var(--color-text-primary)]
                        group-hover:text-emerald-600 dark:group-hover:text-emerald-400
                        transition-colors duration-300"
            >
              SageFlow
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-[var(--color-text-secondary)]
                           hover:text-emerald-500 dark:hover:text-emerald-400
                           transition-colors duration-300 relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 
                                 bg-emerald-500 transition-all duration-300 
                                 group-hover:w-full opacity-0 group-hover:opacity-100" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4 pl-6 border-l border-[var(--color-border-primary)]">
              <ThemeToggle />
              
              <button 
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r 
                         from-emerald-600 to-emerald-500
                         px-5 py-2.5 text-sm font-semibold text-white shadow-lg 
                         shadow-emerald-500/20 transition-all duration-300 
                         hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r 
                              from-transparent via-white/20 to-transparent 
                              group-hover:animate-shimmer" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[var(--color-text-secondary)]
                     hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`
          md:hidden fixed inset-0 z-40 bg-[var(--color-bg-primary)]/95 backdrop-blur-xl
          transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}
        `}
        style={{ top: '70px' }}
      >
        <div className="flex flex-col p-6 space-y-6 min-h-[calc(100vh-70px)] overflow-y-auto">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-[var(--color-text-primary)]
                       py-3 border-b border-[var(--color-border-primary)]"
            >
              {link.label}
            </a>
          ))}
          
          <div className="pt-4 flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)]">Appearance</span>
            <ThemeToggle />
          </div>

          <button 
            className="w-full mt-4 bg-emerald-500 text-white py-3.5 rounded-xl
                     font-semibold shadow-lg shadow-emerald-500/25 active:scale-[0.98]
                     transition-transform"
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
