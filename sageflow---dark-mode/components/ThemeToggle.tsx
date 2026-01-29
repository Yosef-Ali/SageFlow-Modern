import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

type ThemeOption = 'light' | 'system' | 'dark';

interface ThemeOptionConfig {
  value: ThemeOption;
  icon: typeof Sun;
  label: string;
  description: string;
}

const ThemeToggle: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<ThemeOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const options: ThemeOptionConfig[] = [
    { value: 'light', icon: Sun, label: 'Light', description: 'Bright & clean' },
    { value: 'system', icon: Monitor, label: 'System', description: 'Auto-detect' },
    { value: 'dark', icon: Moon, label: 'Dark', description: 'Easy on eyes' },
  ];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleThemeChange = (newTheme: ThemeOption) => {
    if (newTheme !== theme) {
      setIsAnimating(true);
      setTheme(newTheme);
      setTimeout(() => setIsAnimating(false), 500);
    }
    setIsExpanded(false);
  };

  const getCurrentIcon = () => {
    if (theme === 'system') return Monitor;
    return theme === 'dark' ? Moon : Sun;
  };

  const getIconColor = () => {
    if (theme === 'system') return 'text-[var(--color-text-tertiary)]';
    if (theme === 'dark') return 'text-indigo-400';
    return 'text-amber-500';
  };

  const CurrentIcon = getCurrentIcon();

  return (
    <div ref={containerRef} className="relative">
      {/* Premium Segmented Toggle (Desktop) */}
      <div className="hidden sm:flex theme-toggle-track">
        {/* Sliding indicator background */}
        <div 
          className="theme-toggle-indicator"
          style={{
            left: theme === 'light' ? '4px' : theme === 'system' ? '44px' : '84px',
          }}
        />
        
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              onMouseEnter={() => setHoveredOption(option.value)}
              onMouseLeave={() => setHoveredOption(null)}
              className={`theme-toggle-option ${isActive ? 'active' : ''}`}
              aria-label={`Switch to ${option.label} theme`}
              aria-pressed={isActive}
            >
              <Icon 
                className={`
                  transition-all duration-400
                  ${isActive && isAnimating ? 'animate-icon-spin' : ''}
                `}
              />
            </button>
          );
        })}
      </div>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          sm:hidden relative w-12 h-12 rounded-xl 
          bg-[var(--color-surface-secondary)] 
          border border-[var(--color-border-primary)] 
          flex items-center justify-center 
          overflow-hidden group
          transition-all duration-300 ease-out
          hover:border-[var(--color-border-accent)] 
          hover:bg-[var(--color-surface-hover)]
          hover:shadow-lg hover:shadow-emerald-500/10
          active:scale-95
          ${isExpanded ? 'border-[var(--color-border-accent)] shadow-lg shadow-emerald-500/10' : ''}
        `}
        aria-label="Toggle theme menu"
        aria-expanded={isExpanded}
      >
        <div className="relative w-5 h-5">
          <Sun 
            className={`
              w-5 h-5 absolute inset-0 
              transition-all duration-500 ease-out
              ${theme === 'light' 
                ? 'opacity-100 rotate-0 scale-100 text-amber-500' 
                : 'opacity-0 rotate-90 scale-0 text-amber-400'
              }
            `}
          />
          <Moon 
            className={`
              w-5 h-5 absolute inset-0 
              transition-all duration-500 ease-out
              ${theme === 'dark' 
                ? 'opacity-100 rotate-0 scale-100 text-indigo-400' 
                : 'opacity-0 -rotate-90 scale-0 text-indigo-300'
              }
            `}
          />
          <Monitor 
            className={`
              w-5 h-5 absolute inset-0 
              transition-all duration-500 ease-out
              ${theme === 'system' 
                ? 'opacity-100 rotate-0 scale-100 text-[var(--color-text-tertiary)]' 
                : 'opacity-0 scale-0 text-[var(--color-text-muted)]'
              }
            `}
          />
        </div>

        {/* Ambient glow on hover */}
        <div 
          className={`
            absolute inset-0 rounded-xl 
            opacity-0 group-hover:opacity-100 
            transition-opacity duration-300
            ${resolvedTheme === 'dark' 
              ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/5' 
              : 'bg-gradient-to-br from-amber-500/10 to-orange-500/5'
            }
          `}
        />
      </button>

      {/* Dropdown Menu (Mobile) */}
      <div 
        className={`
          sm:hidden absolute right-0 top-full mt-3 
          origin-top-right z-50
          transition-all duration-300 ease-out
          ${isExpanded 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }
        `}
      >
        <div 
          className="
            p-2 rounded-2xl 
            bg-[var(--color-surface-primary)] 
            border border-[var(--color-border-primary)]
            shadow-xl dark:shadow-black/40
            backdrop-blur-xl
            min-w-[180px]
          "
        >
          <div className="px-3 py-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Appearance
            </span>
          </div>
          
          {options.map((option, idx) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                className={`
                  w-full flex items-center gap-3.5 
                  px-3 py-3 rounded-xl
                  text-sm font-medium
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-primary)]' 
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                  }
                `}
              >
                <div className={`
                  w-9 h-9 rounded-lg flex items-center justify-center
                  ${isActive 
                    ? 'bg-[var(--color-accent-glow)] border border-[var(--color-border-accent)]' 
                    : 'bg-[var(--color-surface-tertiary)]'
                  }
                `}>
                  <Icon 
                    className={`
                      w-4.5 h-4.5 transition-colors duration-200
                      ${isActive 
                        ? 'text-[var(--color-accent-primary)]' 
                        : 'text-[var(--color-text-muted)]'
                      }
                    `} 
                  />
                </div>
                
                <div className="flex-1 text-left">
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs text-[var(--color-text-muted)] font-normal">
                    {option.description}
                  </div>
                </div>
                
                {/* Active checkmark */}
                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent-primary)] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemeToggle;
