import React from 'react';
import { BarChart2, Twitter, Linkedin, Facebook, Mail } from 'lucide-react';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Security', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  company: [
    { label: 'About Us', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Partners', href: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Mail, href: '#', label: 'Email' },
];

const Footer: React.FC = () => {
  return (
    <footer className="relative bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-primary)]">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-500/[0.02]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center space-x-3 mb-6 group">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full 
                              group-hover:bg-emerald-500/30 transition-colors" />
                <div className="relative bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 
                              p-2.5 rounded-xl border border-emerald-500/20">
                  <BarChart2 className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
              <span className="text-xl font-display font-bold text-[var(--color-text-primary)]">
                SageFlow
              </span>
            </a>
            <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-6 max-w-xs">
              Empowering Ethiopian businesses with modern financial tools. 
              Built for growth, designed for compliance.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-[var(--color-surface-primary)] 
                           border border-[var(--color-border-primary)]
                           flex items-center justify-center
                           text-[var(--color-text-muted)] hover:text-emerald-400
                           hover:border-emerald-500/30 hover:bg-emerald-500/5
                           transition-all duration-300"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-display font-semibold text-[var(--color-text-primary)] mb-5">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} 
                     className="text-sm text-[var(--color-text-muted)] hover:text-emerald-400 
                              transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-semibold text-[var(--color-text-primary)] mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} 
                     className="text-sm text-[var(--color-text-muted)] hover:text-emerald-400 
                              transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-display font-semibold text-[var(--color-text-primary)] mb-5">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} 
                     className="text-sm text-[var(--color-text-muted)] hover:text-emerald-400 
                              transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--color-border-primary)] pt-8 
                      flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[var(--color-text-muted)] text-sm">
            © {new Date().getFullYear()} SageFlow. All rights reserved.
          </p>
          <div className="flex items-center space-x-6">
            <span className="text-xs text-[var(--color-text-muted)]">
              Made with ❤️ in Ethiopia
            </span>
            <div className="h-4 w-px bg-[var(--color-border-primary)]" />
            <span className="text-xs text-[var(--color-text-muted)]">
              v2.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
