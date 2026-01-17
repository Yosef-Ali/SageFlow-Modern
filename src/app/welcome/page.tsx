'use client'

import Link from 'next/link'
import { ArrowRight, TrendingUp, FileText, Users, Package, Sparkles, CheckCircle2, BarChart3, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Subtle Ethiopian pattern overlay */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCA2MCAzMCBMIDAgNjAgWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />

      {/* Header */}
      <header className="relative border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <span className="text-sm font-bold">SF</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none">SageFlow</span>
                <span className="text-[10px] text-muted-foreground leading-none tracking-wider">MODERN</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <Badge variant="outline" className="mb-8 border-primary/20 bg-primary/5 text-primary">
              <Sparkles className="mr-2 h-3 w-3" />
              Ethiopian Business • Modern Technology
            </Badge>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6">
              Modern Accounting for
              <span className="block text-primary mt-2">Ethiopian Businesses</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Built for Ethiopian businesses. ETB currency, 15% VAT, Chapa payments, and AI-powered insights all in one platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="text-base" asChild>
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>500+ Ethiopian Businesses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>14-Day Free Trial</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-primary opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative border-y bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground">
              ለኢትዮጵያ ንግድ የተሰራ • Built for Ethiopian Commerce
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative group rounded-lg border bg-card p-6 hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6" />
                </div>

                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {feature.description}
                </p>

                <Badge variant="secondary" className="text-xs">
                  {feature.badge}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ethiopian Features Section */}
      <section className="relative border-t bg-muted/30 py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <Badge variant="outline" className="mb-4">
                  የኢትዮጵያ ንግድ
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Built for Ethiopian Businesses
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Purpose-built with local payment gateways, tax compliance, and bilingual support to help your business thrive.
                </p>

                <div className="space-y-4">
                  {ethiopianFeatures.map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium mb-1">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Content - Code Block */}
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">config.json</span>
                  <Badge variant="secondary" className="text-xs">Ethiopian Ready</Badge>
                </div>

                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                    <span className="text-muted-foreground">currency</span>
                    <span className="font-semibold">"ETB"</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                    <span className="text-muted-foreground">vat_rate</span>
                    <span className="font-semibold">15</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                    <span className="text-muted-foreground">payment_gateway</span>
                    <span className="font-semibold">"chapa"</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                    <span className="text-muted-foreground">languages</span>
                    <span className="font-semibold">["አማርኛ", "en"]</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                    <span className="text-muted-foreground">ai_enabled</span>
                    <span className="font-semibold text-primary">true</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative border-t py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join hundreds of Ethiopian businesses already using SageFlow to modernize their accounting operations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base" asChild>
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                SF
              </div>
              <span>© 2026 SageFlow Modern. Made in Ethiopia.</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

const stats = [
  { value: 'ብር 2.4M+', label: 'Monthly Processing' },
  { value: '500+', label: 'Businesses' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<2s', label: 'Response Time' },
]

const features = [
  {
    icon: TrendingUp,
    title: 'AI-Powered Insights',
    description: 'Get intelligent recommendations and financial forecasts powered by Google Gemini.',
    badge: 'AI',
  },
  {
    icon: FileText,
    title: 'Smart Invoicing',
    description: 'Create professional invoices with AI auto-scan and automatic VAT calculations.',
    badge: 'Auto-scan',
  },
  {
    icon: Users,
    title: 'Multi-Tenant',
    description: 'Manage multiple businesses from one account with complete data isolation.',
    badge: 'Enterprise',
  },
  {
    icon: Package,
    title: 'Inventory Control',
    description: 'Track stock movements with real-time alerts and automated reorder points.',
    badge: 'Alerts',
  },
]

const ethiopianFeatures = [
  {
    icon: CheckCircle2,
    title: 'Chapa Payment Integration',
    description: 'Accept payments via Chapa with automatic reconciliation',
  },
  {
    icon: CheckCircle2,
    title: '15% Ethiopian VAT',
    description: 'Automatic VAT calculation and compliance reporting',
  },
  {
    icon: Zap,
    title: 'Amharic & English',
    description: 'Full bilingual support for invoices and reports',
  },
  {
    icon: BarChart3,
    title: 'ETB Currency Native',
    description: 'Ethiopian Birr as primary currency with proper formatting',
  },
]
